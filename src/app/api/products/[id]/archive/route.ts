import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/errors";

export async function POST(
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
      throw new NotFoundError("Produk tidak ditemukan atau telah dihapus");
    }

    const isOwner = product.designerId === session.userId;
    const isAdmin = Boolean(session.isAdmin);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError("Kamu tidak memiliki hak untuk mengarsipkan produk ini");
    }

    let updatedStatus: "PUBLISHED" | "ARCHIVED";
    let archivedAt: Date | null;
    let message: string;

    if (product.status === "ARCHIVED") {
      // Pulihkan produk
      updatedStatus = "PUBLISHED";
      archivedAt = null;
      message = "Produk berhasil dipulihkan dan kembali tampil ke publik";
    } else {
      // Arsipkan produk
      updatedStatus = "ARCHIVED";
      archivedAt = new Date();
      message = "Produk berhasil diarsipkan dan disembunyikan dari publik";
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        status: updatedStatus,
        archivedAt,
      },
    });

    return NextResponse.json({
      success: true,
      message,
      product: {
        id: updated.id,
        status: updated.status,
        archivedAt: updated.archivedAt?.toISOString() || null,
      },
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
