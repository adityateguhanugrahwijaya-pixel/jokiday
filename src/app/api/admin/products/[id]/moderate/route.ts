import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { sanitizeInput } from "@/lib/security";
import {
  handleApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    if (!session.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang memiliki akses ke tindakan ini");
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      throw new NotFoundError("Produk tidak ditemukan");
    }

    const body = await req.json();
    const { action, reason } = body;

    const cleanReason = reason ? sanitizeInput(reason).slice(0, 500) : null;

    if (action === "HIDE") {
      if (!cleanReason) {
        throw new ValidationError("Harap sertakan alasan penyembunyian produk");
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          status: "HIDDEN",
          hiddenAt: new Date(),
          hiddenReason: cleanReason,
          hiddenBy: session.userId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Produk berhasil disembunyikan dari publik",
      });
    }

    if (action === "UNHIDE") {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          status: "PUBLISHED",
          hiddenAt: null,
          hiddenReason: null,
          hiddenBy: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Produk berhasil dipulihkan ke status aktif (PUBLISHED)",
      });
    }

    if (action === "DELETE") {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          deletedAt: new Date(),
          status: "ARCHIVED",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Produk berhasil dihapus (soft-delete)",
      });
    }

    throw new ValidationError("Aksi moderasi tidak valid. Pilihan: HIDE, UNHIDE, DELETE");
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
