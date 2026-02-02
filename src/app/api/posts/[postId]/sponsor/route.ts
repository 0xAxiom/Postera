import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import {
  PLATFORM_TREASURY,
  BASE_CHAIN_ID,
  USDC_CONTRACT_BASE,
} from "@/lib/constants";
import { parsePaymentResponseHeader } from "@/lib/payment";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rateLimit";

const sponsorSchema = z.object({
  amountUsdc: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Invalid USDC amount")
    .refine((v) => parseFloat(v) > 0, "Amount must be greater than 0"),
});

const SPONSOR_SPLIT_BPS_AUTHOR = 9000; // 90%
const SPONSOR_SPLIT_BPS_PROTOCOL = 1000; // 10%

/**
 * POST /api/posts/[postId]/sponsor
 *
 * Sponsor a FREE post via x402.
 * - Only allowed on non-paywalled posts
 * - Returns 402 if no payment proof
 * - Records receipt with 90/10 split on payment
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    // Rate limit by IP + payer address
    const ip = getRateLimitKey(req, "sponsor");
    const payerAddr = req.headers.get("x-payer-address") ?? "";
    const rlKey = payerAddr ? `sponsor:${payerAddr}` : ip;
    const rl = checkRateLimit(rlKey, RATE_LIMITS.payment);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const post = await prisma.post.findUnique({
      where: { id: params.postId },
      include: {
        publication: { select: { payoutAddress: true } },
      },
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== "published") {
      return Response.json({ error: "Post is not published" }, { status: 400 });
    }

    if (post.isPaywalled) {
      return Response.json(
        { error: "Sponsorship is only available for free posts" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = sponsorSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { amountUsdc } = parsed.data;
    const payoutAddress = post.publication?.payoutAddress ?? PLATFORM_TREASURY;

    // Check for x402 payment proof
    const paymentInfo = parsePaymentResponseHeader(req);

    if (!paymentInfo) {
      // Return 402 Payment Required
      const paymentRequirements = [
        {
          scheme: "exact" as const,
          network: "base",
          chainId: BASE_CHAIN_ID,
          asset: USDC_CONTRACT_BASE,
          amount: amountUsdc,
          recipient: payoutAddress,
          description: `Sponsor post: "${post.title}"`,
          mimeType: "application/json",
          resourceUrl: `/api/posts/${post.id}/sponsor`,
          maxTimeoutSeconds: 300,
        },
      ];

      return Response.json(
        { error: "Payment Required", paymentRequirements },
        {
          status: 402,
          headers: {
            "X-Payment-Requirements": JSON.stringify(paymentRequirements),
          },
        }
      );
    }

    // Payment proof provided — record receipt
    const total = parseFloat(amountUsdc);
    const authorAmount = (total * SPONSOR_SPLIT_BPS_AUTHOR) / 10000;
    const protocolAmount = (total * SPONSOR_SPLIT_BPS_PROTOCOL) / 10000;

    const receipt = await prisma.paymentReceipt.create({
      data: {
        kind: "sponsorship",
        agentId: post.agentId,
        publicationId: post.publicationId,
        postId: post.id,
        payerAddress: payerAddr || null,
        amountUsdc,
        chain: "base",
        txRef: paymentInfo.txRef,
        recipientAuthor: payoutAddress,
        recipientProtocol: PLATFORM_TREASURY,
        splitBpsAuthor: SPONSOR_SPLIT_BPS_AUTHOR,
        splitBpsProtocol: SPONSOR_SPLIT_BPS_PROTOCOL,
      },
    });

    // Fetch updated totals (7d)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [agg] = await prisma.$queryRaw<
      { total_usdc: number; unique_sponsors: number }[]
    >`
      SELECT
        COALESCE(SUM(CAST("amountUsdc" AS DOUBLE PRECISION)), 0) AS total_usdc,
        COUNT(DISTINCT "payerAddress")::int AS unique_sponsors
      FROM "PaymentReceipt"
      WHERE kind = 'sponsorship'
        AND "postId" = ${post.id}
        AND "createdAt" >= ${sevenDaysAgo}
    `;

    return Response.json(
      {
        receipt: {
          id: receipt.id,
          kind: receipt.kind,
          amountUsdc: receipt.amountUsdc,
          txRef: receipt.txRef,
          createdAt: receipt.createdAt,
          split: {
            authorAmount: authorAmount.toFixed(2),
            protocolAmount: protocolAmount.toFixed(2),
            bpsAuthor: SPONSOR_SPLIT_BPS_AUTHOR,
            bpsProtocol: SPONSOR_SPLIT_BPS_PROTOCOL,
          },
        },
        sponsorship7d: {
          totalUsdc: Number(agg.total_usdc).toFixed(2),
          uniqueSponsors: Number(agg.unique_sponsors),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/posts/[postId]/sponsor]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
