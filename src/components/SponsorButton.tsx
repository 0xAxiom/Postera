"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { useWriteContracts, useCallsStatus } from "wagmi/experimental";
import { base } from "wagmi/chains";
import { useModal } from "connectkit";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const BASE_CHAIN_ID = 8453;

const USDC_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function usdcToUnits(amount: string): bigint {
  const parts = amount.split(".");
  const whole = BigInt(parts[0]) * BigInt(10 ** 6);
  if (parts[1]) {
    const decimals = parts[1].padEnd(6, "0").slice(0, 6);
    return whole + BigInt(decimals);
  }
  return whole;
}

interface SponsorButtonProps {
  postId: string;
  postTitle: string;
  totalEarned: number;
  sponsorEarned: number;
  uniqueSponsors: number;
}

const PRESET_AMOUNTS = ["0.25", "0.50", "1.00"];

type SponsorStep =
  | "select"
  | "not_connected"
  | "wrong_chain"
  | "fetching"
  | "sending"
  | "confirming"
  | "verifying"
  | "success"
  | "error";

export default function SponsorButton({
  postId,
  postTitle,
  totalEarned,
  sponsorEarned,
  uniqueSponsors,
}: SponsorButtonProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [step, setStep] = useState<SponsorStep>("select");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState<string | undefined>();

  // Updated tally after successful sponsorship (from API response)
  const [updatedTally, setUpdatedTally] = useState<{
    totalUsdc: string;
    uniqueSponsors: number;
  } | null>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { setOpen } = useModal();

  // ─── Batch (EIP-5792) path ────────────────────────────────────────────────
  const {
    data: batchId,
    writeContracts,
    error: batchError,
    reset: resetBatch,
  } = useWriteContracts();

  const {
    data: callsStatus,
  } = useCallsStatus({
    id: batchId as string,
    query: { enabled: !!batchId, refetchInterval: 2000 },
  });

  // ─── Fallback single-transfer path ────────────────────────────────────────
  const {
    data: singleTxHash,
    writeContract,
    error: singleError,
    reset: resetSingle,
  } = useWriteContract();

  const {
    isSuccess: singleConfirmed,
    error: singleConfirmError,
  } = useWaitForTransactionReceipt({ hash: singleTxHash });

  const amount = selected === "custom" ? custom : selected;

  // Track whether we're using batch or fallback
  const [useBatch, setUseBatch] = useState(true);

  // ─── Batch confirmation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!callsStatus || step !== "confirming") return;
    if (callsStatus.status === "CONFIRMED") {
      // Extract tx hash from receipts
      const receipts = callsStatus.receipts;
      const hash = receipts?.[0]?.transactionHash;
      if (hash) setTxHash(hash);
      submitProof(hash || batchId || "batch");
    }
  }, [callsStatus, step]);

  // ─── Batch errors → fall back to single transfer ─────────────────────────
  useEffect(() => {
    if (!batchError) return;
    const msg = batchError.message || "";
    // If wallet doesn't support EIP-5792, fall back to single transfer
    if (
      msg.includes("not supported") ||
      msg.includes("Method not found") ||
      msg.includes("wallet_sendCalls") ||
      msg.includes("does not support")
    ) {
      setUseBatch(false);
      // Retry with single transfer using the stored payment info
      if (storedAuthorRecipient && amount) {
        sendSinglePayment(amount, storedAuthorRecipient);
      }
      return;
    }
    // User rejection or other error
    const display = msg.includes("User rejected")
      ? "Transaction rejected. Try again when ready."
      : msg.length > 100
      ? msg.slice(0, 100) + "..."
      : msg;
    setErrorMsg(display);
    setStep("error");
  }, [batchError]);

  // ─── Single-transfer confirmation ─────────────────────────────────────────
  useEffect(() => {
    if (singleConfirmed && singleTxHash && address && step === "confirming") {
      setTxHash(singleTxHash);
      submitProof(singleTxHash);
    }
  }, [singleConfirmed, singleTxHash, address, step]);

  useEffect(() => {
    if (singleError) {
      const msg = singleError.message.includes("User rejected")
        ? "Transaction rejected. Try again when ready."
        : singleError.message.length > 100
        ? singleError.message.slice(0, 100) + "..."
        : singleError.message;
      setErrorMsg(msg);
      setStep("error");
    }
  }, [singleError]);

  useEffect(() => {
    if (singleConfirmError) {
      setErrorMsg("Transaction failed on-chain. Please try again.");
      setStep("error");
    }
  }, [singleConfirmError]);

  useEffect(() => {
    if (singleTxHash && step === "sending") {
      setStep("confirming");
    }
  }, [singleTxHash, step]);

  // Store payment info for potential fallback
  const [storedAuthorRecipient, setStoredAuthorRecipient] = useState<string | null>(null);

  async function handleSponsorClick() {
    if (!amount || parseFloat(amount) <= 0) return;
    setErrorMsg("");
    setTxHash(undefined);
    setUpdatedTally(null);

    if (!isConnected) {
      setStep("not_connected");
      return;
    }

    if (chainId !== BASE_CHAIN_ID) {
      setStep("wrong_chain");
      return;
    }

    setStep("fetching");
    try {
      const res = await fetch(`/api/posts/${postId}/sponsor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsdc: amount }),
      });

      if (res.status === 402) {
        const data = await res.json();
        const reqs = data.paymentRequirements;
        if (!reqs?.authorRecipient) {
          setErrorMsg("Could not determine payment recipient.");
          setStep("error");
          return;
        }

        setStoredAuthorRecipient(reqs.authorRecipient);

        if (useBatch && reqs.protocolRecipient) {
          // Try batch: two transfers in one wallet approval
          sendBatchPayment(
            reqs.authorRecipient,
            reqs.authorAmount,
            reqs.protocolRecipient,
            reqs.protocolAmount
          );
        } else {
          // Fallback: single transfer to author
          sendSinglePayment(amount, reqs.authorRecipient);
        }
      } else if (res.ok) {
        setStep("success");
      } else {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        setErrorMsg(data.error || "Sponsorship failed");
        setStep("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("error");
    }
  }

  function sendBatchPayment(
    authorAddr: string,
    authorAmt: string,
    protocolAddr: string,
    protocolAmt: string
  ) {
    setStep("sending");
    resetBatch();
    writeContracts({
      contracts: [
        {
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: "transfer",
          args: [authorAddr as `0x${string}`, usdcToUnits(authorAmt)],
        },
        {
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: "transfer",
          args: [protocolAddr as `0x${string}`, usdcToUnits(protocolAmt)],
        },
      ],
    });
    // Move to confirming once we have batchId (handled in effect)
    // But we need to watch for the batchId to appear
  }

  // When batchId appears, move to confirming
  useEffect(() => {
    if (batchId && step === "sending") {
      setStep("confirming");
    }
  }, [batchId, step]);

  function sendSinglePayment(amt: string, to: string) {
    setStep("sending");
    resetSingle();
    writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "transfer",
      args: [to as `0x${string}`, usdcToUnits(amt)],
      chain: base,
    });
  }

  async function submitProof(hash: string) {
    setStep("verifying");
    try {
      const res = await fetch(`/api/posts/${postId}/sponsor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Payment-Response": hash,
          "X-Payer-Address": address || "",
        },
        body: JSON.stringify({ amountUsdc: amount }),
      });

      if (res.ok || res.status === 201) {
        const data = await res.json().catch(() => ({}));
        if (data.sponsorship7d) {
          setUpdatedTally({
            totalUsdc: data.sponsorship7d.totalUsdc,
            uniqueSponsors: data.sponsorship7d.uniqueSponsors,
          });
        }
        setStep("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Payment verification failed.");
        setStep("error");
      }
    } catch {
      setErrorMsg("Network error during verification.");
      setStep("error");
    }
  }

  function handleRetry() {
    setStep("select");
    setErrorMsg("");
    setTxHash(undefined);
    resetBatch();
    resetSingle();
  }

  const fmtUsdc = (n: number) => (n > 0 ? `$${n.toFixed(2)}` : "$0.00");

  // Show updated tally after success, otherwise show server-rendered values
  const displayTotalEarned = updatedTally
    ? totalEarned + parseFloat(amount || "0")
    : totalEarned;
  const displaySponsorEarned = updatedTally
    ? sponsorEarned + parseFloat(amount || "0")
    : sponsorEarned;
  const displayUniqueSponsors = updatedTally
    ? updatedTally.uniqueSponsors
    : uniqueSponsors;

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <div className="mt-8 p-6 border border-emerald-200 bg-emerald-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="text-emerald-700 font-medium">
            Thanks for sponsoring! ({amount} USDC)
          </p>
          <div className="text-right">
            <p className="text-sm font-medium text-emerald-800">
              {fmtUsdc(displayTotalEarned)} earned
            </p>
            {displaySponsorEarned > 0 && (
              <p className="text-xs text-emerald-600">
                {fmtUsdc(displaySponsorEarned)} from {displayUniqueSponsors} sponsor
                {displayUniqueSponsors !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-600 hover:underline font-mono"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        )}
      </div>
    );
  }

  const isSelectState =
    step === "select" || step === "not_connected" || step === "wrong_chain" || step === "error";

  return (
    <div className="mt-8 p-6 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Sponsor this post</h3>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{fmtUsdc(totalEarned)} earned</p>
          {sponsorEarned > 0 && (
            <p className="text-xs text-gray-500">
              {fmtUsdc(sponsorEarned)} from {uniqueSponsors} sponsor
              {uniqueSponsors !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Support this free content. 90% goes to the author, 10% to the protocol.
      </p>

      {/* Amount selection */}
      {isSelectState && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  setSelected(amt);
                  setCustom("");
                  if (step !== "select") setStep("select");
                }}
                className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
                  selected === amt
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                }`}
              >
                ${amt}
              </button>
            ))}
            <button
              onClick={() => {
                setSelected("custom");
                if (step !== "select") setStep("select");
              }}
              className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
                selected === "custom"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
              }`}
            >
              Custom
            </button>
          </div>

          {selected === "custom" && (
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount in USDC"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </>
      )}

      {step === "not_connected" && (
        <div className="mb-4">
          <button
            onClick={() => setOpen(true)}
            className="w-full py-2 rounded bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            Connect Wallet
          </button>
          <p className="mt-2 text-xs text-gray-500 text-center">
            You need a wallet with USDC on Base to sponsor.
          </p>
        </div>
      )}

      {step === "wrong_chain" && (
        <div className="mb-4">
          <button
            onClick={() => switchChain({ chainId: BASE_CHAIN_ID })}
            className="w-full py-2 rounded bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            Switch to Base
          </button>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Please switch to the Base network to continue.
          </p>
        </div>
      )}

      {step === "select" && amount && parseFloat(amount) > 0 && (
        <button
          onClick={handleSponsorClick}
          className="w-full py-2 rounded bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors"
        >
          Sponsor {amount} USDC
        </button>
      )}

      {step === "fetching" && (
        <div className="text-center py-3">
          <Spinner />
          <p className="text-sm text-gray-500 mt-2">Preparing payment...</p>
        </div>
      )}

      {step === "sending" && (
        <div className="text-center py-3">
          <Spinner />
          <p className="text-sm text-gray-500 mt-2">
            Confirm the transfer of <strong>${amount} USDC</strong> in your wallet.
          </p>
        </div>
      )}

      {step === "confirming" && (
        <div className="text-center py-3">
          <Spinner />
          <p className="text-sm text-gray-500 mt-2">Confirming on Base...</p>
          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:underline font-mono"
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          )}
        </div>
      )}

      {step === "verifying" && (
        <div className="text-center py-3">
          <Spinner />
          <p className="text-sm text-gray-500 mt-2">Recording sponsorship...</p>
        </div>
      )}

      {step === "error" && (
        <div className="mt-3">
          <p className="text-xs text-red-600 mb-2">{errorMsg}</p>
          <button onClick={handleRetry} className="text-xs text-indigo-600 hover:underline">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="inline-block">
      <svg className="w-5 h-5 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}
