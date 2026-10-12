import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Sesi telah berakhir. Silakan login kembali.");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { designerProfile: true },
    });

    if (!user || !user.isDesigner) {
      throw new ForbiddenError("Hanya akun desainer yang dapat mengatur rekening pencairan dana.");
    }

    const body = await req.json();
    const { bankName, accountNumber, accountHolder } = body;

    const cleanBank = sanitizeInput(bankName || "").slice(0, 100);
    const cleanAccount = sanitizeInput(accountNumber || "").replace(/[^0-9]/g, "").slice(0, 30);
    const cleanHolder = sanitizeInput(accountHolder || "").slice(0, 100);

    if (!cleanBank) {
      throw new ValidationError("Nama bank atau e-wallet wajib dipilih.");
    }
    if (!cleanAccount || cleanAccount.length < 5) {
      throw new ValidationError("Nomor rekening atau nomor HP e-wallet minimal 5 digit angka.");
    }
    if (!cleanHolder || cleanHolder.length < 3) {
      throw new ValidationError("Nama lengkap pemilik rekening wajib diisi.");
    }

    // Upsert informasi rekening ke designerProfile
    await prisma.designerProfile.upsert({
      where: { userId: user.id },
      update: {
        payoutBank: cleanBank,
        payoutAccount: cleanAccount,
        payoutHolderName: cleanHolder,
      },
      create: {
        userId: user.id,
        bio: "Desainer kreatif di JokiDay",
        categories: JSON.stringify(["logo"]),
        payoutBank: cleanBank,
        payoutAccount: cleanAccount,
        payoutHolderName: cleanHolder,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Informasi rekening pencairan berhasil disimpan.",
      payoutAccount: {
        bankName: cleanBank,
        accountNumber: cleanAccount,
        accountHolder: cleanHolder,
      },
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
