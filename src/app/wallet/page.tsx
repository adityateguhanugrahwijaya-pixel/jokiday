import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { formatRupiah, formatDate, formatTime } from "@/lib/format";
import { Wallet, ShieldAlert, ArrowDownLeft, ArrowUpRight, ShieldCheck, AlertCircle, Building2, Smartphone, CheckCircle2 } from "lucide-react";
import { WithdrawalModalButton } from "./WithdrawalModalButton";
import { PayoutAccountCard } from "./PayoutAccountCard";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect("/login?redirect=/wallet");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { designerProfile: true },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.isAdmin) {
    redirect("/admin/withdrawals");
  }

  const role = user.activeRole || "CUSTOMER";

  // 1. TAMPILAN DOMPET PELANGGAN (CUSTOMER)
  if (role === "CUSTOMER") {
    const refundBalance = await LedgerService.getCustomerRefundBalance(user.id);

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        OR: [
          { account: `REFUND_BALANCE:${user.id}` },
          { userId: user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return (
      <AppShell role="CUSTOMER" displayName={user.displayName}>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text">
              Dompet Pelanggan
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Saldo kredit dan pengembalian dana yang dapat langsung Anda gunakan sebagai potongan transaksi pesanan desain berikutnya.
            </p>
          </div>

          {user.isDesigner && (
            <div className="p-4 bg-primary-soft/50 border border-primary/20 rounded-lg text-xs text-text flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                <span>Anda sedang berada dalam <strong>Mode Pelanggan</strong>. Untuk menarik penghasilan jasa desain ke rekening bank, silakan beralih ke Mode Desainer.</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card className="space-y-2 border-primary/20 bg-primary-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Saldo Refund / Kredit
                </span>
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div className="font-money text-2xl sm:text-3xl font-extrabold text-primary">
                {formatRupiah(refundBalance)}
              </div>
              <p className="text-xs text-text-muted">
                Dapat digunakan otomatis saat membayar pesanan desain baru.
              </p>
            </Card>

            <Card className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Keamanan Saldo
                </span>
                <ShieldCheck className="w-5 h-5 text-success" />
              </div>
              <div className="text-sm font-semibold text-text pt-1">
                Terverifikasi Otomatis
              </div>
              <p className="text-xs text-text-muted">
                Saldo refund tercatat secara aman di buku besar digital JokiDay dan tidak memiliki masa kedaluwarsa.
              </p>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-text">
              Riwayat Mutasi Saldo Pelanggan
            </h2>

            {ledgerEntries.length === 0 ? (
              <div className="bg-surface border border-border rounded-lg p-10 text-center text-text-muted text-sm">
                Belum ada mutasi saldo refund pada akun Anda.
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-soft border-b border-border text-xs text-text-muted uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Tanggal & Waktu</th>
                        <th className="py-3 px-4 font-semibold">Keterangan</th>
                        <th className="py-3 px-4 font-semibold">Tipe</th>
                        <th className="py-3 px-4 font-semibold text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {ledgerEntries.map((entry) => {
                        const isCredit = entry.direction === "CREDIT";
                        return (
                          <tr
                            key={entry.id}
                            className="hover:bg-background transition-colors"
                          >
                            <td className="py-3.5 px-4 text-xs text-text-muted">
                              {formatDate(entry.createdAt)} {formatTime(entry.createdAt)}
                            </td>
                            <td className="py-3.5 px-4 text-text font-medium">
                              {entry.reason}
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant={isCredit ? "success" : "neutral"}>
                                {isCredit ? "Masuk" : "Keluar"}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span
                                className={`font-money font-bold ${
                                  isCredit ? "text-success" : "text-text"
                                }`}
                              >
                                {isCredit ? "+" : "-"}
                                {formatRupiah(entry.amount)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  // 2. TAMPILAN DOMPET DESAINER (DESIGNER)
  if (!user.isDesigner) {
    return (
      <AppShell role="CUSTOMER" displayName={user.displayName}>
        <div className="max-w-md mx-auto text-center py-12 space-y-4">
          <h2 className="text-xl font-bold text-text">Akses Desainer Belum Aktif</h2>
          <p className="text-sm text-text-muted">Akun Anda saat ini terdaftar sebagai pelanggan.</p>
        </div>
      </AppShell>
    );
  }

  const designerId = user.id;
  const availableBalance = await LedgerService.getAvailableBalance(designerId);

  const activeOrders = await prisma.order.findMany({
    where: {
      designerId,
      status: {
        in: ["IN_PROGRESS", "AWAITING_APPROVAL", "REVISION", "DISPUTED"],
      },
    },
    select: { designerNet: true },
  });
  const escrowHeldBalance = activeOrders.reduce((sum, o) => sum + o.designerNet, 0);

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: designerId },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { account: `WALLET_AVAILABLE:${designerId}` },
        { userId: designerId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <AppShell role="DESIGNER" displayName={user.displayName}>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text">
              Dompet & Saldo Desainer
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Catatan pendapatan bersih dari setiap proyek yang telah diselesaikan.
            </p>
          </div>

          <WithdrawalModalButton
            availableBalance={availableBalance}
            savedBankName={user.designerProfile?.payoutBank}
            savedAccountNumber={user.designerProfile?.payoutAccount}
            savedAccountHolder={user.designerProfile?.payoutHolderName}
            userDisplayName={user.displayName}
          />
        </div>

        {/* Informasi Rekening Pencairan Saldo */}
        <PayoutAccountCard
          initialBank={user.designerProfile?.payoutBank}
          initialAccount={user.designerProfile?.payoutAccount}
          initialHolder={user.designerProfile?.payoutHolderName}
          userDisplayName={user.displayName}
        />

        {/* Tiga Kartu Angka Saldo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="space-y-2 border-primary/20 bg-primary-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Saldo Tersedia
              </span>
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="font-money text-2xl sm:text-3xl font-extrabold text-primary">
              {formatRupiah(availableBalance)}
            </div>
            <p className="text-xs text-text-muted">
              Siap ditarik ke rekening bank atau e-wallet kamu.
            </p>
          </Card>

          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Saldo Sedang Berjalan
              </span>
              <ShieldAlert className="w-5 h-5 text-secondary" />
            </div>
            <div className="font-money text-2xl sm:text-3xl font-extrabold text-text">
              {formatRupiah(escrowHeldBalance)}
            </div>
            <p className="text-xs text-text-muted">
              Akan cair otomatis setelah customer menyetujui hasil desain.
            </p>
          </Card>

          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Total Estimasi
              </span>
              <Wallet className="w-5 h-5 text-text-muted" />
            </div>
            <div className="font-money text-2xl sm:text-3xl font-extrabold text-text">
              {formatRupiah(availableBalance + escrowHeldBalance)}
            </div>
            <p className="text-xs text-text-muted">
              Kombinasi saldo aktif dan proyek yang sedang berjalan.
            </p>
          </Card>
        </div>

        {/* Riwayat Penarikan Dana */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">
              Riwayat Penarikan Dana
            </h2>
            <span className="text-xs text-text-muted">
              Pencairan ke rekening bank & e-wallet
            </span>
          </div>

          {withdrawals.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-muted text-sm">
              Belum ada riwayat penarikan saldo. Klik tombol Tarik Saldo untuk mengajukan pencairan pendapatan Anda.
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-soft border-b border-border text-xs text-text-muted uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Tanggal & Waktu</th>
                      <th className="py-3 px-4 font-semibold">Tujuan Rekening / E-Wallet</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {withdrawals.map((w) => {
                      let dest: Record<string, string> = {};
                      try {
                        dest = JSON.parse(w.destination || "{}");
                      } catch {
                        dest = {};
                      }

                      const isSuccess = w.status === "SUCCESS";
                      const isPending = w.status === "REQUESTED";
                      const isFailed = w.status === "FAILED";

                      return (
                        <tr
                          key={w.id}
                          className="hover:bg-background transition-colors"
                        >
                          <td className="py-3.5 px-4 text-xs text-text-muted">
                            {formatDate(w.createdAt)} {formatTime(w.createdAt)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-text text-sm">
                              {dest.bankName || (w.method === "EWALLET" ? "E-Wallet" : "Transfer Bank")}
                              {dest.accountNumber ? ` • ${dest.accountNumber}` : ""}
                            </div>
                            <div className="text-xs text-text-muted">
                              a.n. {dest.accountHolder || user.displayName}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <Badge
                                variant={
                                  isSuccess
                                    ? "success"
                                    : isPending
                                    ? "warning"
                                    : isFailed
                                    ? "danger"
                                    : "neutral"
                                }
                              >
                                {isSuccess
                                  ? "Berhasil Ditransfer"
                                  : isPending
                                  ? "Menunggu Proses Admin"
                                  : isFailed
                                  ? "Ditolak"
                                  : "Diproses"}
                              </Badge>
                              {w.reviewedBy === "SYSTEM_AUTO_VERIFIED" && (
                                <span className="block text-[10px] text-text-muted font-mono">
                                  Auto-Approved (Terverifikasi)
                                </span>
                              )}
                              {w.rejectionReason && (
                                <span className="block text-[11px] text-danger">
                                  Alasan: {w.rejectionReason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-money font-bold text-text text-base">
                              {formatRupiah(w.amount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Tabel Riwayat Transaksi */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text">
            Riwayat Mutasi Transaksi
          </h2>

          {ledgerEntries.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-10 text-center text-text-muted text-sm">
              Belum ada riwayat transaksi. Mutasi akan tercatat otomatis saat ada transaksi proyek.
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-soft border-b border-border text-xs text-text-muted uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Tanggal & Waktu</th>
                      <th className="py-3 px-4 font-semibold">Keterangan</th>
                      <th className="py-3 px-4 font-semibold">Tipe</th>
                      <th className="py-3 px-4 font-semibold text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {ledgerEntries.map((entry) => {
                      const isCredit = entry.direction === "CREDIT";
                      return (
                        <tr
                          key={entry.id}
                          className="hover:bg-background transition-colors"
                        >
                          <td className="py-3.5 px-4 text-xs text-text-muted">
                            {formatDate(entry.createdAt)} {formatTime(entry.createdAt)}
                          </td>
                          <td className="py-3.5 px-4 text-text font-medium">
                            {entry.reason}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant={isCredit ? "success" : "neutral"}>
                              {isCredit ? "Masuk" : "Keluar"}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`font-money font-bold ${
                                isCredit ? "text-success" : "text-text"
                              }`}
                            >
                              {isCredit ? "+" : "-"}
                              {formatRupiah(entry.amount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
