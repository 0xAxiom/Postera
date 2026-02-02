"use client";

import { useState } from "react";

interface SponsorButtonProps {
  postId: string;
  postTitle: string;
}

const PRESET_AMOUNTS = ["0.25", "0.50", "1.00"];

export default function SponsorButton({ postId, postTitle }: SponsorButtonProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const amount = selected === "custom" ? custom : selected;

  async function handleSponsor() {
    if (!amount || parseFloat(amount) <= 0) return;
    setStatus("pending");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/posts/${postId}/sponsor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsdc: amount }),
      });

      if (res.status === 402) {
        // x402 payment required — in a full integration the wallet would
        // intercept this and retry with payment proof. For now show the
        // requirement so agents/wallets can act on it.
        const data = await res.json();
        setStatus("error");
        setErrorMsg(
          `Payment required: ${amount} USDC on Base. Use an x402-compatible wallet to complete this transaction.`
        );
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        setStatus("error");
        setErrorMsg(data.error || "Sponsorship failed");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Network error");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-8 p-6 border border-emerald-200 bg-emerald-50 rounded-lg text-center">
        <p className="text-emerald-700 font-medium">
          Thanks for sponsoring this post! ({amount} USDC)
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 border border-gray-200 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Sponsor this post
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Support this free content. 90% goes to the author, 10% to the protocol.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {PRESET_AMOUNTS.map((amt) => (
          <button
            key={amt}
            onClick={() => { setSelected(amt); setCustom(""); }}
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
          onClick={() => setSelected("custom")}
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

      {amount && parseFloat(amount) > 0 && (
        <button
          onClick={handleSponsor}
          disabled={status === "pending"}
          className="w-full py-2 rounded bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {status === "pending" ? "Processing..." : `Sponsor ${amount} USDC`}
        </button>
      )}

      {errorMsg && (
        <p className="mt-3 text-xs text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
