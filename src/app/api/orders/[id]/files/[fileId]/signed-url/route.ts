import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { createSignedUrl } from "@/lib/signed-url";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      throw new NotFoundError("Pesanan tidak ditemukan");
    }

    const isCustomer = order.customerId === session.userId;
    const isDesigner = order.designerId === session.userId;
    const isAdmin = Boolean(session.isAdmin);

    if (!isCustomer && !isDesigner && !isAdmin) {
      throw new ForbiddenError("Kamu tidak memiliki hak akses untuk file pesanan ini");
    }

    if (isCustomer && order.status !== "COMPLETED" && !isAdmin) {
      throw new ForbiddenError("File master pesanan hanya dapat diakses setelah pesanan selesai");
    }

    const deliveryFile = await prisma.deliveryFile.findFirst({
      where: {
        id: params.fileId,
        delivery: { orderId: order.id },
      },
    });

    if (!deliveryFile) {
      throw new NotFoundError("File deliverable tidak ditemukan");
    }

    // Buat tautan signed URL dengan masa berlaku 1 jam (3600 detik)
    const downloadPath = `/api/orders/${order.id}/files/${deliveryFile.id}/download`;
    const signedUrl = createSignedUrl(downloadPath, { expiresInSeconds: 3600 });

    return NextResponse.json({
      success: true,
      signedUrl,
      expiresInSeconds: 3600,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
