import { prisma } from "../src/lib/db";
import { LedgerService } from "../src/server/ledger/ledger.service";

async function cancelOrder() {
  const designerId = "dff7585e-33ca-4ad3-9e48-57e229902f3c"; // Aditya Teguh Wijaya
  const customerId = "3809472d-f0b5-40c6-8526-88cf26884a1c"; // Anata Tiansty

  const orders = await prisma.order.findMany({
    where: {
      designerId,
      customerId,
    },
    include: { brief: true },
    orderBy: { createdAt: "desc" },
  });

  console.log("Current Orders for Aditya & Anata:", orders.map(o => ({
    id: o.id,
    title: o.brief.title,
    status: o.status,
    price: o.price,
    createdAt: o.createdAt,
  })));

  // Cari order "Gtq" (atau order seharga 10.000 yang direfund)
  const orderToCancel = orders.find(o => o.brief.title === "Gtq" || o.id === "e8bbc17a-9568-42e9-baf8-a9bb0120893f");
  if (orderToCancel) {
    console.log(`Cancelling order ${orderToCancel.id} (${orderToCancel.brief.title})...`);
    await prisma.order.update({
      where: { id: orderToCancel.id },
      data: {
        status: "CANCELLED",
        cancelledReason: "Order dibatalkan dan dana sebesar Rp10.000 telah dialihkan ke saldo refund akun pelanggan.",
        completedAt: new Date(),
      },
    });

    // Update pesan sistem di thread chat terkait
    const threadId = `consult_${customerId}_${designerId}`;
    await prisma.chatThread.updateMany({
      where: {
        OR: [
          { id: threadId },
          { orderId: orderToCancel.id },
        ],
      },
      data: {
        lastMessage: "[Order Dibatalkan: Dana 100% dikembalikan ke saldo refund pelanggan]",
        lastMessageAt: new Date(),
      },
    });

    await prisma.message.create({
      data: {
        threadId,
        senderId: designerId,
        type: "SYSTEM",
        body: `Order #${orderToCancel.id.slice(0, 8)} ("${orderToCancel.brief.title}") telah dibatalkan. Dana sebesar Rp 10.000 telah masuk ke saldo refund pelanggan dan dapat langsung digunakan untuk pesanan lainnya.`,
      },
    });

    console.log("Order cancelled successfully!");
  } else {
    console.log("Order Gtq not found, checking active 10k orders to cancel...");
    const any10k = orders.find(o => o.price === 10000 && o.status !== "CANCELLED");
    if (any10k) {
      await prisma.order.update({
        where: { id: any10k.id },
        data: {
          status: "CANCELLED",
          cancelledReason: "Order dibatalkan dan dana sebesar Rp10.000 telah dialihkan ke saldo refund akun pelanggan.",
          completedAt: new Date(),
        },
      });
      console.log(`Order ${any10k.id} cancelled!`);
    }
  }

  const updatedOrders = await prisma.order.findMany({
    where: { designerId, customerId },
    include: { brief: true },
    orderBy: { createdAt: "desc" },
  });

  const refundBal = await LedgerService.getCustomerRefundBalance(customerId);

  console.log("=========================================");
  console.log("UPDATED ORDERS:");
  console.log(updatedOrders.map(o => ({
    id: o.id,
    title: o.brief.title,
    status: o.status,
    price: o.price,
  })));
  console.log("CUSTOMER REFUND BALANCE:", refundBal);
  console.log("=========================================");
}

cancelOrder().catch(console.error);
