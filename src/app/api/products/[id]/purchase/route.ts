import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { getPaymentGateway } from "@/server/payment";
import { PushNotificationService } from "@/server/push/push.service";
import { getAppUrl } from "@/lib/app-url";
import {
  handleApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "@/lib/errors";
import crypto from "node:crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk mengakses atau membeli produk");
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        designer: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundError("Produk tidak ditemukan atau telah dihapus");
    }

    if (product.status === "HIDDEN" && !session.isAdmin) {
      throw new ForbiddenError("Produk sedang dalam moderasi dan tidak dapat diakses");
    }

    if (product.designerId === session.userId) {
      throw new ValidationError("Kamu adalah pemilik produk ini dan sudah memiliki akses penuh");
    }

    // Periksa apakah pengguna sudah pernah membeli/mengklaim produk ini
    const existingPurchase = await prisma.productPurchase.findFirst({
      where: {
        productId: product.id,
        buyerId: session.userId,
      },
    });

    if (existingPurchase) {
      return NextResponse.json({
        success: true,
        alreadyPurchased: true,
        message: "Kamu sudah memiliki produk ini",
        purchaseId: existingPurchase.id,
      });
    }

    // KASUS 1: Produk Gratis (Rp 0)
    if (product.price === 0) {
      const newPurchase = await prisma.$transaction(async (tx) => {
        const p = await tx.productPurchase.create({
          data: {
            productId: product.id,
            buyerId: session.userId,
            priceSnapshot: 0,
            feeSnapshot: 0,
            paymentMethod: "FREE",
          },
        });

        await tx.product.update({
          where: { id: product.id },
          data: { downloadCount: { increment: 1 } },
        });

        return p;
      });

      // Notifikasi in-app ke desainer tentang unduhan gratis
      (async () => {
        try {
          const buyer = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { displayName: true },
          });
          await PushNotificationService.notifyUser(product.designerId, {
            type: "PRODUCT_DOWNLOAD",
            title: "Produk Premade Diunduh!",
            body: `Pengguna ${buyer?.displayName || "Pelanggan"} baru saja mengunduh karya gratis "${product.title}".`,
            url: `/designer/${product.designer.user.username}`,
          });
        } catch (err) {
          console.warn("[Notif] Gagal kirim notifikasi unduh gratis:", err);
        }
      })();

      return NextResponse.json({
        success: true,
        paidDirectly: true,
        message: "Produk berhasil diklaim secara gratis",
        purchaseId: newPurchase.id,
      });
    }

    // KASUS 2: Produk Berbayar (price > 0)
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { useBalance = false } = body;

    // Cek saldo refund/dompet yang tersedia
    const availableRefundBalance = await LedgerService.getCustomerRefundBalance(session.userId);
    const balanceToUse = useBalance ? Math.min(availableRefundBalance, product.price) : 0;
    const remainingToPay = product.price - balanceToUse;

    // Subkasus 2A: 100% Lunas Menggunakan Saldo Refund
    if (remainingToPay === 0) {
      const idempotencyKey = `prod-pay-balance-${product.id}-${session.userId}-${Date.now()}`;

      const purchase = await prisma.$transaction(async (tx) => {
        // Catat mutasi ledger
        await LedgerService.recordProductPurchaseCompound(
          product.id,
          session.userId,
          product.designerId,
          balanceToUse,
          0,
          idempotencyKey,
          tx as any
        );

        // Catat record payment internal
        await tx.payment.create({
          data: {
            productId: product.id,
            buyerId: session.userId,
            gatewayRef: `INTERNAL-PROD-${crypto.randomUUID().slice(0, 8)}`,
            amount: 0,
            balanceUsed: balanceToUse,
            status: "PAID",
            checkoutUrl: "/purchases",
            paidAt: new Date(),
          },
        });

        // Catat pembelian produk
        const { fee } = LedgerService.calculatePlatformFee(product.price);
        const p = await tx.productPurchase.create({
          data: {
            productId: product.id,
            buyerId: session.userId,
            priceSnapshot: product.price,
            feeSnapshot: fee,
            paymentMethod: "BALANCE",
          },
        });

        // Tingkatkan hitungan unduhan
        await tx.product.update({
          where: { id: product.id },
          data: { downloadCount: { increment: 1 } },
        });

        return p;
      });

      // Kirim notifikasi pembayaran ke desainer
      (async () => {
        try {
          const buyer = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { displayName: true },
          });
          await PushNotificationService.notifyUser(product.designerId, {
            type: "PRODUCT_PURCHASED",
            title: "Produk Terjual!",
            body: `Selamat! Produk "${product.title}" telah dibeli oleh ${buyer?.displayName || "Pelanggan"}. Saldo langsung masuk ke dompetmu.`,
            url: `/designer/${product.designer.user.username}`,
          });
        } catch (err) {
          console.warn("[Notif] Gagal kirim notifikasi pembelian produk:", err);
        }
      })();

      return NextResponse.json({
        success: true,
        paidDirectly: true,
        balanceUsed: balanceToUse,
        remainingAmount: 0,
        purchaseId: purchase.id,
        message: "Pembelian produk berhasil diselesaikan menggunakan saldo",
      });
    }

    // Subkasus 2B: Memerlukan Pembayaran QRIS Gateway
    const gateway = getPaymentGateway();
    const baseUrl = getAppUrl();

    const callbackUrl = baseUrl.includes("localhost") || baseUrl.includes(":3000")
      ? "https://jokiday.agentkikir.cloud/api/webhooks/waroengpay"
      : `${baseUrl}/api/webhooks/waroengpay`;

    const redirectUrl = `${baseUrl}/purchases`;

    const charge = await gateway.createCharge({
      orderId: `PROD-${product.id}`,
      amount: remainingToPay,
      description: `Beli Desain: ${product.title.slice(0, 30)}`,
      redirectUrl,
      callbackUrl,
    });

    // Simpan pembayaran pending
    await prisma.payment.create({
      data: {
        productId: product.id,
        buyerId: session.userId,
        gatewayRef: charge.gatewayRef,
        amount: charge.amount,
        balanceUsed: balanceToUse,
        status: "PENDING",
        checkoutUrl: charge.checkoutUrl,
      },
    });

    return NextResponse.json({
      success: true,
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
