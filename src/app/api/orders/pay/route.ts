import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentGateway } from "@/server/payment";
import { LedgerService } from "@/server/ledger/ledger.service";
import { OrderStateMachine } from "@/server/orders/order.state-machine";
import { handleApiError, NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { EmailService } from "@/server/email/email.service";
import { PushNotificationService } from "@/server/push/push.service";
import { RedisService } from "@/server/redis/redis.service";
import { getAppUrl } from "@/lib/app-url";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, useBalance = false } = body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { brief: true },
    });

    if (!order) throw new NotFoundError("Order tidak ditemukan");
    if (order.status !== "AWAITING_PAYMENT") {
      throw new ConflictError("Order ini sudah dibayar atau tidak dalam status menunggu pembayaran");
    }

    // Proteksi rate-limiting via RedisService (maks 10 request per menit)
    const rateCheck = await RedisService.rateLimit(`order-pay:${order.customerId}`, 10, 60);
    if (!rateCheck.allowed) {
      throw new ValidationError("Terlalu banyak permintaan pembayaran. Silakan tunggu beberapa detik.");
    }

    // Cek saldo refund customer yang tersedia dari pembatalan / sengketa sebelumnya
    const availableRefundBalance = await LedgerService.getCustomerRefundBalance(order.customerId);
    const balanceToUse = useBalance ? Math.min(availableRefundBalance, order.price) : 0;
    const remainingToPay = order.price - balanceToUse;

    // Skenario A: 100% lunas menggunakan saldo refund
    if (remainingToPay === 0) {
      await prisma.$transaction(async (tx) => {
        // Catat mutasi ledger: Debit REFUND_PAYABLE -> Kredit ESCROW
        await LedgerService.recordCustomerPaymentCompound(
          order.id,
          order.customerId,
          balanceToUse,
          0,
          `pay-full-balance-${order.id}`,
          tx as any
        );

        // Catat record payment internal
        await tx.payment.create({
          data: {
            orderId: order.id,
            gatewayRef: `INTERNAL-BALANCE-${order.id}`,
            amount: 0,
            balanceUsed: balanceToUse,
            status: "PAID",
            checkoutUrl: `/orders/${order.id}`,
            paidAt: new Date(),
          },
        });

        // Transisi status order ke IN_PROGRESS
        await OrderStateMachine.transitionOrder(
          order.id,
          "PAYMENT_RECEIVED",
          { userId: order.customerId, role: "CUSTOMER" }
        );
      });

      // Kirim notifikasi email dan push notification ke desainer secara asynchronous
      (async () => {
        try {
          const fullOrder = await prisma.order.findUnique({
            where: { id: order.id },
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
          await PushNotificationService.notifyUser(order.designerId, {
            type: "ORDER_PAID",
            title: "Pesanan Baru Lunas!",
            body: `Pelanggan ${fullOrder?.customer.displayName || "Pelanggan"} telah melunasi pembayaran untuk pesanan "${fullOrder?.brief.title}". Escrow terlindungi.`,
            url: `/orders/${order.id}`,
          });
        } catch (notifErr) {
          console.error("[Notification] Gagal kirim notifikasi pembayaran lunas:", notifErr);
        }
      })();

      return NextResponse.json({
        paidDirectly: true,
        balanceUsed: balanceToUse,
        remainingAmount: 0,
        checkoutUrl: `/orders/${order.id}`,
      });
    }

    // Skenario B: Partial payment (Saldo refund + sisa tagihan QRIS WaroengPay)
    const gateway = getPaymentGateway();
    const baseUrl = getAppUrl();
    const charge = await gateway.createCharge({
      orderId: order.id,
      amount: remainingToPay, // Tagihan QRIS hanya untuk sisa pembayaran
      description: `Escrow JokiDay (${order.brief.title})`,
      redirectUrl: `${baseUrl}/orders/${order.id}`,
      callbackUrl: `${baseUrl}/api/webhooks/waroengpay`,
    });

    // Simpan record payment dengan informasi potongan saldo
    await prisma.payment.create({
      data: {
        orderId: order.id,
        gatewayRef: charge.gatewayRef,
        amount: charge.amount, // Nominal QRIS
        balanceUsed: balanceToUse, // Saldo refund yang dipotong
        status: "PENDING",
        checkoutUrl: charge.checkoutUrl,
      },
    });

    return NextResponse.json({
      paidDirectly: false,
      balanceUsed: balanceToUse,
      remainingAmount: remainingToPay,
      checkoutUrl: charge.checkoutUrl,
      gatewayRef: charge.gatewayRef,
      qris: charge.qris,
      amount: charge.amount,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
