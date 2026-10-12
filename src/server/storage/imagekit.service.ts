import ImageKit from "imagekit";
import sharp from "sharp";
import { AppError } from "@/lib/errors";

let imagekitInstance: ImageKit | null = null;

function getImageKit(): ImageKit {
  if (!imagekitInstance) {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || "";
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || "";

    if (!publicKey || !privateKey || !urlEndpoint) {
      throw new AppError(
        "Kredensial ImageKit belum dikonfigurasi di environment.",
        "IMAGEKIT_CONFIG_MISSING",
        500
      );
    }

    imagekitInstance = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
  }
  return imagekitInstance;
}

export class ImageKitService {
  /**
   * Upload and optimize user avatar.
   * Resizes to 400x400 square WebP for fast global CDN loading.
   */
  static async uploadAvatar(
    userId: string,
    fileBuffer: Buffer,
    originalName: string
  ): Promise<{ url: string; fileId: string; thumbnailUrl: string }> {
    const ik = getImageKit();

    // 1. Optimasi gambar: resize ke 400x400 square dan konversi ke WebP 85% quality
    let optimizedBuffer: Buffer;
    try {
      optimizedBuffer = await sharp(fileBuffer)
        .rotate() // Auto-orient berdasarkan EXIF kamera HP
        .resize(400, 400, {
          fit: "cover",
          position: "center",
        })
        .webp({ quality: 85 })
        .toBuffer();
    } catch (err: any) {
      throw new AppError(
        `Format gambar tidak didukung atau file rusak: ${err.message}`,
        "INVALID_IMAGE_FILE",
        400
      );
    }

    // 2. Upload buffer teroptimasi ke ImageKit CDN
    const fileName = `avatar_${userId}_${Date.now()}.webp`;

    return new Promise((resolve, reject) => {
      ik.upload(
        {
          file: optimizedBuffer.toString("base64"),
          fileName,
          folder: "/jokiday/avatars",
          useUniqueFileName: true,
          tags: ["avatar", `user_${userId}`],
        },
        (err, result) => {
          if (err || !result) {
            return reject(
              new AppError(
                `Gagal mengunggah foto ke ImageKit CDN: ${err?.message || "Unknown error"}`,
                "IMAGEKIT_UPLOAD_FAILED",
                502
              )
            );
          }

          resolve({
            url: result.url,
            fileId: result.fileId,
            thumbnailUrl: result.thumbnailUrl || result.url,
          });
        }
      );
    });
  }

  /**
   * Upload watermarked portfolio post image to ImageKit CDN.
   * Serves public feed images with high speed and permanent cloud storage.
   */
  static async uploadPortfolioPost(
    designerId: string,
    watermarkedBuffer: Buffer,
    fileName: string
  ): Promise<{ url: string; fileId: string }> {
    const ik = getImageKit();

    return new Promise((resolve, reject) => {
      ik.upload(
        {
          file: watermarkedBuffer.toString("base64"),
          fileName,
          folder: "/jokiday/portfolio",
          useUniqueFileName: true,
          tags: ["portfolio", `designer_${designerId}`],
        },
        (err, result) => {
          if (err || !result) {
            return reject(
              new AppError(
                `Gagal mengunggah karya ke ImageKit CDN: ${err?.message || "Unknown error"}`,
                "IMAGEKIT_UPLOAD_FAILED",
                502
              )
            );
          }

          resolve({
            url: result.url,
            fileId: result.fileId,
          });
        }
      );
    });
  }
}
