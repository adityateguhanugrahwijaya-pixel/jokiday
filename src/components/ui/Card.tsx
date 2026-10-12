import React from "react";
import { clsx } from "clsx";
import { ShieldCheck } from "lucide-react";
import { formatRupiah } from "@/lib/format";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

export function Card({ children, className, padding = "lg", ...props }: CardProps) {
  const paddingStyles = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  return (
    <div
      className={clsx(
        "bg-surface border border-border rounded-lg",
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface EscrowCardProps {
  amount: number;
  className?: string;
}

export function EscrowCard({ amount, className }: EscrowCardProps) {
  return (
    <div
      className={clsx(
        "bg-primary-soft border border-primary/20 rounded-lg p-5 flex items-start gap-3.5",
        className
      )}
    >
      <div className="bg-primary/10 text-primary p-2.5 rounded-full shrink-0">
        <ShieldCheck className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Pembayaran Terlindungi JokiDay
          </span>
          <span className="font-money text-lg font-extrabold text-primary">
            {formatRupiah(amount)}
          </span>
        </div>
        <p className="text-sm text-text mt-1 leading-relaxed">
          Dana aman ditahan oleh JokiDay sampai kamu memeriksa dan menyetujui hasil desain final.
        </p>
      </div>
    </div>
  );
}
