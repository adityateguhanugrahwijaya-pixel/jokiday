"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatRupiah } from "@/lib/format";
import {
  ShieldCheck,
  Users,
  Palette,
  Clock,
  UserPlus,
  Wallet,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  AlertTriangle,
  SlidersHorizontal,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";

export interface ReconciliationData {
  waroengPayBalance: number;
  waroengPayAvailable?: number;
  waroengPayHeld?: number;
  isLiveApi?: boolean;
  liveError?: string | null;
  isManualSync?: boolean;
  gatewayClearingNet: number;
  designerWallets: number;
  customerRefundWallets: number;
  platformFeeWallet: number;
  escrowLocked: number;
  totalSystemWallets: number;
  discrepancy: number;
  hasGhostWallet: boolean;
  ghostWalletType: "BALANCED" | "DEFICIT" | "SURPLUS";
  verifiedAt: string;
}

interface AdminDashboardProps {
  displayName: string;
  stats: {
    totalUsers: number;
    totalCustomers: number;
    totalDesigners: number;
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    pendingWithdrawals: number;
    activeInvites: number;
    platformBalance?: number;
    totalCustomerRefundBalance?: number;
  };
  pendingWithdrawalsList: any[];
  recentOrders: any[];
  recentInvites: any[];
  reconciliation?: ReconciliationData;
  customersWithBalance?: {
    id: string;
    displayName: string;
    email: string;
    balance: number;
    lastReason: string;
    lastActivityAt: string | null;
  }[];
}

export function AdminDashboardView({
  displayName,
  stats,
  pendingWithdrawalsList,
  recentOrders,
  recentInvites,
  reconciliation,
  customersWithBalance = [],
}: AdminDashboardProps) {
  const router = useRouter();
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [actualBalanceInput, setActualBalanceInput] = useState<string>(
    reconciliation ? String(reconciliation.waroengPayBalance) : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [auditMessage, setAuditMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuditMessage(null);
    try {
      const res = await fetch("/api/admin/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualBalance: actualBalanceInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal memperbarui saldo audit WaroengPay");
      }
      setAuditMessage({ type: "success", text: data.message || "Audit saldo berhasil disimpan!" });
      setTimeout(() => {
        setShowAuditModal(false);
        setAuditMessage(null);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setAuditMessage({ type: "error", text: err.message || "Terjadi kesalahan koneksi" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAuto = async () => {
    if (!confirm("Kembalikan audit ke sinkronisasi otomatis buku besar ledger?")) return;
    setIsSubmitting(true);
    setAuditMessage(null);
    try {
      const res = await fetch("/api/admin/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetAuto: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal mereset ke sinkronisasi otomatis");
      }
      setAuditMessage({ type: "success", text: "Audit dikembalikan ke sinkronisasi otomatis buku besar!" });
      setTimeout(() => {
        setShowAuditModal(false);
        setAuditMessage(null);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setAuditMessage({ type: "error", text: err.message || "Terjadi kesalahan koneksi" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell role="CUSTOMER" displayName={displayName} isAdmin={true}>
      <div className="space-y-8">
        {/* Header & Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-soft text-primary border border-primary/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Mode Administrator
              </span>
              <span className="text-xs text-text-muted">JokiDay Prod</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
              Dashboard Admin
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Pusat kendali ekosistem JokiDay: kelola undangan desainer, persetujuan pencairan saldo, dan pantau seluruh transaksi platform.
            </p>
          </div>
        </div>

        {/* Sistem Rekonsiliasi & Peringatan Ghost Wallet */}
        {reconciliation && (
          <div
            className={`rounded-xl border p-5 sm:p-6 shadow-sm transition-all ${
              reconciliation.hasGhostWallet
                ? reconciliation.ghostWalletType === "DEFICIT"
                  ? "bg-danger-soft/30 border-danger/40 text-text"
                  : "bg-amber-500/10 border-amber-500/30 text-text"
                : "bg-emerald-500/5 border-emerald-500/30 text-text"
            }`}
          >
            {/* Header Status Bar */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-border/60">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {reconciliation.hasGhostWallet ? (
                    reconciliation.ghostWalletType === "DEFICIT" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-danger text-white shadow-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        PERINGATAN KRITIS: GHOST WALLET (DEFISIT KAS)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        AUDIT: SURPLUS KAS WAROENGPAY
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      100% SINKRON: ZERO GHOST WALLET
                    </span>
                  )}

                  <span className="text-xs text-text-muted">
                    Basis: {reconciliation.isManualSync ? "Audit Manual Admin" : "Buku Besar Clearing Otomatis"}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-extrabold text-text tracking-tight">
                  {reconciliation.hasGhostWallet
                    ? reconciliation.ghostWalletType === "DEFICIT"
                      ? "Peringatan: Kas WaroengPay Kurang dari Total Saldo Sistem!"
                      : "Kas WaroengPay Lebih Besar dari Total Saldo Sistem"
                    : "Kas WaroengPay & Seluruh Saldo Sistem Sinkron Sempurna"}
                </h2>

                <p className="text-xs sm:text-sm text-text-muted max-w-2xl leading-relaxed">
                  {reconciliation.hasGhostWallet
                    ? reconciliation.ghostWalletType === "DEFICIT"
                      ? `Kas riil WaroengPay (${formatRupiah(reconciliation.waroengPayBalance)}) lebih kecil dari total kewajiban saldo dompet (${formatRupiah(reconciliation.totalSystemWallets)}). Terdapat defisit sebesar ${formatRupiah(Math.abs(reconciliation.discrepancy))}. Ini mengindikasikan adanya saldo tidak bertuan (ghost wallet) atau penarikan kas yang belum tercatat.`
                      : `Kas riil WaroengPay (${formatRupiah(reconciliation.waroengPayBalance)}) tercatat lebih besar dari total kewajiban saldo sistem (${formatRupiah(reconciliation.totalSystemWallets)}) dengan surplus sebesar +${formatRupiah(reconciliation.discrepancy)}.`
                    : `Tidak ada ghost wallet. Kas riil WaroengPay (${formatRupiah(reconciliation.waroengPayBalance)}) seimbang 100% dengan total kewajiban saldo dompet desainer, refund customer, escrow pesanan, dan fee admin.`}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActualBalanceInput(String(reconciliation.waroengPayBalance));
                    setShowAuditModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface border border-border text-xs font-bold text-text hover:bg-background hover:border-primary/40 transition-colors shadow-xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  <span>Audit Saldo WaroengPay</span>
                </button>
              </div>
            </div>

            {/* Breakdown Grid Angka Audit */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
              <div className="p-3 bg-surface/80 border border-border/80 rounded-lg">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Kas WaroengPay
                </p>
                <p className="text-sm sm:text-base font-extrabold text-text font-money mt-1">
                  {formatRupiah(reconciliation.waroengPayBalance)}
                </p>
                <span className="text-[10px] text-text-muted block mt-0.5">
                  {reconciliation.isLiveApi
                    ? `Live: Cair ${formatRupiah(reconciliation.waroengPayAvailable || 0)} + Held ${formatRupiah(reconciliation.waroengPayHeld || 0)}`
                    : "Auto Clearing"}
                </span>
              </div>

              <div className="p-3 bg-surface/80 border border-border/80 rounded-lg">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Total Desainer
                </p>
                <p className="text-sm sm:text-base font-extrabold text-text font-money mt-1">
                  {formatRupiah(reconciliation.designerWallets)}
                </p>
                <span className="text-[10px] text-text-muted">Dompet Siap Tarik</span>
              </div>

              <div className="p-3 bg-surface/80 border border-border/80 rounded-lg">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Refund Customer
                </p>
                <p className="text-sm sm:text-base font-extrabold text-text font-money mt-1">
                  {formatRupiah(reconciliation.customerRefundWallets)}
                </p>
                <span className="text-[10px] text-text-muted">Saldo Order Batal</span>
              </div>

              <div className="p-3 bg-surface/80 border border-border/80 rounded-lg">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Fee Platform 5%
                </p>
                <p className="text-sm sm:text-base font-extrabold text-text font-money mt-1">
                  {formatRupiah(reconciliation.platformFeeWallet)}
                </p>
                <span className="text-[10px] text-text-muted">Saldo Admin JokiDay</span>
              </div>

              <div className="p-3 bg-surface/80 border border-border/80 rounded-lg">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Escrow Berjalan
                </p>
                <p className="text-sm sm:text-base font-extrabold text-text font-money mt-1">
                  {formatRupiah(reconciliation.escrowLocked)}
                </p>
                <span className="text-[10px] text-text-muted">Dana Pesanan Aktif</span>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  reconciliation.hasGhostWallet
                    ? reconciliation.ghostWalletType === "DEFICIT"
                      ? "bg-danger/10 border-danger/40 text-danger"
                      : "bg-amber-500/10 border-amber-500/40 text-amber-500"
                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider">
                  Selisih Kas
                </p>
                <p className="text-sm sm:text-base font-extrabold font-money mt-1">
                  {reconciliation.discrepancy > 0 ? "+" : ""}
                  {formatRupiah(reconciliation.discrepancy)}
                </p>
                <span className="text-[10px] font-bold">
                  {reconciliation.ghostWalletType === "BALANCED"
                    ? "SEIMBANG"
                    : reconciliation.ghostWalletType === "DEFICIT"
                    ? "DEFISIT"
                    : "SURPLUS"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Highlight Cards Grid: Platform Fee & Total Saldo Customer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: Saldo Pendapatan Platform (Fee 5%) */}
          <div className="bg-gradient-to-r from-primary-soft/80 via-surface to-surface border border-primary/20 rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-xs">
                  <Wallet className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Saldo Pendapatan Platform (Fee 5%)
                </span>
              </div>
              <div className="flex items-baseline gap-3 pt-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-text font-money">
                  {formatRupiah(stats.platformBalance || 0)}
                </p>
                <span className="text-xs text-success font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Siap Dicairkan
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Akumulasi fee 5% platform dari pesanan selesai. Dilacak penuh di buku besar double-entry ledger.
              </p>
            </div>
          </div>

          {/* Card 2: Total Saldo Customer (Refund / Batal) */}
          <div className="bg-gradient-to-r from-secondary-soft/80 via-surface to-surface border border-secondary/20 rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center shadow-xs">
                  <Wallet className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Total Saldo Customer (Refund & Batal)
                </span>
              </div>
              <div className="flex items-baseline gap-3 pt-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-text font-money">
                  {formatRupiah(stats.totalCustomerRefundBalance ?? reconciliation?.customerRefundWallets ?? 0)}
                </p>
                <span className="text-xs text-secondary font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {customersWithBalance.length} Customer Aktif
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Total dana pengembalian pesanan batal milik customer yang tersimpan di sistem. Customer dapat memilih menggunakan saldo ini secara opsional saat memesan desain baru.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="#customer-wallets"
                className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-surface border border-border text-text font-bold text-xs hover:bg-background transition-colors shadow-xs"
              >
                <span>Lihat Rincian Akun Customer</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1 text-secondary" />
              </a>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-text-muted">
                Total Pengguna
              </span>
              <div className="w-8 h-8 rounded-lg bg-secondary-soft text-secondary flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-text">
                {stats.totalUsers}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {stats.totalCustomers} Customer • {stats.totalDesigners} Desainer
              </p>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-text-muted">
                Pesanan Aktif
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-text">
                {stats.activeOrders}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {stats.completedOrders} selesai dari {stats.totalOrders} order
              </p>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-text-muted">
                Pending Payout
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-text">
                {stats.pendingWithdrawals}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {stats.pendingWithdrawals > 0 ? "Menunggu persetujuan admin" : "Semua penarikan diproses"}
              </p>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-text-muted">
                Undangan Aktif
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-text">
                {stats.activeInvites}
              </p>
              <p className="text-xs text-text-muted mt-1">
                Tautan registrasi desainer aktif
              </p>
            </div>
          </Card>
        </div>

        {/* Permintaan Penarikan Saldo Tertunda (Jika Ada) */}
        {stats.pendingWithdrawals > 0 && (
          <div className="p-4 sm:p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-text text-base">
                    Ada {stats.pendingWithdrawals} Permintaan Penarikan Saldo yang Memerlukan Tindakan
                  </h3>
                  <p className="text-xs text-text-muted">
                    Desainer telah mengajukan pencairan dana ke rekening bank / e-wallet.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {pendingWithdrawalsList.map((w: any) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg text-sm"
                >
                  <div>
                    <p className="font-semibold text-text">
                      {w.user?.displayName || "Desainer"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {w.method || "BANK"} • Permintaan ID: {w.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-text text-base">
                      {formatRupiah(w.amount)}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                      REQUESTED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid: Pesanan Terbaru & Undangan Desainer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaksi & Pesanan Terbaru Platform */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-text text-base">
                  Pesanan Terbaru Platform
                </h3>
                <p className="text-xs text-text-muted">
                  Aktivitas transaksi terkini di JokiDay
                </p>
              </div>
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm space-y-2">
                <Layers className="w-8 h-8 mx-auto opacity-40" />
                <p>Belum ada transaksi pesanan yang berlangsung.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="p-3 bg-background border border-border rounded-lg flex items-center justify-between text-sm hover:border-secondary/40 transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-text truncate">
                        {order.brief?.title || "Pesanan Desain"}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {order.customer?.displayName || "Customer"} ➔ {order.designer?.displayName || "Desainer"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-text text-xs sm:text-sm">
                        {formatRupiah(order.amount)}
                      </p>
                      <div className="mt-1">
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Undangan Desainer Eksklusif */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-text text-base">
                  Undangan Desainer
                </h3>
                <p className="text-xs text-text-muted">
                  Status tautan undangan pendaftaran (invite-only)
                </p>
              </div>
            </div>

            {recentInvites.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm space-y-2">
                <Palette className="w-8 h-8 mx-auto opacity-40" />
                <p>Belum ada tautan undangan yang dibuat.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentInvites.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="p-3 bg-background border border-border rounded-lg flex items-center justify-between text-sm"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-text truncate">
                        {inv.inviteeName}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5 truncate">
                        {inv.note ? `Catatan: ${inv.note}` : "Undangan onboarding desainer"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          inv.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : inv.status === "USED"
                            ? "bg-secondary-soft text-secondary"
                            : "bg-danger-soft text-danger"
                        }`}
                      >
                        {inv.status}
                      </span>
                      <p className="text-[10px] text-text-muted mt-1">
                        {new Date(inv.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Rincian Saldo Akun Pelanggan (Customer Wallets) */}
        <Card id="customer-wallets" className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
            <div>
              <h3 className="font-bold text-text text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-secondary" />
                <span>Rincian Saldo Akun Pelanggan (Customer Wallets)</span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Daftar pelanggan yang memiliki saldo pengembalian dana dari pesanan yang dibatalkan dan siap dibelanjakan kembali
              </p>
            </div>
            <div className="text-sm font-bold text-text flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-text-muted">Total Saldo Customer:</span>
              <span className="font-extrabold text-secondary font-money text-base">
                {formatRupiah(stats.totalCustomerRefundBalance ?? reconciliation?.customerRefundWallets ?? 0)}
              </span>
            </div>
          </div>

          {customersWithBalance.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-sm space-y-1">
              <p>Tidak ada customer yang memiliki saldo refund saat ini.</p>
              <p className="text-xs">Semua dana telah digunakan untuk pesanan atau belum ada pengembalian.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {customersWithBalance.map((c) => (
                <div
                  key={c.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm hover:bg-surface/50 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-text truncate">{c.displayName}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary-soft text-secondary">
                        CUSTOMER
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 truncate">{c.email}</p>
                    <p className="text-[11px] text-text-muted mt-1 italic">
                      Riwayat: {c.lastReason}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-base font-extrabold text-text font-money">
                      {formatRupiah(c.balance)}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Siap Digunakan Belanja
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Panel Navigasi Akses Cepat Administrator */}
        <div className="p-5 bg-surface border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-text text-sm">
                Akses Penuh Administrator
              </h4>
              <p className="text-xs text-text-muted">
                Semua menu proteksi khusus admin aktif untuk akun Anda di domain resmi production.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Audit Saldo Kas WaroengPay */}
        {showAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-surface border border-border rounded-xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-text text-base">
                    Audit Saldo Kas WaroengPay
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="p-1 rounded-md text-text-muted hover:text-text hover:bg-background transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-text-muted leading-relaxed">
                Masukkan saldo kas riil yang tertera di dashboard merchant WaroengPay untuk memverifikasi apakah ada saldo yang tidak ter-backup (ghost wallet).
              </p>

              {auditMessage && (
                <div
                  className={`p-3 rounded-lg text-xs font-semibold ${
                    auditMessage.type === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-danger/10 text-danger border border-danger/30"
                  }`}
                >
                  {auditMessage.text}
                </div>
              )}

              <form onSubmit={handleAuditSubmit} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-text mb-1">
                    Saldo Kas WaroengPay Riil (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={actualBalanceInput}
                    onChange={(e) => setActualBalanceInput(e.target.value)}
                    placeholder="Contoh: 2500000"
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-text font-money text-sm focus:outline-hidden focus:border-primary"
                  />
                  <p className="text-[11px] text-text-muted mt-1">
                    Catatan kas otomatis di buku besar: {formatRupiah(reconciliation?.gatewayClearingNet || 0)}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleResetAuto}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1 text-xs font-bold text-text-muted hover:text-primary transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
                    <span>Reset ke Otomatis</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAuditModal(false)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-md bg-background border border-border text-xs font-semibold text-text hover:bg-surface transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isSubmitting ? "Menyimpan..." : "Simpan & Rekonsiliasi"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
