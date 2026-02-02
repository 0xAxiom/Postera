import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════════
// PosteraSplitter Integration Test Suite
// ═══════════════════════════════════════════════════════════════════════════════
//
// Coverage Plan: Tests organized by priority (P0 = must-pass before merge)
//
// ─── P0: Sponsorship via Splitter ──────────────────────────────────────────────
// ─── P0: Paywall Unlock via Splitter ───────────────────────────────────────────
// ─── P0: Content Security ──────────────────────────────────────────────────────
// ─── P1: Allowance Logic ───────────────────────────────────────────────────────
// ─── P1: EIP-5792 Batching ─────────────────────────────────────────────────────
// ─── P1: Edge Cases ────────────────────────────────────────────────────────────
// ─── P2: Regression ────────────────────────────────────────────────────────────
//
// ═══════════════════════════════════════════════════════════════════════════════

// ─── P0: Sponsor 402 Response Contains splitterAddress and authorRecipient ────

describe("P0: Sponsorship 402 response shape", () => {
  it("sponsor route returns paymentRequirements with authorRecipient and protocolRecipient", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );

    // The 402 response body must include authorRecipient (author wallet)
    expect(source).toContain("authorRecipient");
    // Must include protocolRecipient (platform treasury)
    expect(source).toContain("protocolRecipient");
    // Must include split amounts
    expect(source).toContain("authorAmount");
    expect(source).toContain("protocolAmount");
    // Must include totalAmount
    expect(source).toContain("totalAmount");
    // Scheme must be "split" (not "exact" for a single-recipient transfer)
    expect(source).toContain('"split"');
  });

  it("sponsor route populates authorRecipient from publication payoutAddress", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    // Must resolve author address from publication.payoutAddress
    expect(source).toContain("post.publication?.payoutAddress");
    // Must fall back to PLATFORM_TREASURY if no payout address
    expect(source).toContain("PLATFORM_TREASURY");
  });

  it("sponsor route populates protocolRecipient from PLATFORM_TREASURY", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain("protocolRecipient: PLATFORM_TREASURY");
  });
});

// ─── P0: Sponsor Proof Submission Accepted ───────────────────────────────────

describe("P0: Sponsor proof submission flow", () => {
  it("sponsor route accepts X-Payment-Response header as proof", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    // Must call parsePaymentResponseHeader to check for proof
    expect(source).toContain("parsePaymentResponseHeader");
  });

  it("sponsor route creates PaymentReceipt with kind=sponsorship on proof", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain('kind: "sponsorship"');
    expect(source).toContain("paymentReceipt.create");
  });

  it("sponsor receipt records split BPS values", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain("splitBpsAuthor: SPONSOR_SPLIT_BPS_AUTHOR");
    expect(source).toContain("splitBpsProtocol: SPONSOR_SPLIT_BPS_PROTOCOL");
  });

  it("sponsor receipt records both recipient addresses", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain("recipientAuthor: authorPayoutAddress");
    expect(source).toContain("recipientProtocol: PLATFORM_TREASURY");
  });

  it("sponsor route returns 201 with receipt and split breakdown on success", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain("status: 201");
    expect(source).toContain("authorAmount");
    expect(source).toContain("protocolAmount");
    expect(source).toContain("bpsAuthor");
    expect(source).toContain("bpsProtocol");
  });
});

// ─── P0: Sponsor Split Amounts Are Correct ───────────────────────────────────

describe("P0: computeSplit correctness", () => {
  // We re-implement computeSplit here to test the logic independently
  function parseUsdcMicro(amount: string): bigint {
    const parts = amount.split(".");
    const whole = BigInt(parts[0]) * BigInt(10 ** 6);
    if (parts[1]) {
      const decimals = parts[1].padEnd(6, "0").slice(0, 6);
      return whole + BigInt(decimals);
    }
    return whole;
  }

  function formatMicro(micro: bigint): string {
    const whole = micro / BigInt(10 ** 6);
    const frac = micro % BigInt(10 ** 6);
    const fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
    if (!fracStr) return whole.toString();
    return `${whole}.${fracStr}`;
  }

  function computeSplit(totalUsdc: string) {
    const totalMicro = parseUsdcMicro(totalUsdc);
    const authorMicro =
      (totalMicro * BigInt(9000)) / BigInt(10000);
    const protocolMicro = totalMicro - authorMicro;
    return {
      authorUsdc: formatMicro(authorMicro),
      protocolUsdc: formatMicro(protocolMicro),
    };
  }

  it("splits $1.00 into $0.90 author / $0.10 protocol", () => {
    const split = computeSplit("1.00");
    expect(split.authorUsdc).toBe("0.9");
    expect(split.protocolUsdc).toBe("0.1");
  });

  it("splits $0.25 into $0.225 author / $0.025 protocol", () => {
    const split = computeSplit("0.25");
    expect(split.authorUsdc).toBe("0.225");
    expect(split.protocolUsdc).toBe("0.025");
  });

  it("splits $0.50 into $0.45 author / $0.05 protocol", () => {
    const split = computeSplit("0.50");
    expect(split.authorUsdc).toBe("0.45");
    expect(split.protocolUsdc).toBe("0.05");
  });

  it("author + protocol always sum to total (no dust loss)", () => {
    const amounts = ["1.00", "0.25", "0.50", "0.10", "0.01", "100.00", "0.000001"];
    for (const amt of amounts) {
      const totalMicro = parseUsdcMicro(amt);
      const split = computeSplit(amt);
      const authorMicro = parseUsdcMicro(split.authorUsdc);
      const protocolMicro = parseUsdcMicro(split.protocolUsdc);
      expect(authorMicro + protocolMicro).toBe(totalMicro);
    }
  });

  it("protocol always gets the remainder (no rounding loss to author)", () => {
    // For $0.01: 10000 micro * 9000 / 10000 = 9000 micro author, 1000 micro protocol
    const split = computeSplit("0.01");
    const authorMicro = parseUsdcMicro(split.authorUsdc);
    const protocolMicro = parseUsdcMicro(split.protocolUsdc);
    expect(authorMicro).toBe(9000n);
    expect(protocolMicro).toBe(1000n);
  });

  it("handles minimum USDC amount (1 micro-unit)", () => {
    const split = computeSplit("0.000001");
    // 1 micro * 9000 / 10000 = 0 author, 1 protocol (remainder)
    const authorMicro = parseUsdcMicro(split.authorUsdc);
    const protocolMicro = parseUsdcMicro(split.protocolUsdc);
    expect(authorMicro + protocolMicro).toBe(1n);
  });
});

// ─── P0: Rate Limiting Still Works on Sponsor Route ──────────────────────────

describe("P0: Sponsor rate limiting", () => {
  it("sponsor route applies rate limiting before processing", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain("checkRateLimit");
    expect(source).toContain("RATE_LIMITS.payment");
    expect(source).toContain("rateLimitResponse");
  });

  it("rate limit key includes payer address when available", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain("x-payer-address");
    expect(source).toContain("sponsor:");
  });
});

// ─── P0: Paywall Unlock 402 Response ─────────────────────────────────────────

describe("P0: Paywall 402 response for paywalled posts", () => {
  it("GET /api/posts/[postId]?view=full returns 402 for paywalled post", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/route.ts",
      "utf-8"
    );
    // Must call buildPaymentRequiredResponse for paywalled posts
    expect(source).toContain("buildPaymentRequiredResponse");
    expect(source).toContain("Payment Required");
  });

  it("402 response includes recipient (author payout address)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/route.ts",
      "utf-8"
    );
    expect(source).toContain("payoutAddress");
    expect(source).toContain("recipient: payoutAddress");
  });

  it("free posts do NOT trigger 402", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/route.ts",
      "utf-8"
    );
    // For non-paywalled posts, both preview and full view return 200
    expect(source).toContain("if (!post.isPaywalled)");
    // Count the early returns for non-paywalled posts
    const freeReturns = source.match(
      /if\s*\(\s*!post\.isPaywalled\s*\)\s*\{[\s\S]*?return\s+Response\.json\(/g
    );
    expect(freeReturns).not.toBeNull();
    expect(freeReturns!.length).toBeGreaterThanOrEqual(2); // once for preview, once for full
  });
});

// ─── P0: Paywall Proof Grants Access ─────────────────────────────────────────

describe("P0: Paywall proof creates AccessGrant", () => {
  it("paywall route creates AccessGrant after payment proof", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/route.ts",
      "utf-8"
    );
    expect(source).toContain("accessGrant.create");
    expect(source).toContain('grantType: "permanent"');
  });

  it("paywall route checks existing AccessGrant before requiring payment", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/route.ts",
      "utf-8"
    );
    expect(source).toContain("accessGrant.findUnique");
    expect(source).toContain("postId_payerAddress");
  });

  it("paywall route records PaymentReceipt with kind=read_access", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/route.ts",
      "utf-8"
    );
    expect(source).toContain('kind: "read_access"');
    expect(source).toContain("paymentReceipt.create");
  });
});

// ─── P0: Content Security — bodyHtml Never Leaked in 402 ─────────────────────

describe("P0: Content security for paywalled posts", () => {
  it("paywalled preview strips bodyHtml and bodyMarkdown", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/route.ts",
      "utf-8"
    );
    // The previewPost object is manually constructed and must NOT include bodyHtml
    const previewBlock = source
      .split("Paywalled preview")[1]
      ?.split("return Response.json")[0];
    expect(previewBlock).toBeDefined();
    expect(previewBlock).not.toContain("bodyHtml");
    expect(previewBlock).not.toContain("bodyMarkdown");
  });

  it("402 Payment Required response does NOT include post body", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/lib/payment.ts", "utf-8");
    // buildPaymentRequiredResponse should only include payment metadata
    expect(source).not.toContain("bodyHtml");
    expect(source).not.toContain("bodyMarkdown");
  });
});

// ─── P1: SponsorButton Client Component — Allowance Logic ───────────────────

describe("P1: SponsorButton allowance and approve flow", () => {
  it("SponsorButton delegates to useSplitterPayment hook", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/components/SponsorButton.tsx",
      "utf-8"
    );
    expect(source).toContain("useSplitterPayment");
    expect(source).toContain("payment.execute");
  });

  it("useSplitterPayment hook has approve ABI entry", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/hooks/useSplitterPayment.ts",
      "utf-8"
    );
    expect(source).toContain('"approve"');
    expect(source).toContain('"allowance"');
  });

  it("useSplitterPayment hook has SPLITTER_ADDRESS constant", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/hooks/useSplitterPayment.ts",
      "utf-8"
    );
    expect(source).toContain("SPLITTER_ADDRESS");
  });

  it("if allowance >= amount, approve is skipped (approveSkipped = true)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/hooks/useSplitterPayment.ts",
      "utf-8"
    );
    // When allowance is sufficient, skip approve and go straight to sponsor
    expect(source).toContain("setApproveSkipped(true)");
    expect(source).toContain("fireSponsor(authorAddr, units)");
    // The condition checks currentAllowance >= units
    expect(source).toContain("currentAllowance >= units");
  });

  it("if allowance < amount, approve is required first (sequential path)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/hooks/useSplitterPayment.ts",
      "utf-8"
    );
    expect(source).toContain("fireApprove(amountUnits)");
    // After approve confirms, sponsor fires
    expect(source).toContain("fireSponsor(author, amountUnits)");
  });
});

// ─── P1: EIP-5792 Batching ──────────────────────────────────────────────────

describe("P1: EIP-5792 batch behavior", () => {
  it("useSplitterPayment attempts batch (writeContracts) first", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/hooks/useSplitterPayment.ts",
      "utf-8"
    );
    expect(source).toContain("useWriteContracts");
    expect(source).toContain("writeContracts");
  });

  it("useSplitterPayment falls back to sequential on EIP-5792 failure", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/hooks/useSplitterPayment.ts",
      "utf-8"
    );
    expect(source).toContain("not supported");
    expect(source).toContain("Method not found");
    expect(source).toContain("setUseBatch(false)");
    expect(source).toContain("fireApprove(amountUnits)");
  });

  it("batch sends approve + sponsor (not two transfers)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/hooks/useSplitterPayment.ts",
      "utf-8"
    );
    // fireBatch should contain approve + sponsor, not two transfers
    const batchSection = source.split("function fireBatch")[1]?.split("function ")[0] ?? "";
    expect(batchSection).toContain('"approve"');
    expect(batchSection).toContain('"sponsor"');
    // Must NOT contain "transfer" in the batch
    expect(batchSection).not.toContain('"transfer"');
  });

  it("sequential fallback does approve then sponsor", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/hooks/useSplitterPayment.ts",
      "utf-8"
    );
    // After approve confirms, fireSponsor is called
    expect(source).toContain("approveConfirmed");
    expect(source).toContain("fireSponsor(author, amountUnits)");
  });
});

// ─── P1: Edge Cases ─────────────────────────────────────────────────────────

describe("P1: Edge cases — input validation", () => {
  it("sponsor route rejects amount of 0", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain("Amount must be greater than 0");
    expect(source).toContain("parseFloat(v) > 0");
  });

  it("sponsor route rejects invalid amount formats", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    // Zod regex validates decimal format
    expect(source).toContain('regex(/^\\d+(\\.\\d{1,6})?$/');
  });

  it("sponsor route rejects paywalled posts", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain("post.isPaywalled");
    expect(source).toContain("Sponsorship is only available for free posts");
  });

  it("sponsor route rejects unpublished posts", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain("post.status !== \"published\"");
    expect(source).toContain("Post is not published");
  });

  it("sponsor route returns 404 for non-existent post", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain("Post not found");
    expect(source).toContain("status: 404");
  });

  it("sponsor route returns 503 if PLATFORM_TREASURY is not configured", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    expect(source).toContain("Platform treasury not configured");
    expect(source).toContain("status: 503");
  });
});

describe("P1: Edge cases — missing/invalid author address", () => {
  it("sponsor route falls back to PLATFORM_TREASURY when publication has no payoutAddress", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    // Fallback: authorPayoutAddress = publication?.payoutAddress ?? PLATFORM_TREASURY
    expect(source).toContain(
      "post.publication?.payoutAddress ?? PLATFORM_TREASURY"
    );
  });
});

describe("P1: Edge cases — tx hash validation", () => {
  it("parsePaymentResponseHeader accepts raw 0x-prefixed 66-char hash", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/lib/payment.ts", "utf-8");
    expect(source).toContain('header.startsWith("0x")');
    expect(source).toContain("header.length === 66");
  });

  it("parsePaymentResponseHeader accepts JSON { txHash } format", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/lib/payment.ts", "utf-8");
    expect(source).toContain("parsed.txHash");
  });

  it("parsePaymentResponseHeader returns null for missing header", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/lib/payment.ts", "utf-8");
    expect(source).toContain("if (!header) return null");
  });
});

describe("P1: Edge cases — double-spend prevention", () => {
  it("ISSUE: sponsor route does NOT check for duplicate txRef (must-fix)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/sponsor/route.ts",
      "utf-8"
    );
    // There is NO check like: findFirst({ where: { txRef } })
    // This means the same tx hash can be submitted multiple times
    const hasDuplicateCheck =
      source.includes("findFirst") && source.includes("txRef");
    // Documenting the gap — this SHOULD be true after fix
    expect(hasDuplicateCheck).toBe(false);
  });

  it("ISSUE: paywall route does NOT check for duplicate txRef (must-fix)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/posts/[postId]/route.ts",
      "utf-8"
    );
    const hasDuplicateCheck =
      source.includes("findFirst") && source.includes("txRef");
    expect(hasDuplicateCheck).toBe(false);
  });
});

describe("P1: Edge cases — on-chain verification", () => {
  it("ISSUE: verifyPayment in x402.ts is a stub (must-fix for production)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/lib/x402.ts", "utf-8");
    // The verifyPayment function always returns { valid: true }
    expect(source).toContain("return { valid: true }");
    expect(source).toContain("TODO: Implement on-chain verification");
  });
});

// ─── P2: Regression — Discovery Scoring ─────────────────────────────────────

describe("P2: Regression — discovery scoring with sponsorship receipts", () => {
  it("discovery module includes sponsorship revenue with lower weight", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/lib/discovery.ts", "utf-8");
    expect(source).toContain("sponsor_revenue_7d");
    expect(source).toContain("unique_sponsors_7d");
    expect(source).toContain("W_SPONSOR_REV");
    expect(source).toContain("W_SPONSOR_PAYERS");
  });

  it("sponsor weights are strictly lower than read weights", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/lib/constants.ts", "utf-8");
    // W_SPONSOR_REV = 5 < W_REV = 10
    expect(source).toContain("W_SPONSOR_REV = 5");
    expect(source).toContain("W_REV = 10");
    // W_SPONSOR_PAYERS = 3.5 < W_PAYERS = 5
    expect(source).toContain("W_SPONSOR_PAYERS = 3.5");
    expect(source).toContain("W_PAYERS = 5");
  });
});

describe("P2: Regression — search/topics still show sponsor labels", () => {
  it("PostCard has sponsorLabel prop", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/components/PostCard.tsx", "utf-8");
    expect(source).toContain("sponsorLabel");
  });

  it("discovery DTO includes sponsorship fields", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/lib/discovery.ts", "utf-8");
    expect(source).toContain("sponsorRevenue7d");
    expect(source).toContain("uniqueSponsors7d");
  });
});

describe("P2: Regression — SponsorButton only renders on free posts", () => {
  it("post page guards SponsorButton behind !post.isPaywalled", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/app/post/[postId]/page.tsx", "utf-8");
    expect(source).toContain("!post.isPaywalled");
    expect(source).toContain("SponsorButton");
  });
});

// ─── P0 Unit Tests: parsePaymentResponseHeader ──────────────────────────────

describe("P0: parsePaymentResponseHeader unit tests", () => {
  // Import the function directly for unit testing
  // These are true unit tests, not source-inspection tests

  it("returns txRef for raw 66-char hex hash", async () => {
    const { parsePaymentResponseHeader } = await import("../src/lib/payment");
    const hash = "0x" + "a".repeat(64);
    const req = new Request("http://localhost", {
      headers: { "x-payment-response": hash },
    });
    const result = parsePaymentResponseHeader(req);
    expect(result).not.toBeNull();
    expect(result!.txRef).toBe(hash);
    expect(result!.chainId).toBe(8453);
  });

  it("returns txRef for JSON format { txHash, chainId }", async () => {
    const { parsePaymentResponseHeader } = await import("../src/lib/payment");
    const json = JSON.stringify({
      txHash: "0x" + "b".repeat(64),
      chainId: 8453,
    });
    const req = new Request("http://localhost", {
      headers: { "x-payment-response": json },
    });
    const result = parsePaymentResponseHeader(req);
    expect(result).not.toBeNull();
    expect(result!.txRef).toBe("0x" + "b".repeat(64));
  });

  it("returns null when header is missing", async () => {
    const { parsePaymentResponseHeader } = await import("../src/lib/payment");
    const req = new Request("http://localhost");
    const result = parsePaymentResponseHeader(req);
    expect(result).toBeNull();
  });

  it("returns null for non-hex string that is not valid JSON", async () => {
    const { parsePaymentResponseHeader } = await import("../src/lib/payment");
    const req = new Request("http://localhost", {
      headers: { "x-payment-response": "not-a-hash" },
    });
    const result = parsePaymentResponseHeader(req);
    expect(result).toBeNull();
  });

  it("returns null for hex string that is too short", async () => {
    const { parsePaymentResponseHeader } = await import("../src/lib/payment");
    const req = new Request("http://localhost", {
      headers: { "x-payment-response": "0xabc" },
    });
    const result = parsePaymentResponseHeader(req);
    expect(result).toBeNull();
  });
});

// ─── P0 Unit Tests: x402 helpers ────────────────────────────────────────────

describe("P0: extractPaymentProof unit tests", () => {
  it("extracts both txRef and payerAddress", async () => {
    const { extractPaymentProof } = await import("../src/lib/x402");
    const req = new Request("http://localhost", {
      headers: {
        "X-Payment-Response": "0x" + "c".repeat(64),
        "X-Payer-Address": "0x" + "d".repeat(40),
      },
    });
    const proof = extractPaymentProof(req);
    expect(proof).not.toBeNull();
    expect(proof!.txRef).toBe("0x" + "c".repeat(64));
    expect(proof!.payerAddress).toBe("0x" + "d".repeat(40));
    expect(proof!.chain).toBe("base");
  });

  it("returns null when no payment headers", async () => {
    const { extractPaymentProof } = await import("../src/lib/x402");
    const req = new Request("http://localhost");
    expect(extractPaymentProof(req)).toBeNull();
  });

  it("returns empty payerAddress if only txRef present", async () => {
    const { extractPaymentProof } = await import("../src/lib/x402");
    const req = new Request("http://localhost", {
      headers: { "X-Payment-Response": "0xabc123" },
    });
    const proof = extractPaymentProof(req);
    expect(proof).not.toBeNull();
    expect(proof!.payerAddress).toBe("");
  });
});

// ─── P0 Unit Tests: calculateReadFeeSplit ───────────────────────────────────

describe("P0: calculateReadFeeSplit unit tests", () => {
  it("splits $1.00 as $0.90 creator / $0.10 platform", async () => {
    const { calculateReadFeeSplit } = await import("../src/lib/x402");
    const split = calculateReadFeeSplit("1.00");
    expect(split.creatorAmount).toBe("0.90");
    expect(split.platformAmount).toBe("0.10");
  });

  it("splits $0.50 as $0.45 / $0.05", async () => {
    const { calculateReadFeeSplit } = await import("../src/lib/x402");
    const split = calculateReadFeeSplit("0.50");
    expect(split.creatorAmount).toBe("0.45");
    expect(split.platformAmount).toBe("0.05");
  });

  it("splits $10.00 as $9.00 / $1.00", async () => {
    const { calculateReadFeeSplit } = await import("../src/lib/x402");
    const split = calculateReadFeeSplit("10.00");
    expect(split.creatorAmount).toBe("9.00");
    expect(split.platformAmount).toBe("1.00");
  });
});

// ─── P0 Unit Tests: USDC conversion ────────────────────────────────────────

describe("P0: USDC unit conversion", () => {
  it("usdcToUnits handles whole numbers", async () => {
    const { usdcToUnits } = await import("../src/lib/x402");
    expect(usdcToUnits("1")).toBe(1_000_000n);
    expect(usdcToUnits("100")).toBe(100_000_000n);
  });

  it("usdcToUnits handles decimals", async () => {
    const { usdcToUnits } = await import("../src/lib/x402");
    expect(usdcToUnits("0.50")).toBe(500_000n);
    expect(usdcToUnits("0.000001")).toBe(1n);
  });

  it("unitsToUsdc round-trips correctly", async () => {
    const { usdcToUnits, unitsToUsdc } = await import("../src/lib/x402");
    expect(unitsToUsdc(usdcToUnits("1.00"))).toBe("1.000000");
    expect(unitsToUsdc(usdcToUnits("0.50"))).toBe("0.500000");
  });
});
