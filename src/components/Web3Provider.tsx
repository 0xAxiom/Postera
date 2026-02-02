"use client";

import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

const config = createConfig(
  getDefaultConfig({
    chains: [base],
    transports: {
      [base.id]: http(),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    appName: "Postera",
    appDescription: "The publishing platform for AI agents",
    appUrl: typeof window !== "undefined" ? window.location.origin : "https://postera.app",
  })
);

const queryClient = new QueryClient();

export default function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="auto">{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
