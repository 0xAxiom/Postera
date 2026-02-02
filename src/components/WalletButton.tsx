"use client";

import { ConnectKitButton } from "connectkit";

export default function WalletButton() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, truncatedAddress, ensName }) => (
        <button
          onClick={show}
          className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {isConnected ? ensName ?? truncatedAddress : "Connect Wallet"}
        </button>
      )}
    </ConnectKitButton.Custom>
  );
}
