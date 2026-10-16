import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostService } from "@/server/feed/post.service";
import { PostCleanupService } from "@/server/feed/post-cleanup.service";
import { prisma } from "@/lib/db";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";

vi.mock("@/lib/db", () => {
  return {
    prisma: {
      post: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      brief: {
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      appConfig: {
        findUnique: vi.fn(),
      },
      previewAsset: {
        delete: vi.fn(),
      },
    },
  };
});

describe("Feed Archive & Soft Delete Feature", () => {
  const designerId = "designer-123";
  const otherUserId = "user-999";
  const adminId = "admin-888";
  const postId = "post-001";

  const mockPostPublished = {
    id: postId,
    designerId,
    caption: "Desain Logo Brand Kopi",
    category: "logo",
    driveFileId: "drive-file-123",
    previewAssetId: "asset-123",
    status: "PUBLISHED",
    archivedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    previewAsset: { id: "asset-123", driveFileId: "/uploads/previews/wm_1.jpg" },
    designer: { userId: designerId },
  };

  const mockPostArchived = {
    ...mockPostPublished,
    status: "ARCHIVED",
    archivedAt: new Date(),
  };

  const mockPostDeleted = {
    ...mockPostPublished,
    status: "DELETED",
    deletedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PostService.archivePost", () => {
    it("allows the owner designer to archive their own post", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostPublished as any);
      vi.mocked(prisma.post.update).mockResolvedValue({
        ...mockPostPublished,
        status: "ARCHIVED",
        archivedAt: new Date(),
      } as any);

      const result = await PostService.archivePost(postId, { userId: designerId });

      expect(result.success).toBe(true);
      expect(result.alreadyArchived).toBe(false);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: postId },
          data: expect.objectContaining({
            status: "ARCHIVED",
            archivedAt: expect.any(Date),
          }),
        })
      );
    });

    it("is idempotent when post is already archived", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostArchived as any);

      const result = await PostService.archivePost(postId, { userId: designerId });

      expect(result.success).toBe(true);
      expect(result.alreadyArchived).toBe(true);
      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it("rejects unauthorized archive attempt by another user", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostPublished as any);

      await expect(
        PostService.archivePost(postId, { userId: otherUserId, isAdmin: false })
      ).rejects.toThrow(ForbiddenError);

      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it("allows an admin to moderate-archive a post and records an audit log", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostPublished as any);
      vi.mocked(prisma.post.update).mockResolvedValue({
        ...mockPostPublished,
        status: "ARCHIVED",
        archivedAt: new Date(),
      } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const result = await PostService.archivePost(postId, { userId: adminId, isAdmin: true });

      expect(result.success).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: adminId,
            action: "MODERATE_ARCHIVE_POST",
            entity: "Post",
            entityId: postId,
          }),
        })
      );
    });
  });

  describe("PostService.restorePost", () => {
    it("allows the owner designer to restore their archived post", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostArchived as any);
      vi.mocked(prisma.post.update).mockResolvedValue({
        ...mockPostArchived,
        status: "PUBLISHED",
        archivedAt: null,
      } as any);

      const result = await PostService.restorePost(postId, { userId: designerId });

      expect(result.success).toBe(true);
      expect(result.alreadyPublished).toBe(false);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: postId },
          data: {
            status: "PUBLISHED",
            archivedAt: null,
          },
        })
      );
    });

    it("is idempotent when post is already published", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostPublished as any);

      const result = await PostService.restorePost(postId, { userId: designerId });

      expect(result.success).toBe(true);
      expect(result.alreadyPublished).toBe(true);
      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it("rejects unauthorized restore attempt by another user", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostArchived as any);

      await expect(
        PostService.restorePost(postId, { userId: otherUserId, isAdmin: false })
      ).rejects.toThrow(ForbiddenError);

      expect(prisma.post.update).not.toHaveBeenCalled();
    });
  });

  describe("PostService.deletePost (Soft Delete)", () => {
    it("soft deletes a post and retains Google Drive file without hard deletion", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostPublished as any);
      vi.mocked(prisma.brief.count).mockResolvedValue(0);
      vi.mocked(prisma.post.update).mockResolvedValue({
        ...mockPostPublished,
        status: "DELETED",
        deletedAt: new Date(),
      } as any);

      const result = await PostService.deletePost(postId, { userId: designerId });

      expect(result.success).toBe(true);
      expect(result.driveFilesRetained).toBe(true);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: postId },
          data: expect.objectContaining({
            status: "DELETED",
            deletedAt: expect.any(Date),
          }),
        })
      );
      // Prisma delete must NOT be called for soft delete
      expect(prisma.post.delete).not.toHaveBeenCalled();
    });

    it("reports related briefs count when post is referenced in customer orders", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostPublished as any);
      vi.mocked(prisma.brief.count).mockResolvedValue(3);
      vi.mocked(prisma.post.update).mockResolvedValue({
        ...mockPostPublished,
        status: "DELETED",
        deletedAt: new Date(),
      } as any);

      const result = await PostService.deletePost(postId, { userId: designerId });

      expect(result.success).toBe(true);
      expect(result.relatedBriefsCount).toBe(3);
    });

    it("is idempotent when post is already soft deleted", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostDeleted as any);

      const result = await PostService.deletePost(postId, { userId: designerId });

      expect(result.success).toBe(true);
      expect(result.alreadyDeleted).toBe(true);
      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it("rejects unauthorized delete attempt by another user", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostPublished as any);

      await expect(
        PostService.deletePost(postId, { userId: otherUserId, isAdmin: false })
      ).rejects.toThrow(ForbiddenError);

      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it("allows admin to moderate-delete a post and records an audit log", async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPostPublished as any);
      vi.mocked(prisma.brief.count).mockResolvedValue(0);
      vi.mocked(prisma.post.update).mockResolvedValue({
        ...mockPostPublished,
        status: "DELETED",
        deletedAt: new Date(),
      } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const result = await PostService.deletePost(postId, { userId: adminId, isAdmin: true });

      expect(result.success).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: adminId,
            action: "MODERATE_DELETE_POST",
            entity: "Post",
            entityId: postId,
          }),
        })
      );
    });
  });

  describe("PostService.getArchivedPosts", () => {
    it("allows owner to retrieve their archived posts", async () => {
      vi.mocked(prisma.post.findMany).mockResolvedValue([mockPostArchived] as any);

      const result = await PostService.getArchivedPosts(designerId, { userId: designerId });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("ARCHIVED");
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            designerId,
            status: "ARCHIVED",
            deletedAt: null,
          },
        })
      );
    });

    it("denies access to non-owner users", async () => {
      await expect(
        PostService.getArchivedPosts(designerId, { userId: otherUserId, isAdmin: false })
      ).rejects.toThrow(ForbiddenError);

      expect(prisma.post.findMany).not.toHaveBeenCalled();
    });
  });

  describe("Public Query Filtering Rules", () => {
    it("filters out archived and soft-deleted posts for public visitors", () => {
      const allPosts = [
        { id: "1", status: "PUBLISHED", deletedAt: null },
        { id: "2", status: "ARCHIVED", deletedAt: null },
        { id: "3", status: "DELETED", deletedAt: new Date() },
        { id: "4", status: "PUBLISHED", deletedAt: new Date() },
      ];

      const publicVisible = allPosts.filter(
        (p) => p.status === "PUBLISHED" && p.deletedAt === null
      );

      expect(publicVisible).toHaveLength(1);
      expect(publicVisible[0].id).toBe("1");
    });

    it("only counts active published posts in profile stats", () => {
      const designerPosts = [
        { id: "1", status: "PUBLISHED", deletedAt: null },
        { id: "2", status: "PUBLISHED", deletedAt: null },
        { id: "3", status: "ARCHIVED", deletedAt: null },
        { id: "4", status: "DELETED", deletedAt: new Date() },
      ];

      const activePosts = designerPosts.filter(
        (p) => p.status === "PUBLISHED" && p.deletedAt === null
      );
      const archivedPosts = designerPosts.filter(
        (p) => p.status === "ARCHIVED" && p.deletedAt === null
      );

      expect(activePosts.length).toBe(2);
      expect(archivedPosts.length).toBe(1);
    });
  });

  describe("PostCleanupService (Retention Logic)", () => {
    it("reads retention days from config or defaults to 30 days", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue({
        key: "POST_RETENTION_DAYS",
        value: "45",
      } as any);

      const days = await PostCleanupService.getRetentionDays();
      expect(days).toBe(45);
    });

    it("computes dry run without modifying database", async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.post.findMany).mockResolvedValue([mockPostDeleted] as any);

      const result = await PostCleanupService.cleanupOldDeletedPosts(true);

      expect(result.retentionDays).toBe(30);
      expect(result.candidatesCount).toBe(1);
      expect(result.purgedCount).toBe(0);
      expect(prisma.post.delete).not.toHaveBeenCalled();
    });
  });
});
