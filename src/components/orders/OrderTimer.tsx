"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Clock, CheckCircle2, AlertCircle, XCircle, Timer } from "lucide-react";
import {
  OrderTimerData,
  getOrderTimerInfo,
  formatDateTimeWIB,
} from "@/lib/order-timer";

export interface OrderTimerProps {
  order: OrderTimerData;
  variant?: "compact" | "badge" | "detailed";
  className?: string;
}

export function OrderTimer({
  order,
  variant = "badge",
  className = "",
}: OrderTimerProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  // Hitung info timer secara deterministik
  const info = useMemo(() => getOrderTimerInfo(order, now), [order, now]);

  // Efek interval hanya aktif untuk order yang masih berjalan atau menunggu bayar.
  // Jika order sudah final (COMPLETED, CANCELLED, REFUNDED), TIDAK ADA interval yang dijalankan.
  useEffect(() => {
    if (info.type === "COMPLETED" || info.type === "CANCELLED_OR_FAILED") {
      return;
    }

    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 10000);

    return () => clearInterval(intervalId);
  }, [info.type, order.status]);

  // 1. TAMPILAN COMPACT (Untuk daftar kartu order di /orders)
  if (variant === "compact") {
    if (info.type === "COMPLETED") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            info.isCompletedLate ? "text-danger" : "text-success"
          } ${className}`}
        >
          {info.isCompletedLate ? (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{info.badgeLabel}</span>
        </span>
      );
    }

    if (info.type === "CANCELLED_OR_FAILED") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium text-text-muted ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 shrink-0 text-text-muted" />
          <span>{info.badgeLabel}</span>
        </span>
      );
    }

    // Active atau Awaiting Payment
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
          info.badgeVariant === "danger"
            ? "text-danger"
            : info.badgeVariant === "warning"
            ? "text-secondary-text"
            : "text-primary"
        } ${className}`}
      >
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>{info.badgeLabel}</span>
      </span>
    );
  }

  // 2. TAMPILAN BADGE (Untuk header halaman order di /orders/[id])
  if (variant === "badge") {
    let colorClasses = "bg-primary-soft text-primary border-primary/20";
    let Icon = Clock;

    if (info.type === "COMPLETED") {
      if (info.isCompletedLate) {
        colorClasses = "bg-danger-soft text-danger border-danger/25";
        Icon = AlertCircle;
      } else {
        colorClasses = "bg-success-soft text-success border-success/25";
        Icon = CheckCircle2;
      }
    } else if (info.type === "CANCELLED_OR_FAILED") {
      colorClasses = "bg-neutral-soft text-text-muted border-border";
      Icon = XCircle;
    } else if (info.badgeVariant === "danger") {
      colorClasses = "bg-danger-soft text-danger border-danger/30 font-bold";
      Icon = AlertCircle;
    } else if (info.badgeVariant === "warning") {
      colorClasses = "bg-amber-500/15 text-amber-600 border-amber-500/30 font-bold";
      Icon = Clock;
    }

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${colorClasses} ${className}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{info.badgeLabel}</span>
      </div>
    );
  }

  // 3. TAMPILAN DETAILED (Untuk card ringkasan waktu pengerjaan di /orders/[id])
  if (info.type === "COMPLETED") {
    return (
      <div
        className={`bg-surface border rounded-lg p-5 space-y-3.5 shadow-subtle ${
          info.isCompletedLate ? "border-danger/30" : "border-success/30"
        } ${className}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                info.isCompletedLate
                  ? "bg-danger-soft text-danger"
                  : "bg-success-soft text-success"
              }`}
            >
              {info.isCompletedLate ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm text-text">Ringkasan Waktu Pengerjaan</h3>
              <p className="text-[11px] text-text-muted">Laporan durasi dan ketepatan deadline</p>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              info.isCompletedLate
                ? "bg-danger-soft text-danger border-danger/30"
                : "bg-success-soft text-success border-success/30"
            }`}
          >
            {info.deadlineDiffText}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-neutral-soft/30 rounded-md border border-border/60">
            <span className="text-text-muted block text-[11px]">Waktu Mulai Dikerjakan</span>
            <span className="font-bold text-text mt-0.5 block">{info.startTimeFormatted}</span>
          </div>

          <div className="p-3 bg-neutral-soft/30 rounded-md border border-border/60">
            <span className="text-text-muted block text-[11px]">Waktu Selesai</span>
            <span className="font-bold text-text mt-0.5 block">{info.endTimeFormatted}</span>
          </div>

          <div className="p-3 bg-neutral-soft/30 rounded-md border border-border/60">
            <span className="text-text-muted block text-[11px]">Total Durasi Pengerjaan</span>
            <span className="font-bold text-text mt-0.5 block">{info.durationFormatted}</span>
          </div>

          <div className="p-3 bg-neutral-soft/30 rounded-md border border-border/60">
            <span className="text-text-muted block text-[11px]">Hasil terhadap Deadline</span>
            <span
              className={`font-bold mt-0.5 block ${
                info.isCompletedLate ? "text-danger" : "text-success"
              }`}
            >
              {info.deadlineDiffText}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (info.type === "CANCELLED_OR_FAILED") {
    return (
      <div className={`bg-surface border border-border rounded-lg p-5 space-y-3 shadow-subtle ${className}`}>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <div className="w-8 h-8 rounded-full bg-neutral-soft text-text-muted flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-text">Riwayat Penghentian Order</h3>
            <p className="text-[11px] text-text-muted">Waktu saat pesanan ditutup</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-neutral-soft/30 rounded-md border border-border/60">
            <span className="text-text-muted block text-[11px]">Status Akhir</span>
            <span className="font-bold text-text mt-0.5 block">{info.badgeLabel}</span>
          </div>

          <div className="p-3 bg-neutral-soft/30 rounded-md border border-border/60">
            <span className="text-text-muted block text-[11px]">Waktu Berhenti</span>
            <span className="font-bold text-text mt-0.5 block">{info.stoppedAtFormatted}</span>
          </div>
        </div>

        {info.endedReasonText && (
          <p className="text-xs text-text-muted italic bg-neutral-soft/20 p-2.5 rounded border border-border/40">
            Catatan: {info.endedReasonText}
          </p>
        )}
      </div>
    );
  }

  // Active / Awaiting Payment
  return (
    <div className={`bg-surface border border-border rounded-lg p-5 space-y-3 shadow-subtle ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              info.isOverdue
                ? "bg-danger-soft text-danger"
                : info.isUrgent
                ? "bg-amber-500/15 text-amber-600"
                : "bg-primary-soft text-primary"
            }`}
          >
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-text">Target Waktu Pengerjaan</h3>
            <p className="text-[11px] text-text-muted">Batas deadline yang disepakati</p>
          </div>
        </div>

        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
            info.isOverdue
              ? "bg-danger-soft text-danger border-danger/30"
              : info.isUrgent
              ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
              : "bg-primary-soft text-primary border-primary/30"
          }`}
        >
          {info.timeRemainingText}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-neutral-soft/30 rounded-md border border-border/60">
          <span className="text-text-muted block text-[11px]">Batas Waktu (Deadline)</span>
          <span className="font-bold text-text mt-0.5 block">
            {order.deadlineAt ? formatDateTimeWIB(order.deadlineAt) : "-"}
          </span>
        </div>

        <div className="p-3 bg-neutral-soft/30 rounded-md border border-border/60">
          <span className="text-text-muted block text-[11px]">Status Hitung Mundur</span>
          <span
            className={`font-bold mt-0.5 block ${
              info.isOverdue
                ? "text-danger"
                : info.isUrgent
                ? "text-secondary-text"
                : "text-primary"
            }`}
          >
            {info.timeRemainingText}
          </span>
        </div>
      </div>
    </div>
  );
}
