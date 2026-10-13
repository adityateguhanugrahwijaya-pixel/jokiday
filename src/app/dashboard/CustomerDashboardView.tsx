"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatRupiah, formatRelativeDeadline } from "@/lib/format";
import {
  Clock,
  ShoppingBag,
  CreditCard,
  Plus,
  ChevronRight,
  PackageCheck,
  AlertCircle,
  MessageSquare,
  FileText,
  Wallet,
} from "lucide-react";

interface CustomerDashboardProps {
  displayName: string;
  activeOrders: any[];
  awaitingPaymentOrders: any[];
  completedOrdersCount: number;
  myBriefs: any[];
  refundBalance?: number;
}

export function CustomerDashboardView({
  displayName,
  activeOrders,
  awaitingPaymentOrders,
  completedOrdersCount,
  myBriefs,
  refundBalance = 0,
}: CustomerDashboardProps) {
  const ongoingOrdersCount = activeOrders.length;
  const awaitingPaymentCount = awaitingPaymentOrders.length;

  return (
    <AppShell role="CUSTOMER" displayName={displayName}>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text">
              Dashboard Pelanggan
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Pantau pesanan aktif, status pengerjaan, dan kelola brief proyek Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/briefs/new"
              className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-secondary text-on-secondary font-bold text-sm hover:bg-secondary-hover transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Pesan Desain Baru</span>
            </Link>
          </div>
        </div>

        {/* Notifikasi Tagihan Menunggu Pembayaran */}
        {awaitingPaymentCount > 0 && (
          <div className="p-4 sm:p-5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-600 rounded-full shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-text">
                  Ada {awaitingPaymentCount} Pesanan Menunggu Pembayaran
                </h3>
                <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                  Selesaikan pembayaran tagihan agar desainer dapat segera memulai pengerjaan desain Anda.
                </p>
              </div>
            </div>
            <Link
              href={`/orders/${awaitingPaymentOrders[0].id}`}
              className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors shrink-0"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              <span>Bayar Sekarang</span>
            </Link>
          </div>
        )}

        {/* 4 Kartu Ringkasan Pelanggan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="space-y-1.5 border-primary/20 bg-primary-soft/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Saldo Refund / Batal
              </span>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="font-money text-2xl sm:text-3xl font-extrabold text-primary">
              {formatRupiah(refundBalance)}
            </div>
            <Link
              href="/wallet"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Buka dompet &rarr;</span>
            </Link>
          </Card>

          <Card className="space-y-1.5">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Pesanan Sedang Dikerjakan
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary">
              {ongoingOrdersCount}
            </div>
            <p className="text-xs text-text-muted">Proyek dalam tahap pengerjaan desainer</p>
          </Card>

          <Card className="space-y-1.5">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Menunggu Pembayaran
            </span>
            <div className={`text-2xl sm:text-3xl font-extrabold ${awaitingPaymentCount > 0 ? "text-secondary-text" : "text-text"}`}>
              {awaitingPaymentCount}
            </div>
            <Link
              href="/orders"
              className="text-xs font-semibold text-secondary-text hover:underline"
            >
              Periksa tagihan &rarr;
            </Link>
          </Card>

          <Card className="space-y-1.5">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Pesanan Selesai
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-success">
              {completedOrdersCount}
            </div>
            <Link
              href="/orders"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Lihat riwayat pesanan &rarr;
            </Link>
          </Card>
        </div>

        {/* Dua Kolom: Pesanan Aktif Pelanggan & Brief Saya */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Kolom 1: Pesanan Aktif Pelanggan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text">
                Pesanan Berjalan Anda
              </h2>
              <Link
                href="/orders"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Lihat Semua &rarr;
              </Link>
            </div>

            {activeOrders.length === 0 && awaitingPaymentOrders.length === 0 ? (
              <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-muted text-sm space-y-3">
                <PackageCheck className="w-8 h-8 mx-auto text-text-muted" />
                <p>Belum ada pesanan aktif. Mulai pesan desain dari portofolio desainer atau buat brief baru.</p>
                <Link
                  href="/briefs/new"
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-white font-semibold text-xs hover:bg-primary/90"
                >
                  Pesan Desain
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {[...awaitingPaymentOrders, ...activeOrders].slice(0, 5).map((order) => {
                  const deadlineInfo = order.deadlineAt
                    ? formatRelativeDeadline(order.deadlineAt)
                    : null;
                  const isAwaitingPay = order.status === "AWAITING_PAYMENT";

                  return (
                    <div
                      key={order.id}
                      className="bg-surface border border-border rounded-lg p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-primary/40 transition-colors shadow-subtle"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={order.status} />
                          {deadlineInfo && (
                            <span className="text-xs font-semibold text-primary flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{deadlineInfo.text}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm sm:text-base text-text truncate">
                          {order.brief.title}
                        </h3>
                        <p className="text-xs text-text-muted">
                          Desainer: <strong className="text-text">{order.designer?.displayName || "Desainer"}</strong> &bull; Total: {formatRupiah(order.price)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isAwaitingPay ? (
                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1" />
                            <span>Bayar</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-surface text-primary border border-border font-semibold text-xs hover:bg-background transition-colors"
                          >
                            <span>Detail</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kolom 2: Brief Proyek yang Diajukan Pelanggan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text">
                Brief Proyek Saya
              </h2>
              <Link
                href="/briefs/new"
                className="text-xs font-semibold text-primary hover:underline"
              >
                + Buat Brief Baru
              </Link>
            </div>

            {myBriefs.length === 0 ? (
              <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-muted text-sm space-y-3">
                <FileText className="w-8 h-8 mx-auto text-text-muted" />
                <p>Anda belum membuat brief proyek desain di pasar terbuka.</p>
                <Link
                  href="/briefs/new"
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-secondary text-on-secondary font-semibold text-xs hover:bg-secondary-hover"
                >
                  Buat Brief Proyek
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myBriefs.slice(0, 5).map((brief) => (
                  <div
                    key={brief.id}
                    className="bg-surface border border-border rounded-lg p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-primary/40 transition-colors shadow-subtle"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-neutral-soft text-text-muted rounded-full">
                          {brief.category || "Desain"}
                        </span>
                        <span className="text-xs text-primary font-bold">
                          {brief.offers?.length || 0} Tawaran Masuk
                        </span>
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-text truncate">
                        {brief.title}
                      </h3>
                      <p className="text-xs text-text-muted">
                        Anggaran: {formatRupiah(brief.budgetHint || 0)}
                      </p>
                    </div>

                    <Link
                      href={`/briefs/${brief.id}`}
                      className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-surface text-primary border border-border font-semibold text-xs hover:bg-background transition-colors shrink-0"
                    >
                      <span>Lihat Tawaran</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
