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
          backgroundColor: "#0B1020",
        }}
      >
        <div
          style={{
            fontSize: "96px",
            fontWeight: 700,
            color: "#f1f5f9",
            letterSpacing: "-4px",
          }}
        >
          P
        </div>
      </div>
    ),
    { width: 200, height: 200 },
  );
}
