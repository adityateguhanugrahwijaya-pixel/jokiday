import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";
import { WatermarkService } from "@/server/media/watermark.service";
import { DriveService } from "@/server/drive/drive.service";
import {
  validateProductPrice,
  validateProductExternalUrl,
  isAllowedProductFileExtension,
  PRODUCT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/products";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    const currentUserId = session?.userId;
    const isAdmin = Boolean(session?.isAdmin);

    const { searchParams } = new URL(req.url);
    const designerId = searchParams.get("designerId");
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "PUBLISHED";
    const q = searchParams.get("q")?.toLowerCase().trim();

    const where: any = {
      deletedAt: null,
    };

    if (designerId) {
      where.designerId = designerId;
    }

    if (category && category !== "all") {
      where.category = category;
    }

    // Hanya desainer pemilik atau admin yang dapat melihat status ARCHIVED / HIDDEN
    const isOwnerQuery = designerId && designerId === currentUserId;
    if (status === "ARCHIVED" || status === "HIDDEN") {
      if (!isOwnerQuery && !isAdmin) {
        throw new ForbiddenError("Kamu tidak memiliki hak untuk melihat produk dalam status ini");
      }
      where.status = status;
    } else {
      where.status = "PUBLISHED";
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        designer: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        previewAsset: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Ambil daftar ID produk yang sudah pernah dibeli oleh user yang login
    let purchasedProductIds = new Set<string>();
    if (currentUserId) {
      const myPurchases = await prisma.productPurchase.findMany({
        where: { buyerId: currentUserId },
        select: { productId: true },
      });
      purchasedProductIds = new Set(myPurchases.map((p) => p.productId));
    }

    // Sanitasi data publik: driveFileId dan externalUrl ASLI TIDAK BOLEH muncul di respons publik
    const sanitizedProducts = products.map((prod) => {
      const isOwner = prod.designerId === currentUserId;
      const hasPurchased = purchasedProductIds.has(prod.id);
      const hasAccess = isOwner || isAdmin || hasPurchased;

      return {
        id: prod.id,
        designerId: prod.designerId,
        title: prod.title,
        description: prod.description,
        category: prod.category,
        price: prod.price,
        status: prod.status,
        sourceType: prod.sourceType,
        fileExtension: prod.fileExtension,
        fileSizeBytes: prod.fileSizeBytes,
        downloadCount: prod.downloadCount,
        hasAccess,
        isOwner,
        hasPurchased,
        previewUrl: prod.previewAsset?.id
          ? `/api/previews/${prod.previewAsset.id}`
          : prod.previewAsset?.driveFileId,
        designer: {
          id: prod.designer.user.id,
          displayName: prod.designer.user.displayName,
          username: prod.designer.user.username,
          avatarUrl: prod.designer.user.avatarUrl,
          isVerified: prod.designer.isVerified,
        },
        createdAt: prod.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, products: sanitizedProducts });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        designerProfile: true,
        driveConnection: true,
      },
    });

    if (!user || !user.isDesigner || user.activeRole !== "DESIGNER" || !user.designerProfile) {
      throw new ForbiddenError("Hanya akun dalam mode Desainer yang dapat mengunggah produk premade");
    }

    const formData = await req.formData();
    const title = sanitizeInput((formData.get("title") as string) || "").slice(0, 150);
    const description = sanitizeInput((formData.get("description") as string) || "").slice(0, 3000);
    const category = sanitizeInput((formData.get("category") as string) || "template").slice(0, 50);
    const isFree = formData.get("isFree") === "true";
    const rawPrice = formData.get("price");
    const sourceType = (formData.get("sourceType") as string) || "EXTERNAL_LINK";
    const externalUrl = (formData.get("externalUrl") as string) || "";
    const copyrightAgreed = formData.get("copyrightAgreed") === "true";

    const coverFile = formData.get("coverFile") as File | null;
    const productFile = formData.get("productFile") as File | null;

    if (!title) {
      throw new ValidationError("Judul produk premade wajib diisi");
    }
    if (!description) {
      throw new ValidationError("Deskripsi produk premade wajib diisi");
    }
    if (!copyrightAgreed) {
      throw new ValidationError("Kamu wajib mencentang pernyataan kepemilikan hak cipta atas karya ini");
    }

    // 1. Validasi Harga
    const priceValidation = validateProductPrice(rawPrice, isFree);
    if (!priceValidation.isValid || priceValidation.value === undefined) {
      throw new ValidationError(priceValidation.error || "Harga produk tidak valid");
    }
    const finalPrice = priceValidation.value;

    // 2. Validasi Cover/Preview Image
    if (!coverFile) {
      throw new ValidationError("Gambar cover/pratinjau produk wajib diunggah");
    }
    const coverArrayBuf = await coverFile.arrayBuffer();
    const coverBuffer = Buffer.from(coverArrayBuf);

    const usernameSlug = user.displayName.toLowerCase().replace(/\s+/g, "_");
    const { buffer: watermarkedCover } = await WatermarkService.applyWatermark(
      coverBuffer,
      { username: usernameSlug, maxPx: 1200 }
    );

    // Simpan file preview di local uploads
    const coverAssetId = crypto.randomUUID();
    const coverFileName = `wm_prod_${coverAssetId}.jpg`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "previews");
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(path.join(uploadsDir, coverFileName), watermarkedCover);
    } catch (fsErr) {
      console.warn("[FS] Gagal simpan cover produk lokal:", fsErr);
    }

    // Buat PreviewAsset di database
    const previewAsset = await prisma.previewAsset.create({
      data: {
        id: coverAssetId,
        driveFileId: `/uploads/previews/${coverFileName}`,
        width: 1200,
        height: 1200,
      },
    });

    let savedDriveFileId: string | null = null;
    let savedExternalUrl: string | null = null;
    let fileExtension: string | null = null;
    let fileSizeBytes: number | null = null;

    // 3. Sumber File: Upload ke Google Drive vs Tempel Link
    if (sourceType === "DRIVE_FILE") {
      if (!user.driveConnection || user.driveConnection.status !== "ACTIVE") {
        throw new ValidationError(
          "Akun Google Drive belum terhubung. Silakan hubungkan Google Drive di menu Profil untuk mengunggah file langsung, atau gunakan opsi Tempel Link."
        );
      }

      if (!productFile) {
        throw new ValidationError("File aset digital produk wajib dipilih");
      }

      fileExtension = productFile.name.split(".").pop()?.toLowerCase() || null;
      if (!fileExtension || !isAllowedProductFileExtension(fileExtension)) {
        throw new ValidationError(
          `Ekstensi file .${fileExtension} tidak didukung. Ekstensi yang diperbolehkan: ZIP, RAR, 7Z, PSD, AI, EPS, PDF, SVG, PNG, JPG, FIG, XD, CDR`
        );
      }

      if (productFile.size > PRODUCT_MAX_FILE_SIZE_BYTES) {
        throw new ValidationError("Ukuran file produk maksimal 50 MB untuk upload langsung");
      }

      fileSizeBytes = productFile.size;

      // Unggah ke folder JokiDay/produk di Google Drive desainer
      try {
        const produkFolderId = await DriveService.getOrCreateProdukFolder(
          user.driveConnection.refreshTokenEnc
        );

        const prodArrayBuf = await productFile.arrayBuffer();
        const prodBuffer = Buffer.from(prodArrayBuf);

        const driveResult = await DriveService.uploadFile({
          refreshTokenEnc: user.driveConnection.refreshTokenEnc,
          folderId: produkFolderId,
          fileName: productFile.name,
          mimeType: productFile.type || "application/octet-stream",
          streamOrBuffer: prodBuffer,
        });

        savedDriveFileId = driveResult.fileId;
      } catch (driveErr: any) {
        throw new ValidationError(
          `Gagal mengunggah file ke Google Drive: ${driveErr.message || "Pastikan izin Google Drive masih aktif"}`
        );
      }
    } else {
      // Opsi EXTERNAL_LINK
      const linkValidation = validateProductExternalUrl(externalUrl);
      if (!linkValidation.isValid || !linkValidation.normalizedUrl) {
        throw new ValidationError(linkValidation.error || "Tautan eksternal tidak valid");
      }
      savedExternalUrl = linkValidation.normalizedUrl;

      // Tebak ekstensi dari URL jika ada
      try {
        const parsed = new URL(savedExternalUrl);
        const lastPart = parsed.pathname.split("/").pop() || "";
        if (lastPart.includes(".")) {
          fileExtension = lastPart.split(".").pop()?.toLowerCase() || null;
        } else if (parsed.hostname.includes("canva")) {
          fileExtension = "canva";
        } else if (parsed.hostname.includes("figma")) {
          fileExtension = "figma";
        }
      } catch {
        fileExtension = null;
      }
    }

    // 4. Simpan Produk ke Database
    const newProduct = await prisma.product.create({
      data: {
        designerId: user.id,
        title,
        description,
        category,
        price: finalPrice,
        status: "PUBLISHED",
        previewAssetId: previewAsset.id,
        sourceType,
        driveFileId: savedDriveFileId,
        externalUrl: savedExternalUrl,
        fileExtension,
        fileSizeBytes,
        downloadCount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Produk premade berhasil diterbitkan",
      product: {
        id: newProduct.id,
        title: newProduct.title,
        price: newProduct.price,
        category: newProduct.category,
        status: newProduct.status,
      },
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
