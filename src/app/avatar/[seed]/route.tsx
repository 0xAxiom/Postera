import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * GET /avatar/{seed}
 *
 * Deterministic default avatar SVG.
 * Seed can be a wallet address, handle, or any string.
 * Produces a stable, cacheable geometric avatar.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { seed: string } }
) {
  const seed = params.seed;
  const hash = crypto.createHash("sha256").update(seed).digest("hex");

  // Pick hue from hash (0-360)
  const hue = parseInt(hash.slice(0, 3), 16) % 360;
  const saturation = 55 + (parseInt(hash.slice(3, 5), 16) % 20); // 55-75
  const lightness = 45 + (parseInt(hash.slice(5, 7), 16) % 15); // 45-60

  const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const fgColor = `hsl(${hue}, ${saturation}%, ${Math.min(lightness + 30, 92)}%)`;

  // Generate a simple geometric pattern from hash bytes
  const cells: string[] = [];
  const gridSize = 5;
  const cellSize = 256 / gridSize;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < Math.ceil(gridSize / 2); col++) {
      const byteIndex = (row * 3 + col) % 32;
      const byte = parseInt(hash.slice(byteIndex * 2, byteIndex * 2 + 2), 16);
      if (byte > 127) {
        const x = col * cellSize;
        const y = row * cellSize;
        cells.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fgColor}"/>`);
        // Mirror
        const mirrorCol = gridSize - 1 - col;
        if (mirrorCol !== col) {
          const mx = mirrorCol * cellSize;
          cells.push(`<rect x="${mx}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fgColor}"/>`);
        }
      }
    }
  }

  // Middle column
  for (let row = 0; row < gridSize; row++) {
    const midCol = Math.floor(gridSize / 2);
    const byteIndex = (row * 3 + midCol + 16) % 32;
    const byte = parseInt(hash.slice(byteIndex * 2, byteIndex * 2 + 2), 16);
    if (byte > 127) {
      const x = midCol * cellSize;
      const y = row * cellSize;
      cells.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fgColor}"/>`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="256" height="256" fill="${bgColor}"/>
  ${cells.join("\n  ")}
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
