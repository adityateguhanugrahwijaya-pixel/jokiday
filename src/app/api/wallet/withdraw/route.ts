import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { handleApiError, ValidationError, ConflictError, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";
import { MIN_WITHDRAWAL_AMOUNT, calculateWithdrawalFee } from "@/lib/constants/withdrawal";
import { getWithdrawalSettings } from "@/server/withdrawal/withdrawal-settings.service";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk melakukan penarikan saldo");
    }

    const body = await req.json();
    const { amount, method, destination } = body;

    const settings = await getWithdrawalSettings();
    const minWithdrawal = settings.minWithdrawal;

    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum < minWithdrawal) {
      throw new ValidationError(`Batas minimal penarikan saldo adalah Rp${minWithdrawal.toLocaleString("id-ID")}`);
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

    // Validasi biaya transfer & estimasi nominal diterima menggunakan dynamic settings
    const bankOrChannel = cleanDestination.bankName || "";
    const transferFee = calculateWithdrawalFee(bankOrChannel, settings);
    const netAmount = amountNum - transferFee;

    if (netAmount <= 0) {
      throw new ValidationError("Nominal penarikan setelah dikurangi biaya transfer tidak boleh Rp0 atau minus");
    }

    cleanDestination.transferFee = String(transferFee);
    cleanDestination.netAmount = String(netAmount);
    cleanDestination.snapshotFee = String(transferFee);
    cleanDestination.settingsSnapshot = JSON.stringify({
      minWithdrawal: settings.minWithdrawal,
      defaultFee: settings.defaultFee,
      calculatedAt: new Date().toISOString(),
    });

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

      // 2. Catat penarikan dalam status REQUESTED untuk verifikasi transfer manual oleh admin
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
    });

    return NextResponse.json({
      success: true,
      withdrawalId,
      message: "Permintaan penarikan saldo berhasil diajukan dan sedang menunggu pemeriksaan serta transfer oleh admin.",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
