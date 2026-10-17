import sharp from "sharp";
import { renderVectorText } from "./assets/vector-font";

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
   * - 100% Vector Path SVG murni (bebas ketergantungan font OS, bebas glitch tofu box [] di Vercel/Linux)
   * - Posisi: Tengah kanvas (anti-crop / susah dihapus)
   * - Elemen: "JokiDay" + bulatan vektor native SVG + "@username"
   * - Desain: Kapsul transparan elegan (soft translucent dark glass) bergaris halus dengan drop-shadow lembut
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
    // Skala ukuran font proporsional (~3.2% dari sisi pendek, antara 13px - 22px)
    let fontSize = Math.max(13, Math.min(22, Math.round(shortSide * 0.032)));

    // Sanitasi username ke karakter standar ASCII aman
    const rawUsername = options.username.trim().replace(/^@+/, "");
    const safeUsername = rawUsername.replace(/[^\w.-]/g, "") || "designer";

    // Render vektor untuk teks
    let brandVector = renderVectorText("JokiDay", fontSize);
    let userVector = renderVectorText(`@${safeUsername}`, fontSize);

    let dotGap = Math.round(fontSize * 0.65);
    let dotRadius = Math.max(2, Math.round(fontSize * 0.16));
    let padX = Math.round(fontSize * 1.0);
    let padY = Math.round(fontSize * 0.55);

    let contentWidth = brandVector.width + dotGap * 2 + userVector.width;
    let totalNeededWidth = contentWidth + padX * 2;

    // Jika gambar berformat portrait sempit, sesuaikan ukuran secara dinamis
    if (totalNeededWidth > width * 0.88) {
      const scale = (width * 0.88) / totalNeededWidth;
      fontSize = Math.max(11, Math.floor(fontSize * scale));
      brandVector = renderVectorText("JokiDay", fontSize);
      userVector = renderVectorText(`@${safeUsername}`, fontSize);
      dotGap = Math.round(fontSize * 0.65);
      dotRadius = Math.max(2, Math.round(fontSize * 0.16));
      padX = Math.round(fontSize * 1.0);
      padY = Math.round(fontSize * 0.55);
      contentWidth = brandVector.width + dotGap * 2 + userVector.width;
      totalNeededWidth = contentWidth + padX * 2;
    }

    const pillWidth = totalNeededWidth;
    const pillHeight = fontSize + padY * 2;
    const pillRadius = Math.round(pillHeight / 2);

    // Posisi di area tengah gambar (center)
    const posX = Math.round((width - pillWidth) / 2);
    const posY = Math.round((height - pillHeight) / 2);

    const brandX = posX + padX;
    const dotX = brandX + brandVector.width + dotGap;
    const dotY = posY + Math.round(pillHeight / 2);
    const userX = dotX + dotGap;
    const baselineY = posY + padY + Math.round(fontSize * 0.76);

    const svgOverlay = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
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
          <!-- Brand JokiDay (Pure vector paths - 100% no tofu) -->
          <g transform="translate(${brandX}, ${baselineY})" fill="#FFFFFF" fill-opacity="0.95">
            ${brandVector.svg}
          </g>
          <!-- Pemisah titik vektor SVG native (anti kotak-kotak) -->
          <circle
            cx="${dotX}"
            cy="${dotY}"
            r="${dotRadius}"
            fill="#FFFFFF"
            fill-opacity="0.75"
          />
          <!-- Username desainer (Pure vector paths - 100% no tofu) -->
          <g transform="translate(${userX}, ${baselineY})" fill="#FFFFFF" fill-opacity="0.88">
            ${userVector.svg}
          </g>
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
