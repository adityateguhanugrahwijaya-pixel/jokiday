import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { handleApiError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Autentikasi administrator diperlukan");
    }
    if (!session.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang dapat menolak penarikan saldo");
    }

    const body = await req.json().catch(() => ({}));
    const rawReason = body.reason || "Informasi rekening tujuan tidak valid";
    const reason = sanitizeInput(String(rawReason)).slice(0, 500);

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: params.id },
    });

    if (!withdrawal) throw new NotFoundError("Permintaan penarikan tidak ditemukan");
    if (withdrawal.status !== "REQUESTED") {
      throw new ConflictError(`Penarikan sudah dalam status ${withdrawal.status}`);
    }

    const idempotencyKey = `admin-reject-withdrawal-${withdrawal.id}`;

    await prisma.$transaction(async (tx) => {
      // 1. Kembalikan dana ke dompet desainer: Debit WITHDRAWAL_PENDING -> Kredit WALLET_AVAILABLE
      await LedgerService.recordWithdrawalFailed(
        withdrawal.userId,
        withdrawal.amount,
        idempotencyKey,
        tx as any
      );

      // 2. Update status withdrawal
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "FAILED",
          reviewedBy: "ADMIN_MANUAL",
          reviewedAt: new Date(),
          rejectionReason: reason,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Penarikan ditolak dan dana telah dikembalikan ke dompet desainer.",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
