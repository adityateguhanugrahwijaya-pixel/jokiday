import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { DriveService } from "@/server/drive/drive.service";
import {
  handleApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk mengunduh produk");
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        designer: {
          include: {
            user: {
              include: {
                driveConnection: true,
              },
            },
          },
        },
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundError("Produk tidak ditemukan atau telah dihapus");
    }

    const isOwner = product.designerId === session.userId;
    const isAdmin = Boolean(session.isAdmin);

    if (product.status === "HIDDEN" && !isOwner && !isAdmin) {
      throw new ForbiddenError("Produk sedang dalam proses moderasi dan tidak dapat diunduh");
    }

    // Periksa apakah pengguna sudah memiliki hak akses pembelian
    let purchase = await prisma.productPurchase.findFirst({
      where: {
        productId: product.id,
        buyerId: session.userId,
      },
    });

    // Jika produk GRATIS dan user belum punya record klaim, buat record klaim otomatis
    if (!purchase && product.price === 0 && !isOwner) {
      purchase = await prisma.productPurchase.create({
        data: {
          productId: product.id,
          buyerId: session.userId,
          priceSnapshot: 0,
          feeSnapshot: 0,
          paymentMethod: "FREE",
        },
      });

      await prisma.product.update({
        where: { id: product.id },
        data: { downloadCount: { increment: 1 } },
      });
    }

    const hasAccess = isOwner || isAdmin || Boolean(purchase);
    if (!hasAccess) {
      throw new ForbiddenError(
        "Kamu belum memiliki izin untuk mengunduh produk ini. Silakan beli atau klaim terlebih dahulu."
      );
    }

    const { searchParams } = new URL(req.url);
    const wantsJson = searchParams.get("json") === "true" || req.headers.get("accept")?.includes("application/json");

    // Opsi A: Berkas berupa tautan eksternal (Google Drive publik, Mega, Dropbox, Canva, Figma)
    if (product.sourceType === "EXTERNAL_LINK") {
      if (!product.externalUrl) {
        throw new NotFoundError("Tautan unduhan produk tidak ditemukan");
      }

      if (wantsJson) {
        return NextResponse.json({
          success: true,
          downloadType: "EXTERNAL_LINK",
          url: product.externalUrl,
          title: product.title,
        });
      }

      return NextResponse.redirect(product.externalUrl);
    }

    // Opsi B: Berkas tersimpan di Google Drive desainer (unduh via backend proxy)
    if (product.sourceType === "DRIVE_FILE") {
      if (!product.driveFileId) {
        throw new NotFoundError("File digital produk tidak ditemukan di server");
      }

      const driveConn = product.designer.user.driveConnection;
      if (!driveConn || driveConn.status !== "ACTIVE") {
        throw new ValidationError(
          "Akun Google Drive desainer sedang tidak aktif atau terputus. Silakan gunakan tombol Laporkan File Rusak agar desainer atau admin dapat memperbarui tautan."
        );
      }

      try {
        const { buffer, mimeType, fileName } = await DriveService.downloadFile(
          driveConn.refreshTokenEnc,
          product.driveFileId
        );

        const cleanSafeName = (fileName || `${product.title}.${product.fileExtension || "zip"}`)
          .replace(/[^\w\s.-]/gi, "_")
          .trim();

        return new NextResponse(buffer as any, {
          status: 200,
          headers: {
            "Content-Type": mimeType || "application/octet-stream",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(cleanSafeName)}"`,
            "Content-Length": String(buffer.length),
          },
        });
      } catch (err: any) {
        throw new NotFoundError(
          `Gagal mengunduh file dari Google Drive desainer: ${err.message || "File mungkin telah dipindahkan atau dihapus"}. Silakan laporkan jika kendala berlanjut.`
        );
      }
    }

    throw new ValidationError("Tipe sumber produk tidak dikenali");
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
