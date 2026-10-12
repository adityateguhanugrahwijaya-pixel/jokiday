import React from "react";
import { clsx } from "clsx";

export type BadgeVariant = "info" | "warning" | "success" | "danger" | "neutral";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "info", children, className }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    // Info: Dikerjakan, Menunggu persetujuan
    info: "bg-primary-soft text-primary",
    // Warning: Menunggu bayar, Revisi
    warning: "bg-secondary-soft text-secondary-text",
    // Success: Selesai, saldo cair
    success: "bg-success-soft text-success",
    // Danger: Dispute, deadline terlewat
    danger: "bg-danger-soft text-danger",
    // Neutral: Batal, Refund
    neutral: "bg-neutral-soft text-text-muted",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold select-none",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Pemetaan status order ke Badge sesuai DESIGN.md
 */
export function OrderStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return <Badge variant="warning">Menunggu bayar</Badge>;
    case "IN_PROGRESS":
      return <Badge variant="info">Dikerjakan</Badge>;
    case "AWAITING_APPROVAL":
      return <Badge variant="info">Menunggu persetujuan</Badge>;
    case "REVISION":
      return <Badge variant="warning">Revisi</Badge>;
    case "COMPLETED":
      return <Badge variant="success">Selesai</Badge>;
    case "DISPUTED":
      return <Badge variant="danger">Dispute</Badge>;
    case "REFUNDED":
      return <Badge variant="neutral">Refund</Badge>;
    case "CANCELLED":
      return <Badge variant="neutral">Batal</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
