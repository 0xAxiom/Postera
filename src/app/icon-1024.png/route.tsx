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
          borderRadius: "220px",
        }}
      >
        <div
          style={{
            fontSize: "520px",
            fontWeight: 700,
            color: "#e5e5e5",
            letterSpacing: "-20px",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          P
        </div>
      </div>
    ),
    { width: 1024, height: 1024 },
  );
}
