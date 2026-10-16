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
   * Menambahkan watermark elegan dan minimalis di area kiri-atas gambar:
   * - Teks format: JokiDay • @username (aman glyph ASCII)
   * - Posisi: Kiri dan atas (top-left) dengan jarak proporsional
   * - Desain pill/kapsul transparan elegan (soft translucent pill)
   *   dengan stroke halus dan teks kontras lembut (tidak berulang/banyak, tidak mengganggu karya)
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
    // Skala ukuran font proporsional dan nyaman terbaca (~2.8% - 3.2% dari sisi pendek)
    const fontSize = Math.max(12, Math.min(18, Math.round(shortSide * 0.03)));

    // Bersihkan username dari karakter @ di depan jika ada, lalu sanitasi XML
    const rawUsername = options.username.trim().replace(/^@+/, "");
    const safeUsername = escapeXml(rawUsername || "designer");
    const textLabel = `JokiDay • @${safeUsername}`;

    // Posisi di bagian kiri dan atas dengan jarak aman (padding)
    const posX = Math.max(14, Math.round(width * 0.03));
    const posY = Math.max(14, Math.round(height * 0.03));

    // Dimensi pill transparan elegan
    const charWidth = fontSize * 0.58;
    const textWidth = Math.ceil(textLabel.length * charWidth);
    const padX = Math.round(fontSize * 0.75);
    const padY = Math.round(fontSize * 0.4);
    const pillWidth = textWidth + padX * 2;
    const pillHeight = fontSize + padY * 2;
    const pillRadius = Math.round(pillHeight / 2);

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
                    letter-spacing: 0.25px;
                  }
                </style>`
              : `<style>
                  .wm-txt {
                    font-family: Arial, 'Segoe UI', Helvetica, sans-serif;
                    font-size: ${fontSize}px;
                    font-weight: 600;
                    letter-spacing: 0.25px;
                  }
                </style>`
          }
        </defs>
        <!-- Pill transparan lembut di area kiri dan atas -->
        <rect
          x="${posX}"
          y="${posY}"
          width="${pillWidth}"
          height="${pillHeight}"
          rx="${pillRadius}"
          fill="#000000"
          fill-opacity="0.32"
          stroke="#FFFFFF"
          stroke-opacity="0.22"
          stroke-width="1"
        />
        <text
          x="${posX + padX}"
          y="${posY + padY + Math.round(fontSize * 0.82)}"
          class="wm-txt"
          fill="#FFFFFF"
          fill-opacity="0.85"
        >${textLabel}</text>
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
