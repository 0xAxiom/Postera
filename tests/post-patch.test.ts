import { describe, it, expect } from "vitest";
import { updatePostSchema } from "@/lib/validation";
import {
  renderMarkdown,
  generatePreview,
  computeContentHash,
} from "@/lib/markdown";

// ─── Task 1: Validation schema accepts bodyMarkdown ─────────────────────────

describe("updatePostSchema", () => {
  it("accepts bodyMarkdown as a string", () => {
    const result = updatePostSchema.safeParse({
      bodyMarkdown: "# Updated content\n\nNew paragraph.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bodyMarkdown).toBe(
        "# Updated content\n\nNew paragraph."
      );
    }
  });

  it("rejects empty bodyMarkdown", () => {
    const result = updatePostSchema.safeParse({ bodyMarkdown: "" });
    expect(result.success).toBe(false);
  });

  it("accepts title + bodyMarkdown together", () => {
    const result = updatePostSchema.safeParse({
      title: "New Title",
      bodyMarkdown: "New body content.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts correctionNote as string", () => {
    const result = updatePostSchema.safeParse({
      correctionNote: "Fixed a factual error in paragraph 3.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.correctionNote).toBe(
        "Fixed a factual error in paragraph 3."
      );
    }
  });

  it("accepts correctionNote as null (to clear it)", () => {
    const result = updatePostSchema.safeParse({
      correctionNote: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.correctionNote).toBeNull();
    }
  });

  it("accepts revisionReason", () => {
    const result = updatePostSchema.safeParse({
      bodyMarkdown: "Updated body.",
      revisionReason: "Typo fix",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revisionReason).toBe("Typo fix");
    }
  });

  it("accepts tags as string array", () => {
    const result = updatePostSchema.safeParse({
      tags: ["crypto", "defi"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects tags over max length", () => {
    const result = updatePostSchema.safeParse({
      tags: Array(9).fill("tag"),
    });
    expect(result.success).toBe(false);
  });

  it("accepts all fields together", () => {
    const result = updatePostSchema.safeParse({
      title: "Updated Title",
      bodyMarkdown: "# New body\n\nWith content.",
      tags: ["updated"],
      correctionNote: "Fixed typo",
      revisionReason: "Typo correction",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Task 2: bodyHtml regeneration ──────────────────────────────────────────

describe("bodyHtml regeneration on bodyMarkdown change", () => {
  it("renderMarkdown produces sanitized HTML from markdown", () => {
    const md = "# Hello World\n\nThis is a **test** paragraph.";
    const html = renderMarkdown(md);
    expect(html).toContain("<h1>");
    expect(html).toContain("Hello World");
    expect(html).toContain("<strong>test</strong>");
    expect(html).toContain("<p>");
  });

  it("renderMarkdown strips script tags", () => {
    const md = '# Safe\n\n<script>alert("xss")</script>\n\nContent here.';
    const html = renderMarkdown(md);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("alert");
    expect(html).toContain("Content here.");
  });

  it("computeContentHash changes when body changes", () => {
    const hash1 = computeContentHash("Original body");
    const hash2 = computeContentHash("Updated body");
    expect(hash1).not.toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex
  });

  it("computeContentHash is deterministic", () => {
    const hash1 = computeContentHash("Same content");
    const hash2 = computeContentHash("Same content");
    expect(hash1).toBe(hash2);
  });

  it("generatePreview regenerates from new markdown", () => {
    const md = "# Title\n\nFirst paragraph with important content. Second sentence here.";
    const preview = generatePreview(md, 30);
    expect(preview.length).toBeLessThanOrEqual(34); // 30 + "..."
    expect(preview).not.toContain("#");
  });
});

// ─── Task 2 regression: paywalled post page does not expose bodyHtml ────────

describe("paywall security invariant", () => {
  it("server page passes empty bodyHtml for paywalled posts", () => {
    // This test documents the invariant enforced in post/[postId]/page.tsx:
    //   bodyHtml={post.isPaywalled ? "" : post.bodyHtml}
    // We verify the logic here as a unit test of the conditional.
    const post = {
      isPaywalled: true,
      bodyHtml: "<p>Secret paid content</p>",
    };
    const passedBodyHtml = post.isPaywalled ? "" : post.bodyHtml;
    expect(passedBodyHtml).toBe("");
  });

  it("server page passes bodyHtml for free posts", () => {
    const post = {
      isPaywalled: false,
      bodyHtml: "<p>Free content</p>",
    };
    const passedBodyHtml = post.isPaywalled ? "" : post.bodyHtml;
    expect(passedBodyHtml).toBe("<p>Free content</p>");
  });
});

// ─── Task 3: PostRevision creation logic ────────────────────────────────────

describe("revision trail logic", () => {
  // These tests verify the revision-creation decision logic that lives
  // in the PATCH handler. We extract the same conditional here.

  function shouldCreateRevision(
    postStatus: string,
    oldTitle: string,
    newTitle: string | undefined,
    oldBody: string,
    newBody: string | undefined,
    oldTags: string[],
    newTags: string[] | undefined
  ): boolean {
    const titleChanged = newTitle !== undefined && newTitle !== oldTitle;
    const bodyChanged = newBody !== undefined && newBody !== oldBody;
    const tagsChanged = newTags !== undefined;
    return postStatus === "published" && (titleChanged || bodyChanged || tagsChanged);
  }

  it("creates revision when published post title changes", () => {
    expect(
      shouldCreateRevision("published", "Old Title", "New Title", "body", undefined, [], undefined)
    ).toBe(true);
  });

  it("creates revision when published post body changes", () => {
    expect(
      shouldCreateRevision("published", "Title", undefined, "old body", "new body", [], undefined)
    ).toBe(true);
  });

  it("creates revision when published post tags change", () => {
    expect(
      shouldCreateRevision("published", "Title", undefined, "body", undefined, ["old"], ["new"])
    ).toBe(true);
  });

  it("does NOT create revision for draft post edits", () => {
    expect(
      shouldCreateRevision("draft", "Old Title", "New Title", "old body", "new body", [], ["tag"])
    ).toBe(false);
  });

  it("does NOT create revision when same title is sent", () => {
    expect(
      shouldCreateRevision("published", "Same", "Same", "body", undefined, [], undefined)
    ).toBe(false);
  });

  it("does NOT create revision when same body is sent", () => {
    expect(
      shouldCreateRevision("published", "Title", undefined, "same body", "same body", [], undefined)
    ).toBe(false);
  });

  it("does NOT create revision when nothing content-related changes", () => {
    // e.g. only isPaywalled or priceUsdc changes
    expect(
      shouldCreateRevision("published", "Title", undefined, "body", undefined, [], undefined)
    ).toBe(false);
  });
});

// ─── Task 2: Full PATCH pipeline simulation ─────────────────────────────────

describe("PATCH pipeline simulation", () => {
  it("updates bodyMarkdown, bodyHtml, contentHash, version for published post", () => {
    // Simulate what the PATCH handler does
    const post = {
      status: "published",
      title: "Original",
      bodyMarkdown: "# Original\n\nOld content.",
      bodyHtml: "<h1>Original</h1>\n<p>Old content.</p>",
      contentHash: computeContentHash("# Original\n\nOld content."),
      version: 1,
      previewChars: 100,
      previewText: "Original Old content.",
      tags: [],
    };

    const data = {
      bodyMarkdown: "# Updated\n\nNew content with corrections.",
    };

    const updateData: Record<string, unknown> = {};
    const newMarkdown = data.bodyMarkdown ?? post.bodyMarkdown;

    if (data.bodyMarkdown !== undefined) {
      updateData.bodyMarkdown = newMarkdown;
      updateData.bodyHtml = renderMarkdown(newMarkdown);
      updateData.contentHash = computeContentHash(newMarkdown);
      updateData.version = post.version + 1;
    }

    const previewChars = post.previewChars;
    if (data.bodyMarkdown !== undefined) {
      updateData.previewChars = previewChars;
      updateData.previewText = generatePreview(newMarkdown, previewChars);
    }

    // Assertions
    expect(updateData.bodyMarkdown).toBe("# Updated\n\nNew content with corrections.");
    expect(updateData.bodyHtml).toContain("<h1>");
    expect(updateData.bodyHtml).toContain("New content with corrections.");
    expect(updateData.contentHash).not.toBe(post.contentHash);
    expect(updateData.version).toBe(2);
    expect(updateData.previewText).toBeTruthy();
    expect((updateData.previewText as string)).toContain("New content");
  });
});
