import { prisma } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";
import { DriveService } from "@/server/drive/drive.service";
import {
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";

export interface PostActionActor {
  userId: string;
  isAdmin?: boolean;
}

export class PostService {
  /**
   * Mengarsipkan karya desainer.
   * Hanya pemilik karya atau admin yang dapat mengarsipkan.
   * Operasi idempoten.
   */
  static async archivePost(postId: string, actor: PostActionActor) {
    if (!actor?.userId) {
      throw new UnauthorizedError("Sesi Anda tidak valid.");
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        designer: {
          include: { user: true },
        },
      },
    });

    if (!post || post.deletedAt !== null || post.status === "DELETED") {
      throw new NotFoundError("Karya tidak ditemukan atau sudah dihapus.");
    }

    const isOwner = post.designerId === actor.userId;
    const isAdmin = Boolean(actor.isAdmin);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError("Hanya pemilik karya atau administrator yang berhak mengarsipkan karya ini.");
    }

    // Idempoten jika sudah diarsipkan
    if (post.status === "ARCHIVED") {
      return {
        success: true,
        post,
        alreadyArchived: true,
        message: "Karya ini sudah berada dalam arsip.",
      };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
      },
      include: {
        previewAsset: true,
      },
    });

    // Jika dilakukan oleh admin (moderasi), catat di AuditLog
    if (isAdmin && !isOwner) {
      try {
        await prisma.auditLog.create({
          data: {
            actorId: actor.userId,
            action: "MODERATE_ARCHIVE_POST",
            entity: "Post",
            entityId: postId,
            before: JSON.stringify({ status: post.status, archivedAt: post.archivedAt }),
            after: JSON.stringify({ status: updatedPost.status, archivedAt: updatedPost.archivedAt }),
          },
        });
      } catch (logErr) {
        console.warn("[PostService] Gagal mencatat audit log archive:", logErr);
      }
    }

    return {
      success: true,
      post: updatedPost,
      alreadyArchived: false,
      message: "Karya berhasil diarsipkan. Karya disembunyikan dari publik namun tetap tersimpan.",
    };
  }

  /**
   * Memulihkan karya desainer dari arsip ke publik.
   * Hanya pemilik karya atau admin yang dapat memulihkan.
   * Operasi idempoten.
   */
  static async restorePost(postId: string, actor: PostActionActor) {
    if (!actor?.userId) {
      throw new UnauthorizedError("Sesi Anda tidak valid.");
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        designer: {
          include: { user: true },
        },
      },
    });

    if (!post || post.deletedAt !== null || post.status === "DELETED") {
      throw new NotFoundError("Karya tidak ditemukan atau sudah dihapus.");
    }

    const isOwner = post.designerId === actor.userId;
    const isAdmin = Boolean(actor.isAdmin);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError("Hanya pemilik karya atau administrator yang berhak memulihkan karya ini.");
    }

    // Idempoten jika sudah dipublikasikan
    if (post.status === "PUBLISHED") {
      return {
        success: true,
        post,
        alreadyPublished: true,
        message: "Karya sudah aktif dan tampil di publik.",
      };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        status: "PUBLISHED",
        archivedAt: null,
      },
      include: {
        previewAsset: true,
      },
    });

    if (isAdmin && !isOwner) {
      try {
        await prisma.auditLog.create({
          data: {
            actorId: actor.userId,
            action: "MODERATE_RESTORE_POST",
            entity: "Post",
            entityId: postId,
            before: JSON.stringify({ status: post.status, archivedAt: post.archivedAt }),
            after: JSON.stringify({ status: updatedPost.status, archivedAt: updatedPost.archivedAt }),
          },
        });
      } catch (logErr) {
        console.warn("[PostService] Gagal mencatat audit log restore:", logErr);
      }
    }

    return {
      success: true,
      post: updatedPost,
      alreadyPublished: false,
      message: "Karya berhasil dipulihkan dan kini kembali tampil di feed serta profil.",
    };
  }

  /**
   * Menghapus karya desainer menggunakan Soft Delete (deletedAt).
   * Khusus karya feed, file asli di Google Drive desainer ikut dihapus agar tidak clutter.
   * Hanya pemilik karya atau admin yang dapat menghapus.
   * Operasi idempoten.
   */
  static async deletePost(postId: string, actor: PostActionActor) {
    if (!actor?.userId) {
      throw new UnauthorizedError("Sesi Anda tidak valid.");
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        designer: {
          include: { user: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundError("Karya tidak ditemukan.");
    }

    // Idempoten jika sudah terhapus
    if (post.deletedAt !== null || post.status === "DELETED") {
      return {
        success: true,
        alreadyDeleted: true,
        message: "Karya ini sudah dihapus.",
        driveFilesRetained: false,
      };
    }

    const isOwner = post.designerId === actor.userId;
    const isAdmin = Boolean(actor.isAdmin);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError("Hanya pemilik karya atau administrator yang berhak menghapus karya ini.");
    }

    // Periksa keterkaitan ke brief/order pelanggan
    const relatedBriefsCount = await prisma.brief.count({
      where: { sourcePostId: postId },
    });

    // 1. Hapus file asli di Google Drive desainer jika terhubung
    let driveFileDeleted = false;
    const isRealDriveFile =
      Boolean(post.driveFileId) &&
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
          driveFileDeleted = true;
        }
      } catch (driveErr) {
        console.warn(`[PostService] Gagal menghapus file Google Drive (${post.driveFileId}):`, driveErr);
      }
    }

    // 2. Bersihkan file cache preview lokal jika ada
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "previews");
      const possibleFilenames = [
        `wm_${post.previewAssetId}.jpg`,
        `${post.previewAssetId}.jpg`,
        post.previewAssetId,
      ];
      for (const fn of possibleFilenames) {
        const filePath = path.join(uploadsDir, fn);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch {
          // Abaikan jika sudah tidak ada
        }
      }
    } catch (fsErr) {
      console.warn("[PostService] Gagal membersihkan preview lokal:", fsErr);
    }

    const now = new Date();
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        status: "DELETED",
        deletedAt: now,
      },
    });

    if (isAdmin && !isOwner) {
      try {
        await prisma.auditLog.create({
          data: {
            actorId: actor.userId,
            action: "MODERATE_DELETE_POST",
            entity: "Post",
            entityId: postId,
            before: JSON.stringify({ status: post.status, deletedAt: post.deletedAt }),
            after: JSON.stringify({ status: updatedPost.status, deletedAt: updatedPost.deletedAt }),
          },
        });
      } catch (logErr) {
        console.warn("[PostService] Gagal mencatat audit log delete:", logErr);
      }
    }

    return {
      success: true,
      alreadyDeleted: false,
      post: updatedPost,
      relatedBriefsCount,
      driveFileDeleted,
      driveFilesRetained: false,
      message: driveFileDeleted
        ? "Karya dan file aslinya di Google Drive berhasil dihapus."
        : "Karya berhasil dihapus dari tampilan.",
    };
  }

  /**
   * Mengambil daftar karya yang diarsipkan milik desainer.
   * Hanya desainer pemilik atau admin yang dapat mengakses.
   */
  static async getArchivedPosts(designerUserId: string, actor: PostActionActor) {
    if (!actor?.userId) {
      throw new UnauthorizedError("Sesi Anda tidak valid.");
    }

    const isOwner = designerUserId === actor.userId;
    const isAdmin = Boolean(actor.isAdmin);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError("Hanya pemilik profil atau administrator yang dapat melihat karya diarsipkan.");
    }

    const posts = await prisma.post.findMany({
      where: {
        designerId: designerUserId,
        status: "ARCHIVED",
        deletedAt: null,
      },
      include: {
        previewAsset: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return posts;
  }

  /**
   * Cek relasi penggunaan karya sebelum dihapus.
   */
  static async checkPostUsage(postId: string) {
    const relatedBriefsCount = await prisma.brief.count({
      where: { sourcePostId: postId },
    });

    return {
      relatedBriefsCount,
      hasActiveReferences: relatedBriefsCount > 0,
    };
  }
}
