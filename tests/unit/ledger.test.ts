import { describe, it, expect, beforeEach } from "vitest";
import { LedgerService } from "../../src/server/ledger/ledger.service";
import { prisma } from "../../src/lib/db";
import crypto from "node:crypto";

describe("Ledger Service - Business Rules & Double-Entry Accounting", () => {

  it("calculates platform fee correctly: 50.000 -> 47.500 (designer) + 2.500 (fee)", () => {
    const { fee, designerNet } = LedgerService.calculatePlatformFee(50000, 5);
    expect(fee).toBe(2500);
    expect(designerNet).toBe(47500);
    expect(fee + designerNet).toBe(50000);
  });

  it("calculates platform fee with floor for odd numbers: 100.001 -> fee 5.000, net 95.001", () => {
    const { fee, designerNet } = LedgerService.calculatePlatformFee(100001, 5);
    expect(fee).toBe(Math.floor((100001 * 5) / 100)); // 5000
    expect(designerNet).toBe(100001 - 5000); // 95001
    expect(fee + designerNet).toBe(100001);
  });

  it("rejects unbalanced journal entries (Debit != Credit)", async () => {
    const unbalancedEntries = [
      {
        account: "GATEWAY_CLEARING",
        direction: "DEBIT" as const,
        amount: 50000,
        reason: "Test debit",
      },
      {
        account: "ESCROW:test-order",
        direction: "CREDIT" as const,
        amount: 40000, // Unbalanced!
        reason: "Test credit",
      },
    ];

    await expect(
      LedgerService.recordTransaction(unbalancedEntries, "unbalanced-key-" + Date.now())
    ).rejects.toThrow(/tidak seimbang/i);
  });

  it("records customer payment correctly (Debit GATEWAY_CLEARING, Credit ESCROW)", async () => {
    const orderId = crypto.randomUUID();
    const key = "pay-key-" + orderId;
    await LedgerService.recordCustomerPayment(orderId, 50000, key);

    const entries = await prisma.ledgerEntry.findMany({
      where: { orderId },
    });

    expect(entries).toHaveLength(2);
    const debit = entries.find((e) => e.direction === "DEBIT");
    const credit = entries.find((e) => e.direction === "CREDIT");

    expect(debit?.account).toBe("GATEWAY_CLEARING");
    expect(debit?.amount).toBe(50000);
    expect(credit?.account).toBe(`ESCROW:${orderId}`);
    expect(credit?.amount).toBe(50000);

    await prisma.ledgerEntry.deleteMany({ where: { orderId } });
  });

  it("records completed order release and platform fee with exact balanced entries", async () => {
    const orderId = crypto.randomUUID();
    const designerId = crypto.randomUUID();
    const price = 50000;

    // 1. Bayar dulu ke escrow
    await LedgerService.recordCustomerPayment(orderId, price, "pay-" + orderId);

    // 2. Selesai order
    await LedgerService.recordOrderCompleted(orderId, designerId, price, "complete-" + orderId);

    const balance = await LedgerService.getAvailableBalance(designerId);
    expect(balance).toBe(47500);

    const platformEntries = await prisma.ledgerEntry.findMany({
      where: { account: "PLATFORM_REVENUE", orderId },
    });
    expect(platformEntries).toHaveLength(1);
    expect(platformEntries[0].amount).toBe(2500);
    expect(platformEntries[0].direction).toBe("CREDIT");

    await prisma.ledgerEntry.deleteMany({ where: { orderId } });
  });

  it("records full refund correctly without charging platform fee", async () => {
    const orderId = crypto.randomUUID();
    const customerId = crypto.randomUUID();
    const price = 50000;

    await LedgerService.recordCustomerPayment(orderId, price, "pay-" + orderId);
    await LedgerService.recordOrderRefundFull(orderId, customerId, price, "refund-" + orderId);

    const refundEntries = await prisma.ledgerEntry.findMany({
      where: { account: `REFUND_PAYABLE:${customerId}` },
    });
    expect(refundEntries).toHaveLength(1);
    expect(refundEntries[0].amount).toBe(50000);
    expect(refundEntries[0].direction).toBe("CREDIT");

    await prisma.ledgerEntry.deleteMany({ where: { orderId } });
  });

  it("handles dispute split correctly: 60% designer, 40% customer", async () => {
    const orderId = crypto.randomUUID();
    const designerId = crypto.randomUUID();
    const customerId = crypto.randomUUID();
    const price = 100000;

    await LedgerService.recordCustomerPayment(orderId, price, "pay-" + orderId);
    await LedgerService.recordDisputeSplit(orderId, designerId, customerId, price, 60, "dispute-" + orderId);

    // Designer gross: 60.000. Fee 5% of 60.000 = 3.000. Designer net = 57.000.
    const designerBalance = await LedgerService.getAvailableBalance(designerId);
    expect(designerBalance).toBe(57000);

    // Customer refund: 40.000
    const refundEntries = await prisma.ledgerEntry.findMany({
      where: { account: `REFUND_PAYABLE:${customerId}` },
    });
    expect(refundEntries[0].amount).toBe(40000);

    // Platform fee: 3.000
    const platformEntries = await prisma.ledgerEntry.findMany({
      where: { account: "PLATFORM_REVENUE", orderId },
    });
    expect(platformEntries[0].amount).toBe(3000);

    await prisma.ledgerEntry.deleteMany({ where: { orderId } });
  });

  it("guarantees idempotency: same key returns previous transaction without duplication", async () => {
    const orderId = crypto.randomUUID();
    const key = "idempotent-key-" + orderId;

    const res1 = await LedgerService.recordCustomerPayment(orderId, 50000, key);
    const res2 = await LedgerService.recordCustomerPayment(orderId, 50000, key);

    expect(res1.txnId).toBe(res2.txnId);

    const count = await prisma.ledgerEntry.count({
      where: { orderId },
    });
    expect(count).toBe(2); // Only 1 pair of debit/credit

    await prisma.ledgerEntry.deleteMany({ where: { orderId } });
  });

  it("handles partial payment: 200k order paid with 50k refund balance + 150k QRIS gateway", async () => {
    const customerId = crypto.randomUUID();
    const orderId1 = crypto.randomUUID();
    const orderId2 = crypto.randomUUID();

    // 1. Simulasikan customer dapat refund 50k dari order lama yang dibatalkan
    await LedgerService.recordCustomerPayment(orderId1, 50000, "pay-old-" + orderId1);
    await LedgerService.recordOrderRefundFull(orderId1, customerId, 50000, "refund-old-" + orderId1);

    const initialRefundBalance = await LedgerService.getCustomerRefundBalance(customerId);
    expect(initialRefundBalance).toBe(50000);

    // 2. Order baru sebesar 200k: 50k pakai saldo refund, 150k via QRIS gateway
    await LedgerService.recordCustomerPaymentCompound(
      orderId2,
      customerId,
      50000, // balance used
      150000, // gateway QRIS
      "pay-compound-" + orderId2
    );

    // 3. Verifikasi saldo refund customer sekarang 0 (karena sudah terpakai 50k)
    const remainingRefundBalance = await LedgerService.getCustomerRefundBalance(customerId);
    expect(remainingRefundBalance).toBe(0);

    // 4. Verifikasi akun Escrow untuk order 2 berisi penuh 200.000
    const escrowEntries = await prisma.ledgerEntry.findMany({
      where: { account: `ESCROW:${orderId2}` },
    });
    expect(escrowEntries).toHaveLength(1);
    expect(escrowEntries[0].amount).toBe(200000);
    expect(escrowEntries[0].direction).toBe("CREDIT");

    // 5. Verifikasi debet berimbang: REFUND_PAYABLE 50k + GATEWAY_CLEARING 150k
    const debitRefund = await prisma.ledgerEntry.findFirst({
      where: { account: `REFUND_PAYABLE:${customerId}`, orderId: orderId2 },
    });
    expect(debitRefund?.direction).toBe("DEBIT");
    expect(debitRefund?.amount).toBe(50000);

    const debitGateway = await prisma.ledgerEntry.findFirst({
      where: { account: "GATEWAY_CLEARING", orderId: orderId2 },
    });
    expect(debitGateway?.direction).toBe("DEBIT");
    expect(debitGateway?.amount).toBe(150000);

    await prisma.ledgerEntry.deleteMany({
      where: { orderId: { in: [orderId1, orderId2] } },
    });
  });

  it("handles 100% payment using refund balance when balance >= order price", async () => {
    const customerId = crypto.randomUUID();
    const orderId1 = crypto.randomUUID();
    const orderId2 = crypto.randomUUID();

    // Customer punya refund 100k
    await LedgerService.recordCustomerPayment(orderId1, 100000, "pay-old-" + orderId1);
    await LedgerService.recordOrderRefundFull(orderId1, customerId, 100000, "refund-old-" + orderId1);

    // Order baru hanya 70k, dibayar 100% pakai saldo refund (0 QRIS)
    await LedgerService.recordCustomerPaymentCompound(
      orderId2,
      customerId,
      70000,
      0,
      "pay-full-balance-" + orderId2
    );

    // Sisa saldo refund customer = 30k
    const remainingBalance = await LedgerService.getCustomerRefundBalance(customerId);
    expect(remainingBalance).toBe(30000);

    // Escrow terisi 70k
    const escrow = await prisma.ledgerEntry.findFirst({
      where: { account: `ESCROW:${orderId2}` },
    });
    expect(escrow?.amount).toBe(70000);
    expect(escrow?.direction).toBe("CREDIT");

    await prisma.ledgerEntry.deleteMany({
      where: { orderId: { in: [orderId1, orderId2] } },
    });
  });

  it("accumulates platform fee 5% and allows admin to withdraw platform balance", async () => {
    const adminId = crypto.randomUUID();
    const designerId = crypto.randomUUID();
    const orderId1 = crypto.randomUUID();
    const orderId2 = crypto.randomUUID();

    const initialBalance = await LedgerService.getPlatformBalance();
    const initialAllTime = await LedgerService.getTotalPlatformRevenueAllTime();
    const initialWithdrawn = await LedgerService.getTotalPlatformWithdrawnAllTime();

    // Order 1: 100.000 (fee 5.000)
    await LedgerService.recordCustomerPayment(orderId1, 100000, "pay-" + orderId1);
    await LedgerService.recordOrderCompleted(orderId1, designerId, 100000, "complete-" + orderId1);

    // Order 2: 200.000 (fee 10.000)
    await LedgerService.recordCustomerPayment(orderId2, 200000, "pay-" + orderId2);
    await LedgerService.recordOrderCompleted(orderId2, designerId, 200000, "complete-" + orderId2);

    // Total fee terkumpul bertambah 15.000
    const platformBalance = await LedgerService.getPlatformBalance();
    expect(platformBalance).toBe(initialBalance + 15000);

    const totalAllTime = await LedgerService.getTotalPlatformRevenueAllTime();
    expect(totalAllTime).toBe(initialAllTime + 15000);

    // Admin cairkan 10.000
    await LedgerService.recordPlatformWithdrawal(
      adminId,
      10000,
      "admin-withdraw-test-" + adminId,
      "Pencairan fee platform"
    );

    // Sisa saldo platform berkurang 10.000
    const remainingBalance = await LedgerService.getPlatformBalance();
    expect(remainingBalance).toBe(initialBalance + 5000);

    const totalWithdrawn = await LedgerService.getTotalPlatformWithdrawnAllTime();
    expect(totalWithdrawn).toBe(initialWithdrawn + 10000);

    // Gagal jika menarik melebihi saldo tersedia
    await expect(
      LedgerService.recordPlatformWithdrawal(adminId, remainingBalance + 1000, "admin-withdraw-exceed-" + adminId)
    ).rejects.toThrow(/tidak mencukupi/i);

    // Cleanup hanya data test yang dibuat (termasuk debet penarikan admin test)
    await prisma.ledgerEntry.deleteMany({
      where: {
        OR: [
          { orderId: { in: [orderId1, orderId2] } },
          { userId: adminId },
        ],
      },
    });
  });
});
