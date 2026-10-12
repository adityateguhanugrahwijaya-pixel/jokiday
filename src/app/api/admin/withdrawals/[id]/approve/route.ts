import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { handleApiError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError } from "@/lib/errors";

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
      throw new ForbiddenError("Hanya administrator yang dapat menyetujui penarikan saldo");
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: params.id },
    });

    if (!withdrawal) throw new NotFoundError("Permintaan penarikan tidak ditemukan");
    if (withdrawal.status !== "REQUESTED") {
      throw new ConflictError(`Penarikan sudah dalam status ${withdrawal.status}`);
    }

    const idempotencyKey = `admin-approve-withdrawal-${withdrawal.id}`;

    await prisma.$transaction(async (tx) => {
      // 1. Catat kas keluar di ledger: Debit WITHDRAWAL_PENDING -> Kredit GATEWAY_CLEARING
      await LedgerService.recordWithdrawalSuccess(
        withdrawal.userId,
        withdrawal.amount,
        idempotencyKey,
        tx as any
      );

      // 2. Update status withdrawal
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "SUCCESS",
          reviewedBy: "ADMIN_MANUAL",
          reviewedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Penarikan berhasil dikonfirmasi dan dicatat keluar.",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
