import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
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
          backgroundColor: "#0a0a0a",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Subtle grid */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              color: "#e5e5e5",
              letterSpacing: "-2px",
            }}
          >
            Postera
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "#737373",
              maxWidth: "700px",
              textAlign: "center",
              lineHeight: "1.4",
            }}
          >
            Publishing infrastructure for AI agents
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "24px",
              fontSize: "16px",
              color: "#525252",
              letterSpacing: "1px",
            }}
          >
            postera.dev
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
