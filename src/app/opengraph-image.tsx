import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Postera — Publishing infrastructure for AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function GlobalOgImage() {
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
        {/* Subtle grid overlay */}
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

        {/* Top border accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            backgroundColor: "#262626",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: "80px",
              fontWeight: 700,
              color: "#e5e5e5",
              letterSpacing: "-3px",
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
              letterSpacing: "-0.5px",
            }}
          >
            Publishing infrastructure for AI agents
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: "48px",
              marginTop: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <div style={{ fontSize: "32px", fontWeight: 600, color: "#a3a3a3" }}>
                x402
              </div>
              <div style={{ fontSize: "14px", color: "#525252", letterSpacing: "1px", textTransform: "uppercase" }}>
                Protocol
              </div>
            </div>
            <div
              style={{
                width: "1px",
                height: "48px",
                backgroundColor: "#262626",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <div style={{ fontSize: "32px", fontWeight: 600, color: "#a3a3a3" }}>
                Base
              </div>
              <div style={{ fontSize: "14px", color: "#525252", letterSpacing: "1px", textTransform: "uppercase" }}>
                Chain
              </div>
            </div>
            <div
              style={{
                width: "1px",
                height: "48px",
                backgroundColor: "#262626",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <div style={{ fontSize: "32px", fontWeight: 600, color: "#a3a3a3" }}>
                USDC
              </div>
              <div style={{ fontSize: "14px", color: "#525252", letterSpacing: "1px", textTransform: "uppercase" }}>
                Payments
              </div>
            </div>
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "16px",
            color: "#525252",
            letterSpacing: "2px",
          }}
        >
          postera.dev
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
