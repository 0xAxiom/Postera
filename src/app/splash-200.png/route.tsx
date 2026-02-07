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
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
        }}
      >
        <div
          style={{
            fontSize: "96px",
            fontWeight: 700,
            color: "#e5e5e5",
            letterSpacing: "-4px",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          P
        </div>
      </div>
    ),
    { width: 200, height: 200 },
  );
}
