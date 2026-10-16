"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { formatRupiah } from "@/lib/format";
import { OrderTimer } from "@/components/orders/OrderTimer";
import {
  Clock,
  ChevronRight,
  PackageCheck,
  CreditCard,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Send,
  XCircle,
} from "lucide-react";

interface OrderItem {
  id: string;
  status: string;
  price: number;
  designerNet: number;
  deadlineAt: string | Date | null;
  startedAt?: string | Date | null;
  endedAt?: string | Date | null;
  endedReason?: string | null;
  completedAt?: string | Date | null;
  paidAt?: string | Date | null;
  paymentExpiresAt?: string | Date | null;
  createdAt: string | Date;
  brief: {
    id: string;
    title: string;
    category?: string | null;
  };
  designer: {
    id: string;
    displayName: string;
    username?: string | null;
  };
  customer: {
    id: string;
    displayName: string;
  };
}

interface OrdersViewClientProps {
  orders: OrderItem[];
  role: "CUSTOMER" | "DESIGNER";
  displayName: string;
  isAdmin?: boolean;
}

export function OrdersViewClient({
  orders,
  role,
  displayName,
  isAdmin,
}: OrdersViewClientProps) {
  const [filterTab, setFilterTab] = useState<string>("ALL");
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const handleDirectPay = async (orderId: string) => {
    setPayingOrderId(orderId);
    try {
      const res = await fetch("/api/orders/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, useBalance: false }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        window.location.href = `/orders/${orderId}?pay=true`;
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memproses pembayaran");

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        window.location.href = `/orders/${orderId}`;
      }
    } catch {
      window.location.href = `/orders/${orderId}?pay=true`;
    } finally {
      setPayingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filterTab === "ALL") return true;
    if (filterTab === "AWAITING_PAYMENT") return order.status === "AWAITING_PAYMENT";
    if (filterTab === "IN_PROGRESS") {
      return (
        order.status === "IN_PROGRESS" ||
        order.status === "REVISION" ||
        order.status === "AWAITING_APPROVAL"
      );
    }
    if (filterTab === "COMPLETED") return order.status === "COMPLETED";
    if (filterTab === "CANCELLED") {
      return order.status === "CANCELLED" || order.status === "REFUNDED" || order.status === "DISPUTED";
    }
    return true;
  });

  const countAwaitingPayment = orders.filter((o) => o.status === "AWAITING_PAYMENT").length;
  const countInProgress = orders.filter(
    (o) => o.status === "IN_PROGRESS" || o.status === "REVISION" || o.status === "AWAITING_APPROVAL"
  ).length;
  const countCompleted = orders.filter((o) => o.status === "COMPLETED").length;
  const countCancelled = orders.filter((o) => o.status === "CANCELLED" || o.status === "REFUNDED").length;

  React.useEffect(() => {
    if (isAdmin) {
      document.title = "Monitoring Order - JokiDay";
    }
  }, [isAdmin]);

  return (
    <AppShell role={role} displayName={displayName} isAdmin={isAdmin}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">
            {isAdmin
              ? "Monitoring Order"
              : role === "DESIGNER"
              ? "Kelola Pekerjaan Desain"
              : "Daftar Pesanan Saya"}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {isAdmin
              ? "Pantau seluruh transaksi pesanan antara pelanggan dan desainer di seluruh platform JokiDay."
              : role === "DESIGNER"
              ? "Pantau pesanan dari pelanggan, periksa status pembayaran, dan serahkan hasil desain tepat waktu."
              : "Pantau proses pengerjaan pesanan desain Anda, selesaikan pembayaran tagihan, dan unduh berkas final."}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setFilterTab("ALL")}
            className={`px-3 py-2 rounded-t-md transition-colors border-b-2 whitespace-nowrap ${
              filterTab === "ALL"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Semua ({orders.length})
          </button>
          <button
            onClick={() => setFilterTab("AWAITING_PAYMENT")}
            className={`px-3 py-2 rounded-t-md transition-colors border-b-2 whitespace-nowrap ${
              filterTab === "AWAITING_PAYMENT"
                ? "border-secondary-text text-secondary-text font-bold"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {role === "DESIGNER" ? "Menunggu Bayar Pelanggan" : "Menunggu Pembayaran"} ({countAwaitingPayment})
          </button>
          <button
            onClick={() => setFilterTab("IN_PROGRESS")}
            className={`px-3 py-2 rounded-t-md transition-colors border-b-2 whitespace-nowrap ${
              filterTab === "IN_PROGRESS"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Sedang Berjalan ({countInProgress})
          </button>
          <button
            onClick={() => setFilterTab("COMPLETED")}
            className={`px-3 py-2 rounded-t-md transition-colors border-b-2 whitespace-nowrap ${
              filterTab === "COMPLETED"
                ? "border-success text-success font-bold"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Selesai ({countCompleted})
          </button>
          <button
            onClick={() => setFilterTab("CANCELLED")}
            className={`px-3 py-2 rounded-t-md transition-colors border-b-2 whitespace-nowrap ${
              filterTab === "CANCELLED"
                ? "border-neutral-500 text-text font-bold"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Batal / Gagal ({countCancelled})
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text">
                {filterTab === "ALL"
                  ? "Belum ada order pada akun ini"
                  : "Tidak ada order pada kategori ini"}
              </h3>
              <p className="text-sm text-text-muted mt-1 leading-relaxed">
                {role === "DESIGNER"
                  ? "Cek antrean brief di pasar atau bagikan profil portofoliomu untuk menerima order langsung dari pelanggan."
                  : "Mulai pesan desain baru langsung ke desainer favoritmu atau buat brief di pasar terbuka."}
              </p>
            </div>
            {role === "CUSTOMER" ? (
              <Link
                href="/briefs/new"
                className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-secondary text-on-secondary font-bold text-sm hover:bg-secondary-hover transition-colors"
              >
                Mulai Pesan Desain
              </Link>
            ) : (
              <Link
                href="/market"
                className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                Jelajahi Pasar Brief
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isAwaitingPay = order.status === "AWAITING_PAYMENT";
              const isPaid =
                order.status === "IN_PROGRESS" ||
                order.status === "AWAITING_APPROVAL" ||
                order.status === "REVISION";
              const isDone = order.status === "COMPLETED";
              const isCancelled = order.status === "CANCELLED" || order.status === "REFUNDED";

              return (
                <div
                  key={order.id}
                  className="bg-surface border border-border rounded-lg p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-primary/40 transition-colors shadow-subtle"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <OrderStatusBadge status={order.status} />

                      {/* Status Pembayaran Khusus Desainer */}
                      {role === "DESIGNER" && (
                        <>
                          {isAwaitingPay && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                              <AlertCircle className="w-3 h-3" />
                              <span>Pelanggan Belum Bayar</span>
                            </span>
                          )}
                          {isPaid && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-soft text-success border border-success/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pembayaran Sukses (Dana Diamankan)</span>
                            </span>
                          )}
                          {isDone && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-soft text-primary">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Dana Masuk Dompet</span>
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger-soft text-danger">
                              <XCircle className="w-3 h-3" />
                              <span>Order Gagal / Batal</span>
                            </span>
                          )}
                        </>
                      )}

                      <span className="text-xs text-text-muted font-mono">
                        #{order.id.slice(0, 8)}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-text">
                      <Link
                        href={`/orders/${order.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {order.brief.title}
                      </Link>
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                      {role === "DESIGNER" ? (
                        <span>Pelanggan: <strong className="text-text">{order.customer.displayName}</strong></span>
                      ) : (
                        <span>Desainer: <strong className="text-text">{order.designer.displayName}</strong></span>
                      )}

                      <OrderTimer order={order} variant="compact" />
                    </div>

                    {/* Note peringatan untuk Desainer jika belum dibayar */}
                    {role === "DESIGNER" && isAwaitingPay && (
                      <p className="text-xs text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded border border-amber-500/20 inline-block">
                        Menunggu konfirmasi pembayaran pelanggan. Anda dilarang memulai pekerjaan sebelum pembayaran lunas.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                    <div className="text-left md:text-right">
                      {role === "DESIGNER" ? (
                        <>
                          <div className="font-money text-lg sm:text-xl font-extrabold text-primary">
                            {formatRupiah(order.designerNet)}
                          </div>
                          <div className="text-[11px] text-text-muted">
                            Net Pendapatan Desainer
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-money text-lg sm:text-xl font-extrabold text-text">
                            {formatRupiah(order.price)}
                          </div>
                          <div className="text-[11px] text-text-muted">
                            {isAwaitingPay ? "Total Tagihan" : "Total Kesepakatan"}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Tombol Bayar jika Customer dan AWAITING_PAYMENT */}
                      {role === "CUSTOMER" && isAwaitingPay && (
                        <button
                          type="button"
                          disabled={payingOrderId === order.id}
                          onClick={() => handleDirectPay(order.id)}
                          className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors shadow-sm disabled:opacity-50"
                        >
                          {payingOrderId === order.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          <span>{payingOrderId === order.id ? "Membuka Menu..." : "Bayar Tagihan"}</span>
                        </button>
                      )}

                      {/* Tombol Kirim Desain jika Designer dan Sedang Dikerjakan */}
                      {role === "DESIGNER" && (order.status === "IN_PROGRESS" || order.status === "REVISION") && (
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          <span>Kirim Desain</span>
                        </Link>
                      )}

                      {/* Tombol Chat */}
                      <Link
                        href={`/chat?userId=${role === "DESIGNER" ? order.customer.id : order.designer.id}`}
                        className="inline-flex items-center justify-center h-10 px-3 rounded-md bg-surface text-text border border-border font-semibold text-xs hover:bg-background transition-colors"
                        title="Buka Chat"
                      >
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </Link>

                      {/* Tombol Detail */}
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center justify-center h-10 px-3.5 rounded-md bg-surface text-primary border border-border font-semibold text-xs hover:bg-background transition-colors"
                      >
                        <span>Detail</span>
                        <ChevronRight className="w-4 h-4 ml-0.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
