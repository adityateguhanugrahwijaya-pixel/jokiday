"use client";

import React from "react";
import { Star, ShieldCheck, UserCheck, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/format";

export interface CustomerReputationData {
  customerId: string;
  maskedName: string;
  customerRatingAvg: number;
  customerRatingCount: number;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
}

export interface CustomerReputationCardProps {
  reputation: CustomerReputationData | null;
}

export function CustomerReputationCard({ reputation }: CustomerReputationCardProps) {
  if (!reputation) return null;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-2xs">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-text">
              Reputasi Pelanggan ({reputation.maskedName})
            </h3>
            <p className="text-[11px] text-text-muted">
              Hanya terlihat oleh sesama desainer untuk referensi kerja sama
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-bold text-amber-600">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          {reputation.customerRatingCount > 0 ? (
            <span>
              {reputation.customerRatingAvg.toFixed(1)} / 5.0 ({reputation.customerRatingCount} ulasan)
            </span>
          ) : (
            <span className="text-text-muted font-normal">Belum ada ulasan desainer</span>
          )}
        </div>
      </div>

      {reputation.recentReviews.length > 0 ? (
        <div className="space-y-2.5 pt-2 border-t border-border">
          <span className="text-xs font-semibold text-text-muted block">
            Catatan Desainer Sebelumnya:
          </span>
          <div className="space-y-2">
            {reputation.recentReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-3 bg-background border border-border/70 rounded-lg text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-text-muted">
                  <div className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    <span>{rev.rating} / 5</span>
                  </div>
                  <span className="text-[10px]">{formatDate(rev.createdAt)}</span>
                </div>
                {rev.comment ? (
                  <p className="text-text leading-relaxed italic">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                ) : (
                  <span className="text-text-muted text-[11px] italic">Tanpa komentar teks</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-neutral-soft/50 rounded-lg text-xs text-text-muted text-center border border-dashed border-border">
          Pelanggan ini belum pernah menerima ulasan dari desainer pada pesanan sebelumnya.
        </div>
      )}
    </div>
  );
}
