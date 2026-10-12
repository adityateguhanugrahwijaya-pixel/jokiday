"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatRupiah } from "@/lib/format";
import {
  ShieldCheck,
  Users,
  Palette,
  Clock,
  ArrowUpRight,
  UserPlus,
  Wallet,
  CheckCircle2,
  ExternalLink,
  Layers,
  ChevronRight,
} from "lucide-react";

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
  };
  pendingWithdrawalsList: any[];
  recentOrders: any[];
  recentInvites: any[];
}

export function AdminDashboardView({
  displayName,
  stats,
  pendingWithdrawalsList,
  recentOrders,
  recentInvites,
}: AdminDashboardProps) {
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
              Dashboard Administrator
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Pusat kendali ekosistem JokiDay: kelola undangan desainer, persetujuan pencairan saldo, dan pantau seluruh transaksi platform.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/admin/invites"
              className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-secondary text-on-secondary font-bold text-sm hover:bg-secondary-hover transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              <span>Kelola Undangan</span>
            </Link>
            <Link
              href="/admin/withdrawals"
              className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-surface border border-border text-text font-bold text-sm hover:bg-background transition-colors"
            >
              <Wallet className="w-4 h-4 mr-1.5 text-primary" />
              <span>Penarikan Saldo</span>
            </Link>
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
              <Link
                href="/admin/withdrawals"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 text-slate-900 font-bold text-xs hover:bg-amber-400 transition-colors"
              >
                <span>Buka Panel Penarikan</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
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

            <div className="sm:hidden pt-2">
              <Link
                href="/admin/withdrawals"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-amber-500 text-slate-900 font-bold text-xs hover:bg-amber-400 transition-colors"
              >
                <span>Periksa Semua di Panel Penarikan</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
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
              <Link
                href="/orders"
                className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
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
              <Link
                href="/admin/invites"
                className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
              >
                <span>Kelola Undangan</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentInvites.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm space-y-2">
                <Palette className="w-8 h-8 mx-auto opacity-40" />
                <p>Belum ada tautan undangan yang dibuat.</p>
                <Link
                  href="/admin/invites"
                  className="inline-block mt-2 text-xs font-bold text-primary hover:underline"
                >
                  + Buat Undangan Pertama
                </Link>
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
          <div className="flex items-center gap-2">
            <Link
              href="/admin/invites"
              className="px-3 py-1.5 rounded-md bg-background border border-border text-xs font-semibold text-text hover:bg-surface transition-colors"
            >
              Undangan Desainer
            </Link>
            <Link
              href="/admin/withdrawals"
              className="px-3 py-1.5 rounded-md bg-background border border-border text-xs font-semibold text-text hover:bg-surface transition-colors"
            >
              Persetujuan Penarikan
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
