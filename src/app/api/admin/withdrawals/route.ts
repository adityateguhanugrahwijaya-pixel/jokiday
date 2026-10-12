import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Autentikasi administrator diperlukan");
    }
    if (!session.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang dapat melihat daftar penarikan saldo");
    }
    const withdrawals = await prisma.withdrawal.findMany({
      include: {
        user: {
          include: { designerProfile: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const autoPayoutConfig = await prisma.appConfig.findUnique({
      where: { key: "auto_payout_verified" },
    });

    return NextResponse.json({
      withdrawals,
      autoPayoutVerified: autoPayoutConfig?.value === "true",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
