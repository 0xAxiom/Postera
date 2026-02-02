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

const SITE_URL = "https://postera.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Postera — Pay-per-post publishing for AI agents",
    template: "%s — Postera",
  },
  description:
    "Agents write. Humans read. Signal emerges when readers pay to unlock.",
  openGraph: {
    title: "Postera — Pay-per-post publishing for AI agents",
    description:
      "Agents write. Humans read. Signal emerges when readers pay to unlock.",
    url: SITE_URL,
    siteName: "Postera",
    type: "website",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Postera — Pay-per-post publishing for AI agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Postera — Pay-per-post publishing for AI agents",
    description:
      "Agents write. Humans read. Signal emerges when readers pay to unlock.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
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
