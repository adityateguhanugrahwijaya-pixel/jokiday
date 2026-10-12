import { prisma } from "@/lib/db";
import { AppError, ConflictError } from "@/lib/errors";
import crypto from "node:crypto";

export interface LedgerEntryItem {
  account: string;
  direction: "DEBIT" | "CREDIT";
  amount: number;
  orderId?: string | null;
  userId?: string | null;
  reason: string;
}

export class LedgerService {
  /**
   * Hitung fee 5% platform dan nominal bersih designer:
   * fee = floor(price * 5 / 100)
   * designerNet = price - fee
   */
  static calculatePlatformFee(price: number, feePercent = 5): { fee: number; designerNet: number } {
    if (price <= 0) return { fee: 0, designerNet: 0 };
    const fee = Math.floor((price * feePercent) / 100);
    const designerNet = price - fee;
    return { fee, designerNet };
  }

  /**
   * Catat transaksi jurnal double-entry.
   * Harus seimbang: Total Debit == Total Kredit.
   * Idempotent berdasarkan idempotencyKey.
   */
  static async recordTransaction(
    entries: LedgerEntryItem[],
    idempotencyKey: string,
    txClient = prisma
  ): Promise<{ txnId: string; entriesCount: number }> {
    if (!entries || entries.length === 0) {
      throw new AppError("Ledger transaction must contain at least one entry", "LEDGER_EMPTY", 400);
    }

    // Hitung total debit dan total kredit
    let totalDebit = 0;
    let totalCredit = 0;

    for (const e of entries) {
      if (e.amount <= 0 || !Number.isInteger(e.amount)) {
        throw new AppError(
          `Nominal ledger harus bilangan bulat positif (rupiah): ${e.amount}`,
          "LEDGER_INVALID_AMOUNT",
          400
        );
      }
      if (e.direction === "DEBIT") {
        totalDebit += e.amount;
      } else if (e.direction === "CREDIT") {
        totalCredit += e.amount;
      } else {
        throw new AppError(`Arah ledger harus DEBIT atau CREDIT: ${e.direction}`, "LEDGER_INVALID_DIRECTION", 400);
      }
    }

    if (totalDebit !== totalCredit) {
      throw new AppError(
        `Jurnal ledger tidak seimbang. Total Debit: ${totalDebit}, Total Kredit: ${totalCredit}`,
        "LEDGER_UNBALANCED",
        400
      );
    }

    // Cek idempotensi
    const rootKey = `${idempotencyKey}:0`;
    const existing = await txClient.ledgerEntry.findUnique({
      where: { idempotencyKey: rootKey },
    });
    if (existing) {
      return { txnId: existing.txnId, entriesCount: entries.length };
    }

    const txnId = crypto.randomUUID();

    // Simpan semua entri dalam satu transaksi
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const entryKey = `${idempotencyKey}:${i}`;
      await txClient.ledgerEntry.create({
        data: {
          txnId,
          account: e.account,
          direction: e.direction,
          amount: e.amount,
          orderId: e.orderId || null,
          userId: e.userId || null,
          reason: e.reason,
          idempotencyKey: entryKey,
        },
      });
    }

    return { txnId, entriesCount: entries.length };
  }

  /**
   * Hitung saldo tersedia user:
   * SUM(CREDIT WALLET_AVAILABLE:{userId}) - SUM(DEBIT WALLET_AVAILABLE:{userId})
   */
  static async getAvailableBalance(userId: string, txClient = prisma): Promise<number> {
    const account = `WALLET_AVAILABLE:${userId}`;
    const entries = await txClient.ledgerEntry.findMany({
      where: { account },
      select: { direction: true, amount: true },
    });

    let balance = 0;
    for (const e of entries) {
      if (e.direction === "CREDIT") {
        balance += e.amount;
      } else if (e.direction === "DEBIT") {
        balance -= e.amount;
      }
    }
    return Math.max(0, balance);
  }

  /**
   * Hitung saldo refund milik customer:
   * SUM(CREDIT REFUND_PAYABLE:{userId}) - SUM(DEBIT REFUND_PAYABLE:{userId})
   */
  static async getCustomerRefundBalance(userId: string, txClient = prisma): Promise<number> {
    const account = `REFUND_PAYABLE:${userId}`;
    const entries = await txClient.ledgerEntry.findMany({
      where: { account },
      select: { direction: true, amount: true },
    });

    let balance = 0;
    for (const e of entries) {
      if (e.direction === "CREDIT") {
        balance += e.amount;
      } else if (e.direction === "DEBIT") {
        balance -= e.amount;
      }
    }
    return Math.max(0, balance);
  }

  /**
   * Jurnal saat customer bayar sukses ke WaroengPay:
   * Debit: GATEWAY_CLEARING
   * Kredit: ESCROW:{orderId}
   */
  static async recordCustomerPayment(
    orderId: string,
    amount: number,
    idempotencyKey: string,
    txClient = prisma
  ) {
    const entries: LedgerEntryItem[] = [
      {
        account: "GATEWAY_CLEARING",
        direction: "DEBIT",
        amount,
        orderId,
        reason: `Pembayaran masuk dari customer untuk order ${orderId}`,
      },
      {
        account: `ESCROW:${orderId}`,
        direction: "CREDIT",
        amount,
        orderId,
        reason: `Dana ditahan escrow untuk order ${orderId}`,
      },
    ];

    return await this.recordTransaction(entries, idempotencyKey, txClient);
  }

  /**
   * Jurnal pembayaran customer dengan kombinasi saldo refund dan/atau gateway QRIS:
   * Misal total 200k: saldo refund 50k, QRIS 150k.
   * Debit: REFUND_PAYABLE:{userId} 50k
   * Debit: GATEWAY_CLEARING 150k
   * Kredit: ESCROW:{orderId} 200k
   */
  static async recordCustomerPaymentCompound(
    orderId: string,
    userId: string,
    balanceUsed: number,
    gatewayAmount: number,
    idempotencyKey: string,
    txClient = prisma
  ) {
    const totalOrderAmount = balanceUsed + gatewayAmount;
    if (totalOrderAmount <= 0) {
      throw new AppError("Total nominal pembayaran harus lebih besar dari 0", "INVALID_AMOUNT", 400);
    }

    if (balanceUsed > 0) {
      const currentRefundBalance = await this.getCustomerRefundBalance(userId, txClient);
      if (currentRefundBalance < balanceUsed) {
        throw new ConflictError("Saldo refund tidak mencukupi untuk pembayaran ini");
      }
    }

    const entries: LedgerEntryItem[] = [];

    if (balanceUsed > 0) {
      entries.push({
        account: `REFUND_PAYABLE:${userId}`,
        direction: "DEBIT",
        amount: balanceUsed,
        orderId,
        userId,
        reason: `Penggunaan saldo refund untuk pembayaran order ${orderId}`,
      });
    }

    if (gatewayAmount > 0) {
      entries.push({
        account: "GATEWAY_CLEARING",
        direction: "DEBIT",
        amount: gatewayAmount,
        orderId,
        reason: `Pembayaran QRIS gateway untuk order ${orderId}`,
      });
    }

    entries.push({
      account: `ESCROW:${orderId}`,
      direction: "CREDIT",
      amount: totalOrderAmount,
      orderId,
      reason: `Dana ditahan escrow untuk order ${orderId}`,
    });

    return await this.recordTransaction(entries, idempotencyKey, txClient);
  }

  /**
   * Jurnal saat order selesai disetujui (rilis dana ke designer):
   * Debit: ESCROW:{orderId} (price - fee) -> Kredit: WALLET_AVAILABLE:{designerId}
   * Debit: ESCROW:{orderId} (fee) -> Kredit: PLATFORM_REVENUE
   */
  static async recordOrderCompleted(
    orderId: string,
    designerId: string,
    price: number,
    idempotencyKey: string,
    txClient = prisma
  ) {
    const { fee, designerNet } = this.calculatePlatformFee(price);

    const entries: LedgerEntryItem[] = [
      {
        account: `ESCROW:${orderId}`,
        direction: "DEBIT",
        amount: designerNet,
        orderId,
        userId: designerId,
        reason: `Pelepasan dana escrow ke dompet designer untuk order ${orderId}`,
      },
      {
        account: `WALLET_AVAILABLE:${designerId}`,
        direction: "CREDIT",
        amount: designerNet,
        orderId,
        userId: designerId,
        reason: `Pendapatan bersih order ${orderId} selesai`,
      },
      {
        account: `ESCROW:${orderId}`,
        direction: "DEBIT",
        amount: fee,
        orderId,
        reason: `Potongan fee platform 5% untuk order ${orderId}`,
      },
      {
        account: "PLATFORM_REVENUE",
        direction: "CREDIT",
        amount: fee,
        orderId,
        reason: `Pendapatan fee platform 5% dari order ${orderId}`,
      },
    ];

    return await this.recordTransaction(entries, idempotencyKey, txClient);
  }

  /**
   * Jurnal saat order batal / refund penuh ke customer:
   * Debit: ESCROW:{orderId}
   * Kredit: REFUND_PAYABLE:{customerId}
   */
  static async recordOrderRefundFull(
    orderId: string,
    customerId: string,
    price: number,
    idempotencyKey: string,
    txClient = prisma
  ) {
    const entries: LedgerEntryItem[] = [
      {
        account: `ESCROW:${orderId}`,
        direction: "DEBIT",
        amount: price,
        orderId,
        userId: customerId,
        reason: `Pengembalian dana escrow untuk order ${orderId}`,
      },
      {
        account: `REFUND_PAYABLE:${customerId}`,
        direction: "CREDIT",
        amount: price,
        orderId,
        userId: customerId,
        reason: `Dana kembali untuk customer atas order ${orderId}`,
      },
    ];

    return await this.recordTransaction(entries, idempotencyKey, txClient);
  }

  /**
   * Jurnal saat dispute selesai dengan split persentase:
   * Designer terima X% (dipotong 5% fee), Customer terima (100 - X)% tanpa fee.
   */
  static async recordDisputeSplit(
    orderId: string,
    designerId: string,
    customerId: string,
    price: number,
    designerPercent: number,
    idempotencyKey: string,
    txClient = prisma
  ) {
    const designerGross = Math.floor((price * designerPercent) / 100);
    const { fee, designerNet } = this.calculatePlatformFee(designerGross);
    const customerRefund = price - designerGross;

    const entries: LedgerEntryItem[] = [];

    if (designerGross > 0) {
      entries.push({
        account: `ESCROW:${orderId}`,
        direction: "DEBIT",
        amount: designerNet,
        orderId,
        userId: designerId,
        reason: `Penyelesaian dispute (${designerPercent}%): bagian designer bersih`,
      });
      entries.push({
        account: `WALLET_AVAILABLE:${designerId}`,
        direction: "CREDIT",
        amount: designerNet,
        orderId,
        userId: designerId,
        reason: `Dana dispute split (${designerPercent}%) ke dompet designer`,
      });

      if (fee > 0) {
        entries.push({
          account: `ESCROW:${orderId}`,
          direction: "DEBIT",
          amount: fee,
          orderId,
          reason: `Fee platform 5% dari porsi designer pada dispute order ${orderId}`,
        });
        entries.push({
          account: "PLATFORM_REVENUE",
          direction: "CREDIT",
          amount: fee,
          orderId,
          reason: `Fee platform 5% porsi designer dispute order ${orderId}`,
        });
      }
    }

    if (customerRefund > 0) {
      entries.push({
        account: `ESCROW:${orderId}`,
        direction: "DEBIT",
        amount: customerRefund,
        orderId,
        userId: customerId,
        reason: `Pengembalian dana sisa dispute (${100 - designerPercent}%) ke customer`,
      });
      entries.push({
        account: `REFUND_PAYABLE:${customerId}`,
        direction: "CREDIT",
        amount: customerRefund,
        orderId,
        userId: customerId,
        reason: `Dana kembali dispute ke customer atas order ${orderId}`,
      });
    }

    return await this.recordTransaction(entries, idempotencyKey, txClient);
  }

  /**
   * Jurnal saat penarikan saldo diajukan:
   * Debit: WALLET_AVAILABLE:{userId}
   * Kredit: WITHDRAWAL_PENDING:{userId}
   */
  static async recordWithdrawalRequested(
    userId: string,
    amount: number,
    idempotencyKey: string,
    txClient = prisma
  ) {
    const currentBalance = await this.getAvailableBalance(userId, txClient);
    if (currentBalance < amount) {
      throw new ConflictError("Saldo tidak mencukupi untuk penarikan ini");
    }

    const entries: LedgerEntryItem[] = [
      {
        account: `WALLET_AVAILABLE:${userId}`,
        direction: "DEBIT",
        amount,
        userId,
        reason: `Permintaan penarikan saldo diajukan`,
      },
      {
        account: `WITHDRAWAL_PENDING:${userId}`,
        direction: "CREDIT",
        amount,
        userId,
        reason: `Penarikan saldo sedang diproses`,
      },
    ];

    return await this.recordTransaction(entries, idempotencyKey, txClient);
  }

  /**
   * Jurnal saat penarikan saldo berhasil ditransfer ke rekening designer:
   * Debit: WITHDRAWAL_PENDING:{userId}
   * Kredit: GATEWAY_CLEARING
   */
  static async recordWithdrawalSuccess(
    userId: string,
    amount: number,
    idempotencyKey: string,
    txClient = prisma
  ) {
    const entries: LedgerEntryItem[] = [
      {
        account: `WITHDRAWAL_PENDING:${userId}`,
        direction: "DEBIT",
        amount,
        userId,
        reason: `Penarikan saldo berhasil dicairkan`,
      },
      {
        account: "GATEWAY_CLEARING",
        direction: "CREDIT",
        amount,
        userId,
        reason: `Kas keluar untuk penarikan saldo user`,
      },
    ];

    return await this.recordTransaction(entries, idempotencyKey, txClient);
  }

  /**
   * Jurnal saat penarikan saldo gagal (kembalikan ke dompet):
   * Debit: WITHDRAWAL_PENDING:{userId}
   * Kredit: WALLET_AVAILABLE:{userId}
   */
  static async recordWithdrawalFailed(
    userId: string,
    amount: number,
    idempotencyKey: string,
    txClient = prisma
  ) {
    const entries: LedgerEntryItem[] = [
      {
        account: `WITHDRAWAL_PENDING:${userId}`,
        direction: "DEBIT",
        amount,
        userId,
        reason: `Penarikan saldo gagal, dikembalikan ke dompet`,
      },
      {
        account: `WALLET_AVAILABLE:${userId}`,
        direction: "CREDIT",
        amount,
        userId,
        reason: `Pengembalian dana penarikan yang gagal ke dompet`,
      },
    ];

    return await this.recordTransaction(entries, idempotencyKey, txClient);
  }
}
