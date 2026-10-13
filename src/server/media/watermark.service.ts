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
   * - Teks format: @username + JokiDay (aman glyph ASCII, tanpa tofu kotak-kotak)
   * - Sudut diagonal -30 derajat
   * - Dua lapis bergantian (putih 30% dan navy #0B1F4A 25%)
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
    const fontSize = Math.max(14, Math.round(shortSide * 0.04));

    // Bersihkan username dari karakter @ di depan jika ada, lalu sanitasi XML
    const rawUsername = options.username.trim().replace(/^@+/, "");
    const safeUsername = escapeXml(rawUsername || "Desainer");
    const textLabel = `@${safeUsername} + JokiDay`;

    // Kalkulasi dimensi pattern SVG agar teks tidak tumpang tindih
    const estimatedTextWidth = Math.ceil(textLabel.length * fontSize * 0.72);
    const patternWidth = Math.max(260, Math.round(estimatedTextWidth * 1.6));
    const patternHeight = Math.max(120, Math.round(fontSize * 5));

    const fontBase64 = getEmbeddedFontBase64();

    const svgOverlay = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${
            fontBase64
              ? `<style>
                  @font-face {
                    font-family: 'JokiDayWatermarkFont';
                    src: url('data:font/ttf;base64,${fontBase64}');
                    font-weight: bold;
                    font-style: normal;
                  }
                </style>`
              : ""
          }
          <pattern id="wm" width="${patternWidth}" height="${patternHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
            <!-- Lapis 1: Navy #0B1F4A 25% -->
            <text x="2" y="${patternHeight / 2 + 2}" font-family="'JokiDayWatermarkFont', Arial, 'Segoe UI', Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="rgba(11, 31, 74, 0.25)">
              ${textLabel}
            </text>
            <!-- Lapis 2: Putih 30% -->
            <text x="0" y="${patternHeight / 2}" font-family="'JokiDayWatermarkFont', Arial, 'Segoe UI', Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="rgba(255, 255, 255, 0.30)">
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

