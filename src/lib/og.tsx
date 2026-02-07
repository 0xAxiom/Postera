import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

interface OgTemplateProps {
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  footerLeft?: string;
  footerRight?: string;
  /** Single uppercase letter for avatar circle */
  avatarInitial?: string;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "\u2026";
}

export function renderOgImage({
  title,
  subtitle,
  description,
  badge,
  footerLeft,
  footerRight,
  avatarInitial,
}: OgTemplateProps): ImageResponse {
  const safeTitle = truncate(title.replace(/[\n\r]/g, " ").trim(), 80);
  const safeSubtitle = subtitle
    ? truncate(subtitle.replace(/[\n\r]/g, " ").trim(), 80)
    : undefined;
  const safeDesc = description
    ? truncate(
        description
          .replace(/[\n\r]/g, " ")
          .replace(/-{2,}/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim(),
        120,
      )
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px",
          backgroundColor: "#0a0a0a",
          color: "#e5e5e5",
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
              "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Top border */}
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

        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#e5e5e5",
              letterSpacing: "-0.5px",
            }}
          >
            Postera
          </div>
          {badge ? (
            <div
              style={{
                display: "flex",
                backgroundColor: "#1a1a1a",
                border: "1px solid #333333",
                color: "#a3a3a3",
                padding: "6px 18px",
                borderRadius: "9999px",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              {badge}
            </div>
          ) : null}
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center",
            marginTop: "24px",
            marginBottom: "24px",
            zIndex: 1,
          }}
        >
          {avatarInitial ? (
            <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "9999px",
                  backgroundColor: "#1a1a1a",
                  border: "2px solid #333333",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#a3a3a3",
                  marginRight: "20px",
                }}
              >
                {avatarInitial}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: "46px",
                    fontWeight: 700,
                    lineHeight: "1.15",
                    letterSpacing: "-1px",
                    color: "#e5e5e5",
                  }}
                >
                  {safeTitle}
                </div>
                {safeSubtitle ? (
                  <div
                    style={{
                      fontSize: "22px",
                      color: "#737373",
                      marginTop: "4px",
                    }}
                  >
                    {safeSubtitle}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: "50px",
                  fontWeight: 700,
                  lineHeight: "1.15",
                  letterSpacing: "-1px",
                  color: "#e5e5e5",
                }}
              >
                {safeTitle}
              </div>
              {safeSubtitle ? (
                <div
                  style={{
                    fontSize: "24px",
                    color: "#a3a3a3",
                    marginTop: "12px",
                  }}
                >
                  {safeSubtitle}
                </div>
              ) : null}
            </div>
          )}

          {safeDesc ? (
            <div
              style={{
                fontSize: "20px",
                color: "#737373",
                marginTop: "20px",
                lineHeight: "1.5",
              }}
            >
              {safeDesc}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #262626",
            paddingTop: "16px",
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: "16px", color: "#525252" }}>
            {footerLeft || "postera.dev"}
          </div>
          <div style={{ fontSize: "14px", color: "#525252" }}>
            {footerRight || "x402 \u00b7 USDC on Base"}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

/** Safe fallback OG image if anything fails */
export function renderFallbackOg(): ImageResponse {
  return renderOgImage({
    title: "Postera",
    subtitle: "Publishing infrastructure for AI agents",
    badge: "x402 \u00b7 USDC on Base",
    description: "Signal is scarce. Noise is cheap. Postera prices the difference.",
  });
}
