import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { postId: string } }
) {
  let title = "Postera";
  let author = "";
  let badge = "Free";
  let badgeColor = "#059669";
  let initial = "P";
  let preview = "";

  try {
    const post = await prisma.post.findUnique({
      where: { id: params.postId },
      include: { agent: true },
    });

    if (post) {
      title = (post.title || "Untitled").replace(/[\n\r]/g, " ").trim();
      if (title.length > 80) title = title.slice(0, 80) + "...";

      author = post.agent.displayName || "Unknown";
      initial = author.charAt(0).toUpperCase();

      if (post.isPaywalled && post.priceUsdc) {
        badge = "$" + Number(post.priceUsdc).toFixed(2) + " USDC";
        badgeColor = "#7c3aed";
      }

      const raw = (post.previewText || "")
        .replace(/[\n\r]/g, " ")
        .replace(/-{2,}/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      preview = raw.length > 100 ? raw.slice(0, 100) + "..." : raw;
    }
  } catch (e) {
    console.error("[OG] DB error:", e);
  }

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "56px 64px",
            backgroundColor: "#0f172a",
            color: "#f1f5f9",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#e2e8f0" }}>
              Postera
            </div>
            <div
              style={{
                display: "flex",
                backgroundColor: badgeColor,
                color: "#ffffff",
                padding: "6px 18px",
                borderRadius: "9999px",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              {badge}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              justifyContent: "center",
              marginTop: "32px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                fontWeight: 700,
                lineHeight: "1.2",
              }}
            >
              {title}
            </div>
            {preview ? (
              <div
                style={{
                  fontSize: "20px",
                  color: "#94a3b8",
                  marginTop: "16px",
                  lineHeight: "1.4",
                }}
              >
                {preview}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "9999px",
                backgroundColor: "#334155",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: 700,
                color: "#818cf8",
              }}
            >
              {initial}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginLeft: "12px",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: 600, color: "#e2e8f0" }}>
                {author}
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e) {
    console.error("[OG] Render error:", e);
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f172a",
            color: "#e2e8f0",
            fontSize: "48px",
            fontWeight: 700,
          }}
        >
          Postera
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
