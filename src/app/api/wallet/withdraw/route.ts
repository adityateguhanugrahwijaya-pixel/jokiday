import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { handleApiError, ValidationError, ConflictError, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk melakukan penarikan saldo");
    }

    const body = await req.json();
    const { amount, method, destination } = body;

    const minWithdrawalCfg = await prisma.appConfig.findUnique({
      where: { key: "min_withdrawal" },
    });
    const minWithdrawal = minWithdrawalCfg
      ? parseInt(minWithdrawalCfg.value, 10) || 5000
      : 5000;

    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum < minWithdrawal) {
      throw new ValidationError(`Batas minimal penarikan saldo adalah Rp ${minWithdrawal.toLocaleString("id-ID")}`);
    }

    const cleanMethod = method === "EWALLET" ? "EWALLET" : "BANK";
    const cleanDestination: Record<string, string> = {};
    if (destination && typeof destination === "object") {
      for (const [k, v] of Object.entries(destination)) {
        if (typeof v === "string") {
          cleanDestination[sanitizeInput(k).slice(0, 50)] = sanitizeInput(v).slice(0, 100);
        }
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { designerProfile: true },
    });

    if (!user) {
      throw new ValidationError("Pengguna tidak ditemukan");
    }

    // Hanya desainer (freelancer) dalam mode aktif desainer yang memiliki fitur penarikan saldo dompet mandiri
    if (!user.isDesigner || user.activeRole !== "DESIGNER") {
      throw new ForbiddenError(
        "Fitur penarikan saldo desainer hanya dapat diakses saat akun berada dalam Mode Desainer."
      );
    }

    const availableBalance = await LedgerService.getAvailableBalance(user.id);
    if (availableBalance < amountNum) {
      throw new ConflictError("Saldo dompet tidak mencukupi untuk penarikan ini");
    }

    // Cek konfigurasi auto payout dari admin
    const autoPayoutConfig = await prisma.appConfig.findUnique({
      where: { key: "auto_payout_verified" },
    });
    const isAutoPayoutEnabled = autoPayoutConfig?.value === "true";

    // Cek apakah desainer terverifikasi
    const isVerifiedDesigner = user.designerProfile?.isVerified === true;
    const canAutoConfirm = isAutoPayoutEnabled && isVerifiedDesigner;

    const withdrawalId = crypto.randomUUID();
    const idempotencyKey = `withdrawal-${withdrawalId}`;

    await prisma.$transaction(async (tx) => {
      // Simpan informasi rekening default desainer jika diminta
      if (body.saveAsDefault && cleanDestination.bankName && cleanDestination.accountNumber) {
        await tx.designerProfile.upsert({
          where: { userId: user.id },
          update: {
            payoutBank: cleanDestination.bankName,
            payoutAccount: cleanDestination.accountNumber,
            payoutHolderName: cleanDestination.accountHolder || user.displayName,
          },
          create: {
            userId: user.id,
            bio: "Desainer kreatif di JokiDay",
            categories: JSON.stringify(["logo"]),
            payoutBank: cleanDestination.bankName,
            payoutAccount: cleanDestination.accountNumber,
            payoutHolderName: cleanDestination.accountHolder || user.displayName,
          },
        });
      }

      // 1. Kunci saldo: Debit WALLET_AVAILABLE -> Kredit WITHDRAWAL_PENDING
      await LedgerService.recordWithdrawalRequested(
        user.id,
        amountNum,
        idempotencyKey,
        tx as any
      );

      // 2. Jika desainer terverifikasi dan auto-payout aktif -> langsung konfirmasi sukses
      if (canAutoConfirm) {
        await LedgerService.recordWithdrawalSuccess(
          user.id,
          amountNum,
          `auto-payout-success-${withdrawalId}`,
          tx as any
        );

        await tx.withdrawal.create({
          data: {
            id: withdrawalId,
            userId: user.id,
            amount: amountNum,
            method: cleanMethod,
            destination: JSON.stringify(cleanDestination),
            status: "SUCCESS",
            reviewedBy: "SYSTEM_AUTO_VERIFIED",
            reviewedAt: new Date(),
          },
        });
      } else {
        // Belum terverifikasi atau auto-confirm dimatikan admin -> status REQUESTED menunggu admin
        await tx.withdrawal.create({
          data: {
            id: withdrawalId,
            userId: user.id,
            amount: amountNum,
            method: cleanMethod,
            destination: JSON.stringify(cleanDestination),
            status: "REQUESTED",
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      withdrawalId,
      autoConfirmed: canAutoConfirm,
      message: canAutoConfirm
        ? "Penarikan otomatis disetujui untuk desainer terverifikasi dan dana sedang ditransfer."
        : "Permintaan penarikan saldo berhasil diajukan dan sedang menunggu pemeriksaan manual admin.",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
