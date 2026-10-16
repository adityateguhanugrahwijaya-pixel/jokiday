import { NextRequest, NextResponse } from "next/server";
import { getPaymentGateway } from "@/server/payment";
import { prisma } from "@/lib/db";
import { OrderStateMachine } from "@/server/orders/order.state-machine";
import { LedgerService } from "@/server/ledger/ledger.service";
import { EmailService } from "@/server/email/email.service";
import { PushNotificationService } from "@/server/push/push.service";
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

      if (payment.productId) {
        // Eksekusi pembelian produk premade
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "PAID",
              paidAt: new Date(),
              rawWebhook: rawBody,
            },
          });

          const product = await tx.product.findUnique({
            where: { id: payment.productId! },
            include: { designer: { include: { user: true } } },
          });

          if (!product || !payment.buyerId) return;

          // Catat transaksi pembukuan double-entry instan
          await LedgerService.recordProductPurchaseCompound(
            product.id,
            payment.buyerId,
            product.designerId,
            payment.balanceUsed,
            payment.amount,
            `webhook-prod-paid-${chargeId}`,
            tx as any
          );

          const { fee } = LedgerService.calculatePlatformFee(product.price);
          await tx.productPurchase.create({
            data: {
              productId: product.id,
              buyerId: payment.buyerId,
              priceSnapshot: product.price,
              feeSnapshot: fee,
              paymentMethod: "QRIS",
              paymentRef: chargeId,
            },
          });

          await tx.product.update({
            where: { id: product.id },
            data: { downloadCount: { increment: 1 } },
          });
        });

        // Kirim notifikasi ke desainer
        (async () => {
          try {
            const product = await prisma.product.findUnique({
              where: { id: payment.productId! },
              include: { designer: { include: { user: true } } },
            });
            if (product) {
              await PushNotificationService.notifyUser(product.designerId, {
                type: "PRODUCT_PURCHASED",
                title: "Produk Terjual (QRIS)!",
                body: `Produk "${product.title}" berhasil dibeli lewat QRIS. Saldo telah masuk ke dompetmu.`,
                url: `/designer/${product.designer.user.username}`,
              });
            }
          } catch (notifErr) {
            logger.error("Gagal kirim notifikasi pembelian produk ke desainer", notifErr);
          }
        })();

        logger.info(`Product purchase successfully processed for product ${payment.productId}`);
      } else if (payment.orderId && payment.order) {
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
            payment.orderId!,
            payment.order!.customerId,
            payment.balanceUsed,
            payment.amount,
            `webhook-paid-${chargeId}`,
            tx as any
          );

          // Transisi status order ke IN_PROGRESS jika masih AWAITING_PAYMENT
          if (payment.order!.status === "AWAITING_PAYMENT") {
            await OrderStateMachine.transitionOrder(
              payment.orderId!,
              "PAYMENT_RECEIVED",
              { userId: "SYSTEM", role: "SYSTEM" }
            );
          }
        });

        // Kirim notifikasi email ke desainer secara asynchronous tanpa memblokir respons webhook
        (async () => {
          try {
            const fullOrder = await prisma.order.findUnique({
              where: { id: payment.orderId! },
              include: {
                designer: { select: { email: true, displayName: true } },
                customer: { select: { displayName: true } },
                brief: { select: { title: true } },
              },
            });
            if (fullOrder?.designer?.email) {
              await EmailService.sendOrderPaidNotification({
                designerEmail: fullOrder.designer.email,
                designerName: fullOrder.designer.displayName,
                customerName: fullOrder.customer.displayName,
                orderId: fullOrder.id,
                briefTitle: fullOrder.brief.title,
                price: fullOrder.price,
                durationDays: fullOrder.durationDays,
              });
            }

            // Kirim In-App dan Web Push Notification (VAPID)
            await PushNotificationService.notifyUser(payment.order!.designerId, {
              type: "ORDER_PAID",
              title: "Pesanan Baru Lunas (QRIS)!",
              body: `Pembayaran untuk pesanan "${fullOrder?.brief.title || "Pesanan"}" telah berhasil diterima. Dana aman di Escrow JokiDay.`,
              url: `/orders/${payment.orderId}`,
            });
          } catch (notifErr) {
            logger.error("Gagal kirim notifikasi pembayaran ke desainer", notifErr);
          }
        })();

        logger.info(`Payment successfully processed for order ${payment.orderId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("Error processing WaroengPay webhook", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
