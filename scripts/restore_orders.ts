import { prisma } from "../src/lib/db";
import { LedgerService } from "../src/server/ledger/ledger.service";
import crypto from "node:crypto";

async function run() {
  const customerId = "3809472d-f0b5-40c6-8526-88cf26884a1c"; // Anata Tiansty
  const designerId = "dff7585e-33ca-4ad3-9e48-57e229902f3c"; // Aditya Teguh Wijaya
  const order1Id = "e8bbc17a-9568-42e9-baf8-a9bb0120893f";
  const order2Id = crypto.randomUUID();
  const cancelledOrderId = crypto.randomUUID();

  // 1. Escrow Ledger untuk Order 1 (jika belum ada)
  const existingEscrow1 = await prisma.ledgerEntry.findFirst({
    where: { account: `ESCROW:${order1Id}` },
  });
  if (!existingEscrow1) {
    console.log("Recording escrow payment for Order 1 (Gtq)...");
    await LedgerService.recordCustomerPayment(
      order1Id,
      10000,
      `pay-escrow-${order1Id}`
    );
  }

  // 2. Order 2 (Desain Banner Promosi)
  const existingOrder2 = await prisma.order.findFirst({
    where: {
      customerId,
      brief: { title: "Desain Banner Promosi" },
    },
  });

  if (!existingOrder2) {
    console.log("Creating Order 2 (Desain Banner Promosi)...");
    const brief2 = await prisma.brief.create({
      data: {
        customerId,
        targetDesignerId: designerId,
        mode: "DIRECT",
        title: "Desain Banner Promosi",
        description: "Pembuatan banner promosi untuk kampanye media sosial",
        category: "Banner & Poster",
        revisionQuota: 2,
        desiredDeadlineDays: 2,
        budgetHint: 10000,
        status: "CLAIMED",
      },
    });

    const offer2 = await prisma.offer.create({
      data: {
        briefId: brief2.id,
        designerId,
        price: 10000,
        durationDays: 2,
        revisionQuota: 2,
        status: "ACCEPTED",
      },
    });

    const order2 = await prisma.order.create({
      data: {
        id: order2Id,
        briefId: brief2.id,
        offerId: offer2.id,
        customerId,
        designerId,
        status: "IN_PROGRESS",
        price: 10000,
        fee: 500,
        designerNet: 9500,
        durationDays: 2,
        revisionQuota: 2,
        revisionsUsed: 0,
        contractSnapshot: JSON.stringify({
          briefTitle: "Desain Banner Promosi",
          price: 10000,
          fee: 500,
          designerNet: 9500,
          durationDays: 2,
          revisionQuota: 2,
          designerName: "Aditya Teguh Wijaya",
          customerName: "Anata Tiansty",
        }),
        paymentExpiresAt: new Date(Date.now() + 86400000),
        paidAt: new Date(),
        deadlineAt: new Date(Date.now() + 2 * 86400000),
      },
    });

    await LedgerService.recordCustomerPayment(
      order2.id,
      10000,
      `pay-escrow-${order2.id}`
    );

    // Chat Thread & System message untuk order 2
    const thread2Id = `order_${order2.id}`;
    await prisma.chatThread.create({
      data: {
        id: thread2Id,
        customerId,
        designerId,
        orderId: order2.id,
        title: "Diskusi Desain: Desain Banner Promosi",
        lastMessage: "Pembayaran terverifikasi. Pesanan aktif dalam pengerjaan.",
        lastMessageAt: new Date(),
      },
    });

    await prisma.message.create({
      data: {
        threadId: thread2Id,
        senderId: customerId,
        type: "SYSTEM",
        body: `Pelanggan telah menyetujui tawaran sebesar Rp 10.000 untuk proyek "Desain Banner Promosi". Order resmi #${order2.id.slice(0, 8)} telah dibuat.`,
      },
    });
  }

  // 3. Saldo Refund Rp 10.000 untuk Customer Anata Tiansty
  // Kita buatkan brief & order REFUNDED resmi sehingga transaksinya memiliki rekam jejak
  const currentRefundBalance = await LedgerService.getCustomerRefundBalance(customerId);
  console.log("Current customer refund balance before credit:", currentRefundBalance);

  if (currentRefundBalance < 10000) {
    const missingRefund = 10000 - currentRefundBalance;
    console.log(`Crediting missing refund balance of Rp${missingRefund} to Anata Tiansty...`);

    const briefRefund = await prisma.brief.create({
      data: {
        customerId,
        mode: "MARKET",
        title: "Pesanan Desain Lama (Dibatalkan)",
        description: "Order yang dibatalkan dengan pengembalian dana penuh ke saldo refund customer",
        category: "Desain Grafis",
        status: "CLOSED",
      },
    });

    const offerRefund = await prisma.offer.create({
      data: {
        briefId: briefRefund.id,
        designerId,
        price: missingRefund,
        durationDays: 1,
        revisionQuota: 1,
        status: "ACCEPTED",
      },
    });

    await prisma.order.create({
      data: {
        id: cancelledOrderId,
        briefId: briefRefund.id,
        offerId: offerRefund.id,
        customerId,
        designerId,
        status: "REFUNDED",
        price: missingRefund,
        fee: 0,
        designerNet: 0,
        durationDays: 1,
        revisionQuota: 1,
        revisionsUsed: 0,
        cancelledReason: "Pembatalan order dengan pengembalian saldo refund ke akun pelanggan",
        paymentExpiresAt: new Date(),
        paidAt: new Date(Date.now() - 3600000),
        completedAt: new Date(),
      },
    });

    // 1. Simulasikan customer bayar ke escrow
    await LedgerService.recordCustomerPayment(
      cancelledOrderId,
      missingRefund,
      `pay-cancelled-${cancelledOrderId}`
    );

    // 2. Refund penuh dari escrow ke REFUND_PAYABLE customer
    await LedgerService.recordOrderRefundFull(
      cancelledOrderId,
      customerId,
      missingRefund,
      `refund-to-customer-${cancelledOrderId}`
    );
  }

  const finalRefundBalance = await LedgerService.getCustomerRefundBalance(customerId);
  const activeOrders = await prisma.order.findMany({
    where: { customerId, status: "IN_PROGRESS" },
    include: { brief: true },
  });

  console.log("=========================================");
  console.log("FINAL STATUS:");
  console.log("Customer Refund Balance:", finalRefundBalance);
  console.log("Active In-Progress Orders:", activeOrders.map(o => ({ id: o.id, title: o.brief.title, price: o.price, status: o.status })));
  console.log("=========================================");
}

run().catch(console.error);
