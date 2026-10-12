import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Autentikasi administrator diperlukan");
    }
    if (!session.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang dapat melihat pengaturan penarikan otomatis");
    }

    const config = await prisma.appConfig.findUnique({
      where: { key: "auto_payout_verified" },
    });
    return NextResponse.json({
      enabled: config?.value === "true",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Autentikasi administrator diperlukan");
    }
    if (!session.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang dapat mengubah pengaturan penarikan otomatis");
    }

    const body = await req.json();
    const { enabled } = body;

    const updated = await prisma.appConfig.upsert({
      where: { key: "auto_payout_verified" },
      update: { value: enabled ? "true" : "false" },
      create: {
        key: "auto_payout_verified",
        value: enabled ? "true" : "false",
        description: "Auto confirm penarikan untuk freelancer yang terverifikasi",
      },
    });

    return NextResponse.json({
      success: true,
      enabled: updated.value === "true",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
