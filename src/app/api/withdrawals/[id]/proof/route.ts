import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { DriveService } from "@/server/drive/drive.service";
import {
  handleApiError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Autentikasi diperlukan untuk melihat bukti transfer");
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: params.id },
    });

    if (!withdrawal) {
      throw new NotFoundError("Data penarikan tidak ditemukan");
    }

    // Hanya desainer bersangkutan atau admin yang diizinkan mengakses bukti transfer
    if (!session.isAdmin && withdrawal.userId !== session.userId) {
      throw new ForbiddenError("Anda tidak memiliki akses ke bukti transfer ini");
    }

    if (!withdrawal.proofUrl && !withdrawal.proofDriveId) {
      throw new NotFoundError("Bukti pembayaran belum tersedia untuk penarikan ini");
    }

    // Jika memiliki file ID Google Drive, coba ambil dan sajikan secara langsung (inline)
    if (withdrawal.proofDriveId) {
      try {
        const adminUser = await prisma.user.findFirst({
          where: {
            isAdmin: true,
            driveConnection: { status: "ACTIVE" },
          },
          include: { driveConnection: true },
        });

        if (adminUser?.driveConnection) {
          const fileData = await DriveService.downloadFile(
            adminUser.driveConnection.refreshTokenEnc,
            withdrawal.proofDriveId
          );

          return new NextResponse(new Uint8Array(fileData.buffer), {
            headers: {
              "Content-Type": fileData.mimeType,
              "Content-Disposition": `inline; filename="${fileData.fileName}"`,
              "Cache-Control": "private, max-age=3600",
            },
          });
        }
      } catch (driveErr) {
        console.warn("[Proof] Proxy download from Drive failed, falling back to URL:", driveErr);
      }
    }

    // Fallback: alihkan ke URL Google Drive langsung jika proxy gagal
    if (withdrawal.proofUrl) {
      return NextResponse.redirect(new URL(withdrawal.proofUrl));
    }

    throw new NotFoundError("Bukti transfer tidak dapat dimuat");
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
