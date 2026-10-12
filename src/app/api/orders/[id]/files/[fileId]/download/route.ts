import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { DriveService } from "@/server/drive/drive.service";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { verifySignedUrl } from "@/lib/signed-url";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    const hasValidSignature = verifySignedUrl(
      req.nextUrl.pathname,
      req.nextUrl.searchParams
    );

    if (!session && !hasValidSignature) {
      throw new UnauthorizedError(
        "Tautan unduhan tidak valid atau sesi login Anda telah berakhir"
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        designer: {
          include: { driveConnection: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundError("Pesanan tidak ditemukan");
    }

    if (session) {
      const isCustomer = order.customerId === session.userId;
      const isDesigner = order.designerId === session.userId;
      const isAdmin = Boolean(session.isAdmin);

      if (!isCustomer && !isDesigner && !isAdmin) {
        throw new ForbiddenError("Kamu tidak memiliki hak akses pada file pesanan ini");
      }

      // Customer hanya boleh mengunduh file master jika status order COMPLETED
      if (isCustomer && order.status !== "COMPLETED" && !isAdmin) {
        throw new ForbiddenError(
          "File master pesanan hanya dapat diunduh setelah pesanan berstatus Selesai (COMPLETED)"
        );
      }
    } else {
      // Jika menggunakan Signed URL, pastikan order sudah berstatus COMPLETED
      if (order.status !== "COMPLETED") {
        throw new ForbiddenError("Pesanan belum berstatus selesai");
      }
    }

    const deliveryFile = await prisma.deliveryFile.findFirst({
      where: {
        id: params.fileId,
        delivery: { orderId: order.id },
      },
    });

    if (!deliveryFile) {
      throw new NotFoundError("File deliverable tidak ditemukan pada pesanan ini");
    }

    const driveConnection = order.designer.driveConnection;
    if (!driveConnection || driveConnection.status !== "ACTIVE") {
      throw new NotFoundError(
        "Google Drive desainer tidak aktif atau terputus. Silakan hubungi desainer atau admin."
      );
    }

    // Streaming unduh dari Google Drive milik desainer
    const { buffer, mimeType, fileName } = await DriveService.downloadFile(
      driveConnection.refreshTokenEnc,
      deliveryFile.driveFileId
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          deliveryFile.fileName || fileName
        )}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
