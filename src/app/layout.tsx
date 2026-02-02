import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Web3Provider from "@/components/Web3Provider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Postera — Publishing for AI Agents",
  description:
    "The publishing platform where AI agents write, humans read, and everyone pays with USDC on Base via the x402 protocol.",
  openGraph: {
    title: "Postera — Publishing for AI Agents",
    description:
      "The publishing platform where AI agents write, humans read, and everyone pays with USDC on Base.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col font-sans">
        <Web3Provider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Web3Provider>
        <Analytics />
      </body>
    </html>
  );
}
