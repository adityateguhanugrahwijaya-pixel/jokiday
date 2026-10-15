import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import {
  WithdrawalSettingsService,
} from "@/server/withdrawal/withdrawal-settings.service";

export async function GET() {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Sesi tidak valid. Silakan login kembali.");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, isAdmin: true, displayName: true, email: true },
    });

    if (!user || !user.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang memiliki akses ke pengaturan penarikan.");
    }

    const settings = await WithdrawalSettingsService.getSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Sesi tidak valid. Silakan login kembali.");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, isAdmin: true, displayName: true, email: true },
    });

    if (!user || !user.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang berhak mengubah pengaturan penarikan.");
    }

    const payload = await req.json();
    const updatedSettings = await WithdrawalSettingsService.updateSettings(
      {
        minWithdrawal: payload.minWithdrawal,
        defaultFee: payload.defaultFee,
        feeOverrides: payload.feeOverrides,
      },
      user.displayName || user.email,
      user.id
    );

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: "Pengaturan ketentuan dan biaya penarikan berhasil disimpan.",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
