import { NextRequest, NextResponse } from "next/server";
import { getPaymentGateway } from "@/server/payment";
import { prisma } from "@/lib/db";
import { OrderStateMachine } from "@/server/orders/order.state-machine";
import { LedgerService } from "@/server/ledger/ledger.service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers: Record<string, string | undefined> = {
      "x-waroengpay-timestamp": req.headers.get("x-waroengpay-timestamp") || undefined,
      "x-signature": req.headers.get("x-signature") || undefined,
    };

    const gateway = getPaymentGateway();
    const validation = gateway.verifyWebhook(headers, rawBody);

    if (!validation.isValid || !validation.event) {
      logger.warn("WaroengPay webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { event } = validation;

    // Abaikan event livemode: false di production
    if (process.env.NODE_ENV === "production" && (event as any).livemode === false) {
      logger.info("Ignoring test-mode webhook in production");
      return NextResponse.json({ received: true });
    }

    if (event.event === "payment.paid") {
      const chargeId = event.data.id; // WRG-...

      // Cari payment record berdasarkan gatewayRef (WRG-...)
      const payment = await prisma.payment.findFirst({
        where: { gatewayRef: chargeId },
        include: { order: true },
      });

      if (!payment) {
        logger.warn(`Payment not found for WaroengPay charge ${chargeId}`);
        return NextResponse.json({ received: true });
      }

      // Validasi kecocokan nominal base_amount dengan tagihan gateway
      if (event.data.baseAmount && event.data.baseAmount !== payment.amount) {
        logger.error(
          `Nominal mismatch! Expected ${payment.amount}, got ${event.data.baseAmount} for charge ${chargeId}`
        );
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }

      // Hindari proses ganda (Idempotent)
      if (payment.status === "PAID") {
        return NextResponse.json({ received: true, alreadyProcessed: true });
      }

      // Eksekusi transisi order & jurnal ledger
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "PAID",
            paidAt: new Date(),
            rawWebhook: rawBody,
          },
        });

        // Catat dana masuk ke Escrow (kombinasi saldo refund dan QRIS)
        await LedgerService.recordCustomerPaymentCompound(
          payment.orderId,
          payment.order.customerId,
          payment.balanceUsed,
          payment.amount,
          `webhook-paid-${chargeId}`,
          tx as any
        );

        // Transisi status order ke IN_PROGRESS jika masih AWAITING_PAYMENT
        if (payment.order.status === "AWAITING_PAYMENT") {
          await OrderStateMachine.transitionOrder(
            payment.orderId,
            "PAYMENT_RECEIVED",
            { userId: "SYSTEM", role: "SYSTEM" }
          );
        }
      });

      logger.info(`Payment successfully processed for order ${payment.orderId}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("Error processing WaroengPay webhook", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
