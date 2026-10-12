import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { handleApiError, UnauthorizedError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk memeriksa saldo refund");
    }

    const refundBalance = await LedgerService.getCustomerRefundBalance(session.userId);

    return NextResponse.json({
      userId: session.userId,
      refundBalance,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
