import { prisma } from "@/lib/db";
import fs from "node:fs/promises";
import path from "node:path";
import { DriveService } from "@/server/drive/drive.service";

export interface CleanupResult {
  retentionDays: number;
  thresholdDate: Date;
  candidatesCount: number;
  purgedCount: number;
  cleanedLocalFilesCount: number;
}

export class PostCleanupService {
  /**
   * Mengambil durasi retensi soft delete dari AppConfig (default 30 hari).
   */
  static async getRetentionDays(): Promise<number> {
    try {
      const config = await prisma.appConfig.findUnique({
        where: { key: "POST_RETENTION_DAYS" },
      });
      if (config?.value) {
        const val = parseInt(config.value, 10);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch {
      // Abaikan jika tabel config belum siap
    }
    return 30; // Standar default 30 hari
  }

  /**
   * Menjalankan pembersihan berkala untuk post berstatus DELETED yang masa retensinya telah lewat.
   * - Menghapus baris post dan previewAsset terkait dari DB
   * - Membersihkan cache file lokal di server
   * - Memastikan berkas Google Drive terkait telah dibersihkan
   */
  static async cleanupOldDeletedPosts(dryRun = false): Promise<CleanupResult> {
    const retentionDays = await this.getRetentionDays();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - retentionDays);

    const candidates = await prisma.post.findMany({
      where: {
        status: "DELETED",
        deletedAt: {
          lte: thresholdDate,
        },
      },
      include: {
        previewAsset: true,
      },
    });

    if (dryRun) {
      return {
        retentionDays,
        thresholdDate,
        candidatesCount: candidates.length,
        purgedCount: 0,
        cleanedLocalFilesCount: 0,
      };
    }

    let purgedCount = 0;
    let cleanedLocalFilesCount = 0;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "previews");

    for (const post of candidates) {
      try {
        // Bersihkan file Google Drive jika belum terhapus
        const isRealDriveFile =
          post.driveFileId &&
          !post.driveFileId.startsWith("orig_") &&
          !post.driveFileId.startsWith("local_") &&
          !post.driveFileId.startsWith("mock-") &&
          !post.driveFileId.startsWith("/") &&
          !post.driveFileId.startsWith("http");

        if (isRealDriveFile) {
          try {
            const driveConn = await prisma.driveConnection.findUnique({
              where: { userId: post.designerId },
            });
            if (driveConn && driveConn.status === "ACTIVE") {
              await DriveService.deleteFile(driveConn.refreshTokenEnc, post.driveFileId);
            }
          } catch {
            // File mungkin sudah dihapus sebelumnya
          }
        }

        // Hapus cache preview lokal jika ada
        if (post.previewAsset?.driveFileId?.startsWith("/uploads/previews/")) {
          const fileName = path.basename(post.previewAsset.driveFileId);
          const filePath = path.join(uploadsDir, fileName);
          try {
            await fs.unlink(filePath);
            cleanedLocalFilesCount++;
          } catch {
            // File mungkin sudah tidak ada
          }
        }

        // Hapus post record
        await prisma.post.delete({
          where: { id: post.id },
        });

        // Hapus PreviewAsset jika tidak dipakai lagi
        if (post.previewAssetId) {
          const otherUsage = await prisma.post.count({
            where: { previewAssetId: post.previewAssetId },
          });
          if (otherUsage === 0) {
            await prisma.previewAsset.delete({
              where: { id: post.previewAssetId },
            }).catch(() => {});
          }
        }

        purgedCount++;
      } catch (err) {
        console.warn(`[PostCleanupService] Gagal menghapus post permanen ${post.id}:`, err);
      }
    }

    return {
      retentionDays,
      thresholdDate,
      candidatesCount: candidates.length,
      purgedCount,
      cleanedLocalFilesCount,
    };
  }
}
