import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import {
  handleApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";
import {
  validateProductPrice,
  validateProductExternalUrl,
  PRODUCT_REFUND_POLICY_TEXT,
} from "@/lib/constants/products";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    const currentUserId = session?.userId;
    const isAdmin = Boolean(session?.isAdmin);

    const product = await prisma.product.findUnique({
      where: { id: params.id },
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
    });

    if (!product || product.deletedAt) {
      throw new NotFoundError("Produk premade tidak ditemukan atau telah dihapus");
    }

    const isOwner = product.designerId === currentUserId;

    // Jika produk disembunyikan admin (HIDDEN), hanya admin dan pemilik yang bisa akses
    if (product.status === "HIDDEN" && !isOwner && !isAdmin) {
      throw new NotFoundError("Produk premade sedang dalam moderasi");
    }

    // Periksa apakah user yang login sudah memiliki hak akses pembelian
    let hasPurchased = false;
    if (currentUserId) {
      const purchase = await prisma.productPurchase.findFirst({
        where: { productId: product.id, buyerId: currentUserId },
      });
      hasPurchased = Boolean(purchase);
    }

    const hasAccess = isOwner || isAdmin || hasPurchased;

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        designerId: product.designerId,
        title: product.title,
        description: product.description,
        category: product.category,
        price: product.price,
        status: product.status,
        sourceType: product.sourceType,
        fileExtension: product.fileExtension,
        fileSizeBytes: product.fileSizeBytes,
        downloadCount: product.downloadCount,
        hasAccess,
        isOwner,
        hasPurchased,
        refundPolicy: PRODUCT_REFUND_POLICY_TEXT,
        previewUrl: product.previewAsset?.id
          ? `/api/previews/${product.previewAsset.id}`
          : product.previewAsset?.driveFileId,
        designer: {
          id: product.designer.user.id,
          displayName: product.designer.user.displayName,
          username: product.designer.user.username,
          avatarUrl: product.designer.user.avatarUrl,
          isVerified: product.designer.isVerified,
        },
        createdAt: product.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundError("Produk tidak ditemukan");
    }

    const isOwner = product.designerId === session.userId;
    const isAdmin = Boolean(session.isAdmin);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError("Kamu tidak memiliki hak untuk mengedit produk ini");
    }

    const body = await req.json();
    const { title, description, category, price, isFree, externalUrl } = body;

    const dataToUpdate: any = {};

    if (title !== undefined) {
      const cleanTitle = sanitizeInput(title).slice(0, 150);
      if (!cleanTitle) throw new ValidationError("Judul produk tidak boleh kosong");
      dataToUpdate.title = cleanTitle;
    }

    if (description !== undefined) {
      const cleanDesc = sanitizeInput(description).slice(0, 3000);
      if (!cleanDesc) throw new ValidationError("Deskripsi produk tidak boleh kosong");
      dataToUpdate.description = cleanDesc;
    }

    if (category !== undefined) {
      dataToUpdate.category = sanitizeInput(category).slice(0, 50);
    }

    if (price !== undefined || isFree !== undefined) {
      const priceValidation = validateProductPrice(price, Boolean(isFree));
      if (!priceValidation.isValid || priceValidation.value === undefined) {
        throw new ValidationError(priceValidation.error || "Harga produk tidak valid");
      }
      dataToUpdate.price = priceValidation.value;
    }

    if (externalUrl !== undefined && product.sourceType === "EXTERNAL_LINK") {
      const linkValidation = validateProductExternalUrl(externalUrl);
      if (!linkValidation.isValid || !linkValidation.normalizedUrl) {
        throw new ValidationError(linkValidation.error || "Tautan eksternal tidak valid");
      }
      dataToUpdate.externalUrl = linkValidation.normalizedUrl;
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      message: "Produk premade berhasil diperbarui",
      product: updated,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundError("Produk tidak ditemukan");
    }

    const isOwner = product.designerId === session.userId;
    const isAdmin = Boolean(session.isAdmin);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError("Kamu tidak memiliki hak untuk menghapus produk ini");
    }

    // Soft Delete: pembeli yang sudah ada tetap memiliki akses ke file riwayat mereka
    await prisma.product.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Produk premade berhasil dihapus",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
