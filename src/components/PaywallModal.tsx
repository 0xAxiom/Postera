"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from "wagmi";
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

type PaywallStep =
  | "initial"
  | "not_connected"
  | "wrong_chain"
  | "sending"
  | "confirming"
  | "verifying"
  | "unlocked"
  | "error";

interface PaymentInfo {
  amount: string;
  recipient: string;
}

interface PaywallModalProps {
  postId: string;
  priceUsdc: string;
  onUnlocked: (bodyHtml: string) => void;
}

export default function PaywallModal({
  postId,
  priceUsdc,
  onUnlocked,
}: PaywallModalProps) {
  const [step, setStep] = useState<PaywallStep>("initial");
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { setOpen } = useModal();

  const {
    data: txHash,
    writeContract,
    isPending: isSending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // When tx confirms, submit proof to backend
  useEffect(() => {
    if (isConfirmed && txHash && address && step === "confirming") {
      submitProof(txHash, address);
    }
  }, [isConfirmed, txHash, address, step]);

  // Track write errors
  useEffect(() => {
    if (writeError) {
      const msg = writeError.message.includes("User rejected")
        ? "Transaction rejected. Try again when ready."
        : writeError.message.length > 100
        ? writeError.message.slice(0, 100) + "..."
        : writeError.message;
      setErrorMessage(msg);
      setStep("error");
    }
  }, [writeError]);

  // Track confirmation errors
  useEffect(() => {
    if (confirmError) {
      setErrorMessage("Transaction failed on-chain. Please try again.");
      setStep("error");
    }
  }, [confirmError]);

  // Move to confirming state when tx is sent
  useEffect(() => {
    if (txHash && step === "sending") {
      setStep("confirming");
    }
  }, [txHash, step]);

  async function handleUnlockClick() {
    setErrorMessage("");

    // Step 1: Check wallet connected
    if (!isConnected) {
      setStep("not_connected");
      return;
    }

    // Step 2: Check chain
    if (chainId !== BASE_CHAIN_ID) {
      setStep("wrong_chain");
      return;
    }

    // Step 3: Fetch payment details
    setFetchLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}?view=full`);

      if (res.status === 402) {
        const data = await res.json();
        if (data.payment) {
          setPaymentInfo({
            amount: data.payment.amount,
            recipient: data.payment.recipient,
          });
          // Step 4: Send transaction
          sendPayment(data.payment.amount, data.payment.recipient);
        } else {
          setErrorMessage("Unexpected payment response.");
          setStep("error");
        }
      } else if (res.ok) {
        // Already unlocked (existing AccessGrant)
        const data = await res.json();
        onUnlocked(data.bodyHtml || data.body || "");
        setStep("unlocked");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || "Failed to fetch post.");
        setStep("error");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStep("error");
    } finally {
      setFetchLoading(false);
    }
  }

  function sendPayment(amount: string, recipient: string) {
    setStep("sending");
    resetWrite();
    writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "transfer",
      args: [recipient as `0x${string}`, usdcToUnits(amount)],
      chain: base,
    });
  }

  async function submitProof(hash: string, payer: string) {
    setStep("verifying");
    try {
      const res = await fetch(`/api/posts/${postId}?view=full`, {
        headers: {
          "X-Payment-Response": hash,
          "X-Payer-Address": payer,
        },
      });

      if (res.ok) {
        const data = await res.json();
        onUnlocked(data.bodyHtml || data.body || "");
        setStep("unlocked");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || "Payment verification failed.");
        setStep("error");
      }
    } catch {
      setErrorMessage("Network error during verification.");
      setStep("error");
    }
  }

  function handleRetry() {
    setStep("initial");
    setErrorMessage("");
    resetWrite();
  }

  if (step === "unlocked") return null;

  return (
    <div className="relative mt-8">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center max-w-lg mx-auto">
        {step === "initial" && (
          <>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Continue reading
            </h3>
            <p className="text-gray-600 mb-1">This post is paywalled.</p>
            <div className="text-3xl font-bold text-gray-900 my-4">
              ${priceUsdc}{" "}
              <span className="text-lg font-normal text-gray-500">USDC</span>
            </div>
            <button
              onClick={handleUnlockClick}
              disabled={fetchLoading}
              className="btn-unlock w-full mb-3"
            >
              {fetchLoading ? "Loading..." : "Unlock this post"}
            </button>
            <p className="text-xs text-gray-400">Pay with USDC on Base</p>
            <div className="mt-3 inline-flex items-center gap-1.5 badge bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Base Network
            </div>
          </>
        )}

        {step === "not_connected" && (
          <>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Connect your wallet
            </h3>
            <p className="text-gray-600 mb-4">
              You need a wallet with USDC on Base to unlock this post.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="btn-unlock w-full mb-3"
            >
              Connect Wallet
            </button>
            <button
              onClick={() => setStep("initial")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
          </>
        )}

        {step === "wrong_chain" && (
          <>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Switch to Base
            </h3>
            <p className="text-gray-600 mb-4">
              Please switch your wallet to the Base network to continue.
            </p>
            <button
              onClick={() => switchChain({ chainId: BASE_CHAIN_ID })}
              className="btn-unlock w-full mb-3"
            >
              Switch to Base
            </button>
            <button
              onClick={() => setStep("initial")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
          </>
        )}

        {step === "sending" && (
          <>
            <Spinner />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Confirm in your wallet
            </h3>
            <p className="text-sm text-gray-500">
              Approve the transfer of{" "}
              <strong>${paymentInfo?.amount} USDC</strong> in your wallet.
            </p>
          </>
        )}

        {step === "confirming" && (
          <>
            <Spinner />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Confirming on Base...
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              Waiting for your transaction to be confirmed.
            </p>
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
          </>
        )}

        {step === "verifying" && (
          <>
            <Spinner />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Unlocking content...
            </h3>
            <p className="text-sm text-gray-500">
              Payment confirmed. Fetching your content.
            </p>
          </>
        )}

        {step === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h3>
            <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
            <button onClick={handleRetry} className="btn-secondary w-full">
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="mb-4">
      <div className="w-12 h-12 rounded-full bg-indigo-100 mx-auto flex items-center justify-center">
        <svg
          className="w-6 h-6 text-indigo-600 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
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
    </div>
  );
}
