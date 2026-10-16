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
   * Menambahkan watermark diagonal simpel dan elegan ke dalam gambar sesuai DESIGN.md:
   * - Teks format: JokiDay • @username (aman glyph ASCII)
   * - Sudut diagonal -28 derajat
   * - Pola bersilang lega & minimalis (tidak terlalu banyak/padat, tidak menutupi keindahan karya)
   * - Opasitas lembut & halus (~20% putih, ~16% bayangan gelap) agar tidak terlalu mencolok/visible
   *   namun tetap efektif mencegah screenshot tanpa izin
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
    // Skala ukuran font proporsional dan tidak berlebihan (~3.6% dari sisi pendek)
    const fontSize = Math.max(14, Math.round(shortSide * 0.036));

    // Bersihkan username dari karakter @ di depan jika ada, lalu sanitasi XML
    const rawUsername = options.username.trim().replace(/^@+/, "");
    const safeUsername = escapeXml(rawUsername || "designer");
    const textLabel = `JokiDay • @${safeUsername}`;

    // Kalkulasi dimensi teks dan spasi renggang yang bersih (clean & simple)
    const charWidth = fontSize * 0.62;
    const textWidth = Math.ceil(textLabel.length * charWidth);
    const horizontalGap = Math.max(90, Math.round(fontSize * 4.5));
    const tileWidth = textWidth + horizontalGap;
    const rowHeight = Math.max(95, Math.round(fontSize * 4.0));
    const tileHeight = rowHeight * 2;

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
                    font-weight: 600;
                    font-style: normal;
                  }
                  .wm-txt {
                    font-family: 'JokiDayWatermarkFont', Arial, 'Segoe UI', Helvetica, sans-serif;
                    font-size: ${fontSize}px;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                  }
                </style>`
              : `<style>
                  .wm-txt {
                    font-family: Arial, 'Segoe UI', Helvetica, sans-serif;
                    font-size: ${fontSize}px;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                  }
                </style>`
          }
          <pattern id="wm" width="${tileWidth}" height="${tileHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
            <!-- Baris 1: Bayangan halus + teks putih lembut -->
            <text x="1" y="${rowHeight * 0.72 + 1}" class="wm-txt" fill="#000000" fill-opacity="0.16">
              ${textLabel}
            </text>
            <text x="0" y="${rowHeight * 0.72}" class="wm-txt" fill="#FFFFFF" fill-opacity="0.20">
              ${textLabel}
            </text>

            <!-- Baris 2 (staggered offset) -->
            <text x="${tileWidth / 2 + 1}" y="${rowHeight * 1.72 + 1}" class="wm-txt" fill="#000000" fill-opacity="0.16">
              ${textLabel}
            </text>
            <text x="${tileWidth / 2}" y="${rowHeight * 1.72}" class="wm-txt" fill="#FFFFFF" fill-opacity="0.20">
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
