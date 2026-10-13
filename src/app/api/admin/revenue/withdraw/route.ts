import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { EmailService } from "@/server/email/email.service";
import {
  handleApiError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Autentikasi administrator diperlukan");
    }
    if (!session.isAdmin) {
      throw new ForbiddenError(
        "Hanya administrator yang memiliki wewenang untuk mencairkan saldo pendapatan platform"
      );
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { displayName: true, email: true },
    });

    const body = await req.json();
    const { amount, method, bankName, accountNumber, accountHolder, note } = body;

    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum < 10000) {
      throw new ValidationError("Batas minimal pencairan saldo platform adalah Rp10.000");
    }

    const cleanBank = sanitizeInput(String(bankName || "")).trim().slice(0, 50);
    const cleanAccount = sanitizeInput(String(accountNumber || "")).trim().slice(0, 50);
    const cleanHolder = sanitizeInput(String(accountHolder || "")).trim().slice(0, 100);
    const cleanNote = note ? sanitizeInput(String(note)).trim().slice(0, 200) : "Pencairan Saldo Platform";

    if (!cleanBank || !cleanAccount || !cleanHolder) {
      throw new ValidationError("Nama bank/e-wallet, nomor rekening, dan nama pemilik rekening wajib diisi");
    }

    const availableBalance = await LedgerService.getPlatformBalance();
    if (availableBalance < amountNum) {
      throw new ConflictError(
        `Saldo fee platform tidak mencukupi. Tersedia: Rp${availableBalance.toLocaleString("id-ID")}, Diminta: Rp${amountNum.toLocaleString("id-ID")}`
      );
    }

    const withdrawalId = crypto.randomUUID();
    const idempotencyKey = `platform-withdraw-${withdrawalId}`;

    await prisma.$transaction(async (tx) => {
      // 1. Catat di double-entry ledger: Debit PLATFORM_REVENUE -> Kredit GATEWAY_CLEARING
      await LedgerService.recordPlatformWithdrawal(
        session.userId,
        amountNum,
        idempotencyKey,
        `Pencairan fee platform ke ${cleanBank} ${cleanAccount} a.n. ${cleanHolder}`,
        tx as any
      );

      // 2. Simpan record di tabel Withdrawal dengan tanda isPlatformFee: true
      await tx.withdrawal.create({
        data: {
          id: withdrawalId,
          userId: session.userId,
          amount: amountNum,
          method: method === "EWALLET" ? "EWALLET" : "BANK",
          destination: JSON.stringify({
            bankName: cleanBank,
            accountNumber: cleanAccount,
            accountHolder: cleanHolder,
            note: cleanNote,
            isPlatformFee: true,
          }),
          status: "SUCCESS",
          reviewedBy: session.userId,
          reviewedAt: new Date(),
        },
      });

      // 3. Catat ke Audit Log
      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          action: "ADMIN_PLATFORM_WITHDRAWAL",
          entity: "withdrawal",
          entityId: withdrawalId,
          before: JSON.stringify({ platformBalanceBefore: availableBalance }),
          after: JSON.stringify({
            amount: amountNum,
            platformBalanceAfter: availableBalance - amountNum,
            bank: cleanBank,
            account: cleanAccount,
            holder: cleanHolder,
          }),
        },
      });
    });

    const remainingBalance = availableBalance - amountNum;

    // 4. Kirim notifikasi audit email otomatis ke aditya.teguhanugrahwijaya@gmail.com dan admin@jokiday.com
    EmailService.sendAdminWithdrawalNotification({
      withdrawalId,
      amount: amountNum,
      bankName: cleanBank,
      accountNumber: cleanAccount,
      accountHolder: cleanHolder,
      remainingBalance,
      adminName: adminUser?.displayName || session.email || "Administrator",
    }).catch((err) => {
      console.error("[EmailService] Gagal mengirim notifikasi email pencairan admin:", err);
    });

    return NextResponse.json({
      success: true,
      message: `Pencairan dana platform sebesar Rp${amountNum.toLocaleString("id-ID")} berhasil diproses ke ${cleanBank}.`,
      withdrawalId,
      remainingBalance,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
