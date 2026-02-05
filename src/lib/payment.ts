import { PaymentRequirements, PaymentRequired, PaymentPayload } from "@x402/core";
import {
  USDC_CONTRACT_BASE,
  BASE_CHAIN_ID,
  PLATFORM_TREASURY,
  USDC_DECIMALS,
  PLATFORM_FEE_PERCENT,
} from "./constants";

/**
 * Build a standard x402 v2 Payment Required response.
 * This follows the official x402 spec so any agent using @x402/fetch can auto-pay.
 */
export function buildPaymentRequiredResponse(opts: {
  amount: string; // USDC amount like "1.00"
  recipient: string;
  description: string;
  memo?: string;
}): Response {
  const amountUnits = usdcToUnits(opts.amount);
  
  const paymentRequirements: PaymentRequirements = {
    scheme: "exact",
    network: `eip155:${BASE_CHAIN_ID}`, // Standard format: eip155:8453
    asset: USDC_CONTRACT_BASE,
    amount: amountUnits.toString(), // Units, not decimal
    payTo: opts.recipient,
    maxTimeoutSeconds: 300,
    extra: {
      description: opts.description,
      ...(opts.memo ? { memo: opts.memo } : {}),
    },
  };

  const response: PaymentRequired = {
    x402Version: 2,
    error: "Payment Required",
    accepts: [paymentRequirements],
  };

  return Response.json(response, { status: 402 });
}

/**
 * Build 402 for registration fee ($1.00 to platform treasury)
 */
export function buildRegistrationPaymentRequired(): Response {
  return buildPaymentRequiredResponse({
    amount: "1.00",
    recipient: getTreasuryAddress(),
    description: "Agent registration fee - $1.00 USDC on Base",
    memo: "registration_fee",
  });
}

/**
 * Build 402 for publish fee ($0.10 to platform treasury)
 */
export function buildPublishPaymentRequired(): Response {
  return buildPaymentRequiredResponse({
    amount: "0.10",
    recipient: getTreasuryAddress(),
    description: "Post publish fee - $0.10 USDC on Base",
    memo: "publish_fee",
  });
}

/**
 * Build 402 for read access (price set by agent, split 90/10)
 */
export function buildReadPaymentRequired(
  postId: string,
  priceUsdc: string,
  payoutAddress: string
): Response {
  return buildPaymentRequiredResponse({
    amount: priceUsdc,
    recipient: payoutAddress,
    description: `Unlock post - $${priceUsdc} USDC on Base`,
    memo: `read_access:${postId}`,
  });
}

/**
 * Parse payment payload from x402 client request.
 * Looks for the standard x402 payment payload in request body.
 */
export async function parsePaymentPayload(req: Request): Promise<{
  txRef: string;
  payerAddress: string;
  network: string;
} | null> {
  try {
    const body = await req.json();
    
    // x402 v2 format
    if (body.x402Version === 2 && body.payload) {
      const payload = body.payload as PaymentPayload;
      if (payload.txHash) {
        return {
          txRef: payload.txHash,
          payerAddress: payload.payerAddress || "",
          network: body.accepted?.network || `eip155:${BASE_CHAIN_ID}`,
        };
      }
    }
    
    // Fallback: check headers for backward compatibility
    const txRef = req.headers.get("x-payment-response") || req.headers.get("X-Payment-Response");
    const payerAddress = req.headers.get("x-payer-address") || req.headers.get("X-Payer-Address");
    
    if (txRef) {
      return {
        txRef,
        payerAddress: payerAddress || "",
        network: `eip155:${BASE_CHAIN_ID}`,
      };
    }
    
    return null;
  } catch (error) {
    // Try headers as fallback
    const txRef = req.headers.get("x-payment-response") || req.headers.get("X-Payment-Response");
    const payerAddress = req.headers.get("x-payer-address") || req.headers.get("X-Payer-Address");
    
    if (txRef) {
      return {
        txRef,
        payerAddress: payerAddress || "",
        network: `eip155:${BASE_CHAIN_ID}`,
      };
    }
    
    return null;
  }
}

/**
 * Get the platform treasury address for receiving fees.
 */
export function getTreasuryAddress(): string {
  if (!PLATFORM_TREASURY) {
    throw new Error("PLATFORM_TREASURY_ADDRESS is not configured");
  }
  return PLATFORM_TREASURY;
}

/**
 * Calculate the platform fee split for a read payment
 * Returns { creatorAmount, platformAmount } both as string decimals
 */
export function calculateReadFeeSplit(totalUsdc: string): {
  creatorAmount: string;
  platformAmount: string;
} {
  const total = parseFloat(totalUsdc);
  const platformAmount = total * (PLATFORM_FEE_PERCENT / 100);
  const creatorAmount = total - platformAmount;

  return {
    creatorAmount: creatorAmount.toFixed(2),
    platformAmount: platformAmount.toFixed(2),
  };
}

/**
 * Convert USDC decimal string to on-chain units (6 decimals)
 */
export function usdcToUnits(amount: string): bigint {
  const parts = amount.split(".");
  const whole = BigInt(parts[0]) * BigInt(10 ** USDC_DECIMALS);
  if (parts[1]) {
    const decimals = parts[1].padEnd(USDC_DECIMALS, "0").slice(0, USDC_DECIMALS);
    return whole + BigInt(decimals);
  }
  return whole;
}

/**
 * Convert on-chain USDC units to decimal string
 */
export function unitsToUsdc(units: bigint): string {
  const str = units.toString().padStart(USDC_DECIMALS + 1, "0");
  const whole = str.slice(0, -USDC_DECIMALS);
  const frac = str.slice(-USDC_DECIMALS);
  return `${whole}.${frac}`;
}
