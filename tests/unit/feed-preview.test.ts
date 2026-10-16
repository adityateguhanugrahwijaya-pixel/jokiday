import { describe, it, expect } from "vitest";
import path from "node:path";

describe("Feed Preview & Designer Dropdown Navigation Rules", () => {
  describe("Designer Navigation Dynamic URL Resolution", () => {
    function getDesignerUrls(username?: string | null) {
      const designerUploadUrl = username
        ? `/designer/${username}?action=upload`
        : `/profile?notice=complete_designer_profile`;
      const designerPortfolioUrl = username
        ? `/designer/${username}?tab=posts`
        : `/profile?notice=complete_designer_profile`;

      return { designerUploadUrl, designerPortfolioUrl };
    }

    it("generates correct dynamic URLs when designer has a username", () => {
      const { designerUploadUrl, designerPortfolioUrl } = getDesignerUrls("aditya_teguh_wijaya");
      expect(designerUploadUrl).toBe("/designer/aditya_teguh_wijaya?action=upload");
      expect(designerPortfolioUrl).toBe("/designer/aditya_teguh_wijaya?tab=posts");
    });

    it("redirects to profile with clear notice if designer has not completed a username", () => {
      const nullCase = getDesignerUrls(null);
      expect(nullCase.designerUploadUrl).toBe("/profile?notice=complete_designer_profile");
      expect(nullCase.designerPortfolioUrl).toBe("/profile?notice=complete_designer_profile");

      const undefinedCase = getDesignerUrls(undefined);
      expect(undefinedCase.designerUploadUrl).toBe("/profile?notice=complete_designer_profile");
      expect(undefinedCase.designerPortfolioUrl).toBe("/profile?notice=complete_designer_profile");

      const emptyCase = getDesignerUrls("");
      expect(emptyCase.designerUploadUrl).toBe("/profile?notice=complete_designer_profile");
      expect(emptyCase.designerPortfolioUrl).toBe("/profile?notice=complete_designer_profile");
    });
  });

  describe("File Type Detection for Preview Placeholders", () => {
    function detectFileType(fileNameOrUrl: string, mimeType?: string) {
      const lower = fileNameOrUrl.toLowerCase();
      const lowerMime = (mimeType || "").toLowerCase();

      const isZip =
        lower.endsWith(".zip") ||
        lower.endsWith(".rar") ||
        lowerMime.includes("zip");

      const isVectorOrPsd =
        lower.endsWith(".psd") ||
        lower.endsWith(".ai") ||
        lower.endsWith(".eps") ||
        lower.endsWith(".cdr");

      const isPdf = lower.endsWith(".pdf") || lowerMime.includes("pdf");

      if (isZip) return "ZIP_ARCHIVE";
      if (isVectorOrPsd) return "VECTOR_OR_PSD";
      if (isPdf) return "PDF_DOCUMENT";
      return "IMAGE";
    }

    it("identifies standard images as IMAGE", () => {
      expect(detectFileType("banner.jpg")).toBe("IMAGE");
      expect(detectFileType("logo.png")).toBe("IMAGE");
      expect(detectFileType("feed.webp")).toBe("IMAGE");
      expect(detectFileType("/api/previews/uuid-123")).toBe("IMAGE");
    });

    it("identifies archives as ZIP_ARCHIVE", () => {
      expect(detectFileType("master_files.zip")).toBe("ZIP_ARCHIVE");
      expect(detectFileType("assets.rar")).toBe("ZIP_ARCHIVE");
      expect(detectFileType("download", "application/zip")).toBe("ZIP_ARCHIVE");
    });

    it("identifies design source files as VECTOR_OR_PSD", () => {
      expect(detectFileType("poster_mockup.psd")).toBe("VECTOR_OR_PSD");
      expect(detectFileType("vector_brand.ai")).toBe("VECTOR_OR_PSD");
      expect(detectFileType("icon_pack.eps")).toBe("VECTOR_OR_PSD");
      expect(detectFileType("coreldraw_layout.cdr")).toBe("VECTOR_OR_PSD");
    });

    it("identifies documents as PDF_DOCUMENT", () => {
      expect(detectFileType("brand_guidelines.pdf")).toBe("PDF_DOCUMENT");
      expect(detectFileType("invoice", "application/pdf")).toBe("PDF_DOCUMENT");
    });
  });

  describe("Preview Proxy ID Sanitization & Traversal Defense", () => {
    function sanitizePreviewId(rawId: string): string {
      return path.basename(rawId).replace(/[^a-zA-Z0-9_.-]/g, "");
    }

    it("preserves valid UUIDs and safe identifiers", () => {
      const validUuid = "d4ff16b6-800e-4045-b1fd-14e780692c16";
      expect(sanitizePreviewId(validUuid)).toBe(validUuid);
      expect(sanitizePreviewId("wm_order_123.jpg")).toBe("wm_order_123.jpg");
    });

    it("strips path traversal patterns", () => {
      expect(sanitizePreviewId("../../etc/passwd")).toBe("passwd");
      expect(sanitizePreviewId("..\\..\\windows\\system32")).toBe("system32");
      expect(sanitizePreviewId("uploads/previews/file.jpg")).toBe("file.jpg");
    });
  });

  describe("WatermarkService (Top-Left Minimalist Translucent Pill)", () => {
    it("generates a clean watermarked image with top-left pill and proper dimensions", async () => {
      const { WatermarkService } = await import("@/server/media/watermark.service");
      const sharp = (await import("sharp")).default;

      // Create a test 600x400 PNG buffer
      const testInput = await sharp({
        create: {
          width: 600,
          height: 400,
          channels: 3,
          background: { r: 240, g: 240, b: 240 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await WatermarkService.applyWatermark(testInput, {
        username: "budi.designer",
        maxPx: 1200,
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType).toBe("image/jpeg");
      expect(result.width).toBe(600);
      expect(result.height).toBe(400);

      // Verify resulting image metadata
      const meta = await sharp(result.buffer).metadata();
      expect(meta.format).toBe("jpeg");
      expect(meta.width).toBe(600);
      expect(meta.height).toBe(400);
    });

    it("resizes images exceeding maxPx preserving aspect ratio", async () => {
      const { WatermarkService } = await import("@/server/media/watermark.service");
      const sharp = (await import("sharp")).default;

      // Create a 2000x1000 input
      const largeInput = await sharp({
        create: {
          width: 2000,
          height: 1000,
          channels: 3,
          background: { r: 50, g: 50, b: 50 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await WatermarkService.applyWatermark(largeInput, {
        username: "pro_artist",
        maxPx: 1000,
      });

      expect(result.width).toBe(1000);
      expect(result.height).toBe(500);
    });
  });
});
