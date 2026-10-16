import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { sanitizeInput } from "@/lib/security";
import {
  handleApiError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
} from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk melaporkan produk");
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundError("Produk tidak ditemukan atau telah dihapus");
    }

    const body = await req.json();
    const reason = sanitizeInput(body.reason || "").slice(0, 1000);

    if (!reason || reason.trim().length < 5) {
      throw new ValidationError("Harap sertakan penjelasan kendala file secara jelas (minimal 5 karakter)");
    }

    const report = await prisma.productReport.create({
      data: {
        productId: product.id,
        reporterId: session.userId,
        reason: reason.trim(),
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Laporan kendala file berhasil dikirim. Tim admin JokiDay dan desainer terkait akan segera menindaklanjuti.",
      reportId: report.id,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
