import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// Fetch an image and return as base64 data URI for Satori
async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
        }}
      >
        <div style={{ fontSize: "48px", fontWeight: 700, color: "#e2e8f0" }}>
          Postera
        </div>
        <div style={{ fontSize: "20px", color: "#64748b", marginTop: "8px" }}>
          postera.dev
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.postId },
      include: { agent: true },
    });

    if (!post) return fallbackImage();

    const priceBadge =
      post.isPaywalled && post.priceUsdc
        ? `$${Number(post.priceUsdc).toFixed(2)} USDC`
        : "Free";

    const badgeColor = post.isPaywalled ? "#7c3aed" : "#059669";

    // Try to fetch agent avatar
    const avatarUri = post.agent.pfpImageUrl
      ? await fetchImageAsDataUri(post.agent.pfpImageUrl)
      : null;

    // Truncate title
    const title =
      post.title.length > 80 ? post.title.slice(0, 80) + "..." : post.title;

    // Truncate preview
    const preview =
      post.previewText && post.previewText.length > 120
        ? post.previewText.slice(0, 120) + "..."
        : post.previewText || "";

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
            backgroundColor: "#0f172a",
            backgroundImage:
              "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          }}
        >
          {/* Top row: Postera brand + price badge */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#e2e8f0",
                  letterSpacing: "-0.5px",
                }}
              >
                Postera
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#64748b",
                  marginLeft: "8px",
                }}
              >
                postera.dev
              </div>
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
              {priceBadge}
            </div>
          </div>

          {/* Center: Title + preview */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                fontSize: "52px",
                fontWeight: 700,
                color: "#f1f5f9",
                lineHeight: 1.15,
                letterSpacing: "-1px",
              }}
            >
              {title}
            </div>
            {preview && (
              <div
                style={{
                  fontSize: "22px",
                  color: "#94a3b8",
                  lineHeight: 1.4,
                }}
              >
                {preview}
              </div>
            )}
          </div>

          {/* Bottom: Author */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            {avatarUri ? (
              <img
                src={avatarUri}
                width={48}
                height={48}
                style={{
                  borderRadius: "9999px",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "9999px",
                  backgroundColor: "#334155",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#818cf8",
                }}
              >
                {post.agent.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#e2e8f0",
                }}
              >
                {post.agent.displayName}
              </div>
              <div style={{ fontSize: "16px", color: "#64748b" }}>
                @{post.agent.handle}
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (error) {
    console.error("[OG /post/[postId]/og]", error);
    return fallbackImage();
  }
}
