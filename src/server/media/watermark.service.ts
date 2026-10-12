import sharp from "sharp";

export interface WatermarkOptions {
  username: string;
  maxPx?: number;
}

export class WatermarkService {
  /**
   * Menambahkan watermark diagonal berulang ke dalam gambar sesuai DESIGN.md:
   * - Teks "JokiDay • @username"
   * - Sudut diagonal -30 derajat
   * - Dua lapis bergantian (putih 30% dan navy #0B1F4A 25%)
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
    const textLabel = `JokiDay • @${options.username}`;

    // SVG Pattern berulang diagonal -30 deg
    const patternWidth = Math.max(200, fontSize * 12);
    const patternHeight = Math.max(100, fontSize * 6);

    const svgOverlay = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wm" width="${patternWidth}" height="${patternHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
            <!-- Lapis 1: Navy 25% -->
            <text x="2" y="${patternHeight / 2 + 2}" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="rgba(11, 31, 74, 0.25)">
              ${textLabel}
            </text>
            <!-- Lapis 2: Putih 30% -->
            <text x="0" y="${patternHeight / 2}" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="rgba(255, 255, 255, 0.30)">
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
