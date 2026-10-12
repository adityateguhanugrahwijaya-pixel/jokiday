import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/crypto";
import { handleApiError, UnauthorizedError, NotFoundError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const conn = await prisma.driveConnection.findUnique({
      where: { userId: session.userId },
    });

    if (!conn) {
      throw new NotFoundError("Akun belum terhubung dengan Google Drive");
    }

    // Coba cabut token di Google (opsional jika token valid)
    try {
      const refreshToken = decryptToken(conn.refreshTokenEnc);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${refreshToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    } catch (revokeErr) {
      console.warn("[Google Drive] Revoke token warning:", revokeErr);
    }

    // Hapus koneksi dari database
    await prisma.driveConnection.delete({
      where: { userId: session.userId },
    });

    return NextResponse.json({
      success: true,
      message: "Koneksi Google Drive berhasil diputuskan",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
