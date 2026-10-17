import sharp from "sharp";
import { NOTO_SANS_FONT_BASE64 } from "./assets/watermark-font";

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
   * Menambahkan watermark elegan dan aman di area tengah (center) gambar:
   * - Posisi: Tengah vertikal dan horizontal (anti-crop, susah dihapus)
   * - Teks format: "JokiDay" (bold) + pemisah lingkaran vektor SVG + "@username"
   * - Menggunakan elemen <circle> native SVG untuk dot pemisah agar 100% bebas dari
   *   glitch missing-glyph / kotak-kotak (tofu box) di serverless Linux/Vercel
   * - Desain pill/kapsul transparan elegan (soft translucent dark glass)
   *   dengan stroke halus dan drop-shadow lembut (melindungi karya tanpa merusak estetika)
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
    // Skala ukuran font proporsional dan nyaman terbaca (~3.2% dari sisi pendek)
    let fontSize = Math.max(12, Math.min(22, Math.round(shortSide * 0.032)));

    // Bersihkan username dari karakter @ di depan jika ada, sanitasi ke karakter ASCII aman
    const rawUsername = options.username.trim().replace(/^@+/, "");
    const safeUsername = escapeXml(rawUsername.replace(/[^\w.-]/g, "") || "designer");

    // Hitung proporsi teks dan komponen
    let brandWidth = Math.round(fontSize * 3.8);
    let dotGap = Math.round(fontSize * 0.65);
    let dotRadius = Math.max(2, Math.round(fontSize * 0.14));
    let userWidth = Math.round(fontSize * (0.85 + safeUsername.length * 0.52));
    let padX = Math.round(fontSize * 1.0);
    let padY = Math.round(fontSize * 0.5);

    let totalNeededWidth = brandWidth + dotGap * 2 + userWidth + padX * 2;
    // Jika lebar pill melebihi lebar gambar (misal di gambar portrait sempit), kecilkan fontSize
    if (totalNeededWidth > width * 0.88) {
      const scale = (width * 0.88) / totalNeededWidth;
      fontSize = Math.max(10, Math.floor(fontSize * scale));
      brandWidth = Math.round(fontSize * 3.8);
      dotGap = Math.round(fontSize * 0.65);
      dotRadius = Math.max(2, Math.round(fontSize * 0.14));
      userWidth = Math.round(fontSize * (0.85 + safeUsername.length * 0.52));
      padX = Math.round(fontSize * 1.0);
      padY = Math.round(fontSize * 0.5);
      totalNeededWidth = brandWidth + dotGap * 2 + userWidth + padX * 2;
    }

    const pillWidth = totalNeededWidth;
    const pillHeight = fontSize + padY * 2;
    const pillRadius = Math.round(pillHeight / 2);

    // Posisi di area tengah gambar (center)
    const posX = Math.round((width - pillWidth) / 2);
    const posY = Math.round((height - pillHeight) / 2);

    const brandX = posX + padX;
    const dotX = brandX + brandWidth + dotGap;
    const dotY = posY + Math.round(pillHeight / 2);
    const userX = dotX + dotGap;
    const textBaselineY = posY + padY + Math.round(fontSize * 0.78);

    const fontCss = `
      @font-face {
        font-family: 'JokiDayWatermarkFont';
        src: url('data:font/truetype;charset=utf-8;base64,${NOTO_SANS_FONT_BASE64}') format('truetype');
        font-weight: 400 800;
        font-style: normal;
      }
      @font-face {
        font-family: 'JokiDayWatermarkFont';
        src: url('data:font/truetype;charset=utf-8;base64,${NOTO_SANS_FONT_BASE64}') format('truetype');
        font-weight: 700;
        font-style: normal;
      }
      @font-face {
        font-family: 'JokiDayWatermarkFont';
        src: url('data:font/truetype;charset=utf-8;base64,${NOTO_SANS_FONT_BASE64}') format('truetype');
        font-weight: 500;
        font-style: normal;
      }
      .wm-brand {
        font-family: 'JokiDayWatermarkFont', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Helvetica, Arial, sans-serif;
        font-size: ${fontSize}px;
        font-weight: 700;
        letter-spacing: 0.35px;
      }
      .wm-user {
        font-family: 'JokiDayWatermarkFont', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', Helvetica, Arial, sans-serif;
        font-size: ${fontSize}px;
        font-weight: 500;
        letter-spacing: 0.2px;
      }
    `;

    const svgOverlay = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            ${fontCss}
          </style>
          <filter id="wm-shadow" x="-10%" y="-20%" width="120%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.35"/>
          </filter>
        </defs>
        <g filter="url(#wm-shadow)">
          <!-- Kapsul transparan elegan di tengah gambar (anti-crop) -->
          <rect
            x="${posX}"
            y="${posY}"
            width="${pillWidth}"
            height="${pillHeight}"
            rx="${pillRadius}"
            fill="#000000"
            fill-opacity="0.45"
            stroke="#FFFFFF"
            stroke-opacity="0.26"
            stroke-width="1.2"
          />
          <!-- Label Brand JokiDay (bold) -->
          <text
            x="${brandX}"
            y="${textBaselineY}"
            class="wm-brand"
            fill="#FFFFFF"
            fill-opacity="0.95"
          >JokiDay</text>
          <!-- Pemisah titik vektor SVG native (anti kotak-kotak / tofu box) -->
          <circle
            cx="${dotX}"
            cy="${dotY}"
            r="${dotRadius}"
            fill="#FFFFFF"
            fill-opacity="0.75"
          />
          <!-- Username desainer -->
          <text
            x="${userX}"
            y="${textBaselineY}"
            class="wm-user"
            fill="#FFFFFF"
            fill-opacity="0.88"
          >@${safeUsername}</text>
        </g>
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
