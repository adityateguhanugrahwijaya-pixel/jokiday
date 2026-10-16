import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

let cachedFontBase64: string | null = null;

function getEmbeddedFontBase64(): string {
  if (cachedFontBase64) return cachedFontBase64;
  try {
    const fontPath = path.join(
      process.cwd(),
      "src",
      "server",
      "media",
      "assets",
      "noto-sans.ttf"
    );
    if (fs.existsSync(fontPath)) {
      cachedFontBase64 = fs.readFileSync(fontPath).toString("base64");
      return cachedFontBase64;
    }
  } catch (err) {
    console.warn("[WatermarkService] Gagal memuat font lokal:", err);
  }
  return "";
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface WatermarkOptions {
  username: string;
  maxPx?: number;
}

export class WatermarkService {
  /**
   * Menambahkan watermark diagonal berulang ke dalam gambar sesuai DESIGN.md:
   * - Teks format: JokiDay • @username (aman glyph ASCII, tanpa tofu)
   * - Sudut diagonal -30 derajat
   * - Dua lapis kontras ganda (putih dan navy #0B1F4A) agar terbaca jelas di latar terang maupun gelap
   * - Pola bersilang (staggered / brick lattice) rapat tanpa celah kosong, melindungi seluruh kanvas dari screenshot/crop
   * - Font Noto Sans TTF tersemat via base64 font-face agar konsisten di semua platform
   * - Sisi terpanjang di-resize maksimum maxPx (default 1200px)
   */
  static async applyWatermark(
    inputBuffer: Buffer,
    options: WatermarkOptions
  ): Promise<{ buffer: Buffer; width: number; height: number; mimeType: string }> {
    const maxPx = options.maxPx || 1200;
    const metadata = await sharp(inputBuffer).metadata();

    let width = metadata.width || 800;
    let height = metadata.height || 600;

    // Resize jika melewati batas preview_max_px
    let pipeline = sharp(inputBuffer);
    if (width > maxPx || height > maxPx) {
      if (width >= height) {
        height = Math.round((height * maxPx) / width);
        width = maxPx;
      } else {
        width = Math.round((width * maxPx) / height);
        height = maxPx;
      }
      pipeline = pipeline.resize(width, height, { fit: "inside" });
    }

    const shortSide = Math.min(width, height);
    // Skala ukuran font proporsional (±4.2% dari sisi terpendek sesuai DESIGN.md)
    const fontSize = Math.max(15, Math.round(shortSide * 0.042));

    // Bersihkan username dari karakter @ di depan jika ada, lalu sanitasi XML
    const rawUsername = options.username.trim().replace(/^@+/, "");
    const safeUsername = escapeXml(rawUsername || "designer");
    const textLabel = `JokiDay • @${safeUsername}`;

    // Kalkulasi dimensi teks dan tile pattern bersilang rapat (brick layout)
    const charWidth = fontSize * 0.64;
    const textWidth = Math.ceil(textLabel.length * charWidth);
    const horizontalGap = Math.max(36, Math.round(fontSize * 1.8));
    const tileWidth = textWidth + horizontalGap;
    const rowHeight = Math.max(38, Math.round(fontSize * 2.3));
    const tileHeight = rowHeight * 2;

    const fontBase64 = getEmbeddedFontBase64();
    const strokeWidth = Math.max(1.5, Number((fontSize * 0.08).toFixed(1)));

    const svgOverlay = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${
            fontBase64
              ? `<style>
                  @font-face {
                    font-family: 'JokiDayWatermarkFont';
                    src: url('data:font/ttf;base64,${fontBase64}');
                    font-weight: 700;
                    font-style: normal;
                  }
                  .wm-txt {
                    font-family: 'JokiDayWatermarkFont', Arial, 'Segoe UI', Helvetica, sans-serif;
                    font-size: ${fontSize}px;
                    font-weight: 700;
                    letter-spacing: 0.2px;
                  }
                </style>`
              : `<style>
                  .wm-txt {
                    font-family: Arial, 'Segoe UI', Helvetica, sans-serif;
                    font-size: ${fontSize}px;
                    font-weight: 700;
                    letter-spacing: 0.2px;
                  }
                </style>`
          }
          <pattern id="wm" width="${tileWidth}" height="${tileHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
            <!-- Baris 1: x = 0 -->
            <!-- Lapis 1: Navy (#0B1F4A) untuk kontras di latar terang -->
            <text x="1.5" y="${rowHeight * 0.72 + 1.5}" class="wm-txt" fill="#0B1F4A" fill-opacity="0.38" stroke="#0B1F4A" stroke-width="${strokeWidth}" stroke-opacity="0.35">
              ${textLabel}
            </text>
            <!-- Lapis 2: Putih (#FFFFFF) untuk kontras di latar gelap -->
            <text x="0" y="${rowHeight * 0.72}" class="wm-txt" fill="#FFFFFF" fill-opacity="0.48" stroke="#FFFFFF" stroke-width="${strokeWidth * 0.5}" stroke-opacity="0.30">
              ${textLabel}
            </text>

            <!-- Baris 2: x = tileWidth / 2 (Staggered offset 50%) -->
            <!-- Lapis 1: Navy (#0B1F4A) -->
            <text x="${tileWidth / 2 + 1.5}" y="${rowHeight * 1.72 + 1.5}" class="wm-txt" fill="#0B1F4A" fill-opacity="0.38" stroke="#0B1F4A" stroke-width="${strokeWidth}" stroke-opacity="0.35">
              ${textLabel}
            </text>
            <!-- Lapis 2: Putih (#FFFFFF) -->
            <text x="${tileWidth / 2}" y="${rowHeight * 1.72}" class="wm-txt" fill="#FFFFFF" fill-opacity="0.48" stroke="#FFFFFF" stroke-width="${strokeWidth * 0.5}" stroke-opacity="0.30">
              ${textLabel}
            </text>
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#wm)" />
      </svg>
    `);

    const resultBuffer = await pipeline
      .composite([
        {
          input: svgOverlay,
          top: 0,
          left: 0,
        },
      ])
      .jpeg({ quality: 85 })
      .toBuffer();

    return {
      buffer: resultBuffer,
      width,
      height,
      mimeType: "image/jpeg",
    };
  }
}
