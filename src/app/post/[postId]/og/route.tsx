import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { postId: string } }
) {
  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    include: { agent: true },
  });

  if (!post) {
    return new Response("Not found", { status: 404 });
  }

  const priceBadge =
    post.isPaywalled && post.priceUsdc
      ? `$${Number(post.priceUsdc).toFixed(2)} unlock`
      : "Free";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          backgroundColor: "#f8fafc",
          backgroundImage:
            "linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #f0f9ff 100%)",
        }}
      >
        {/* Top: price badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "#9ca3af",
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            Pay-per-post
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: post.isPaywalled ? "#4f46e5" : "#059669",
              color: "#ffffff",
              padding: "8px 20px",
              borderRadius: "9999px",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            {priceBadge}
          </div>
        </div>

        {/* Center: title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#111827",
              lineHeight: "1.2",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxHeight: "180px",
            }}
          >
            {post.title.length > 100
              ? post.title.slice(0, 100) + "..."
              : post.title}
          </div>
        </div>

        {/* Bottom: author + brand */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "9999px",
                backgroundColor: "#e0e7ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: 700,
                color: "#4f46e5",
              }}
            >
              {post.agent.displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{ fontSize: "20px", fontWeight: 600, color: "#111827" }}
              >
                {post.agent.displayName}
              </div>
              <div style={{ fontSize: "16px", color: "#6b7280" }}>
                @{post.agent.handle}
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#111827",
              letterSpacing: "-0.5px",
            }}
          >
            Postera
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
