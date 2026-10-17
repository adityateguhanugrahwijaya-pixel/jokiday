"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Star,
  Eye,
  EyeOff,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Shield,
  Flag,
  CornerDownRight,
  RefreshCw,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export interface AdminReviewItem {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  direction: "CUSTOMER_TO_DESIGNER" | "DESIGNER_TO_CUSTOMER";
  rating: number;
  comment: string | null;
  status: "VISIBLE" | "HIDDEN";
  hiddenReason: string | null;
  hiddenBy: string | null;
  designerReply: string | null;
  designerRepliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewer: {
    id: string;
    displayName: string;
    email: string;
    username: string | null;
  };
  reviewee: {
    id: string;
    displayName: string;
    email: string;
    username: string | null;
  };
  order: {
    id: string;
    price: number;
    status: string;
  };
  reports: Array<{
    id: string;
    reason: string;
    status: string;
    createdAt: string;
  }>;
}

export function AdminReviewsClient() {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "VISIBLE" | "HIDDEN">("ALL");
  const [filterDirection, setFilterDirection] = useState<
    "ALL" | "CUSTOMER_TO_DESIGNER" | "DESIGNER_TO_CUSTOMER"
  >("ALL");

  const [hideModalOpen, setHideModalOpen] = useState(false);
  const [targetReview, setTargetReview] = useState<AdminReviewItem | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (filterDirection !== "ALL") params.append("direction", filterDirection);

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil daftar ulasan");
      const json = await res.json();
      if (json.success && json.data) {
        setReviews(json.data.reviews || []);
      }
    } catch (err: any) {
      setActionError(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [filterStatus, filterDirection]);

  const handleOpenHideModal = (review: AdminReviewItem) => {
    setTargetReview(review);
    setHideReason("");
    setActionError("");
    setActionSuccess("");
    setHideModalOpen(true);
  };

  const handleConfirmHide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReview) return;
    if (!hideReason.trim()) {
      setActionError("Alasan penyembunyian wajib diisi");
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      const res = await fetch(`/api/admin/reviews/${targetReview.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "HIDDEN",
          reason: hideReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menyembunyikan ulasan");

      setActionSuccess("Ulasan berhasil disembunyikan dan agregat rating telah dihitung ulang");
      setHideModalOpen(false);
      await loadReviews();
    } catch (err: any) {
      setActionError(err.message || "Gagal menyembunyikan ulasan");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreReview = async (review: AdminReviewItem) => {
    if (!confirm("Apakah Anda yakin ingin memulihkan ulasan ini agar tampil kembali?")) {
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      const res = await fetch(`/api/admin/reviews/${review.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "VISIBLE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memulihkan ulasan");

      setActionSuccess("Ulasan berhasil dipulihkan dan agregat rating telah dihitung ulang");
      await loadReviews();
    } catch (err: any) {
      setActionError(err.message || "Gagal memulihkan ulasan");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
              <span>Moderasi Ulasan Dua Arah</span>
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Pantau seluruh ulasan publik dan privat, tangani laporan pelanggaran, serta sembunyikan ulasan tidak pantas.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadReviews}
            isLoading={loading}
            className="flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border text-xs">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Status:</span>
          </div>
          <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border">
            {(["ALL", "VISIBLE", "HIDDEN"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterStatus === s
                    ? "bg-primary text-white"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {s === "ALL" ? "Semua" : s === "VISIBLE" ? "Tampil (Visible)" : "Tersembunyi (Hidden)"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-text-muted ml-0 sm:ml-4">
            <span className="font-semibold">Arah Penilaian:</span>
          </div>
          <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border">
            {(["ALL", "CUSTOMER_TO_DESIGNER", "DESIGNER_TO_CUSTOMER"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setFilterDirection(d)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterDirection === d
                    ? "bg-primary text-white"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {d === "ALL"
                  ? "Semua Arah"
                  : d === "CUSTOMER_TO_DESIGNER"
                  ? "Publik (Customer → Desainer)"
                  : "Privat (Desainer → Customer)"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-danger-soft border border-danger/20 rounded-md text-xs text-danger flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 bg-success-soft border border-success/30 rounded-md text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Review List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-text-muted animate-pulse">
          Memuat daftar ulasan...
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-xl p-10 text-center space-y-2">
          <MessageSquare className="w-8 h-8 mx-auto text-text-muted/60" />
          <p className="text-sm font-bold text-text">Tidak ada ulasan yang sesuai filter</p>
          <p className="text-xs text-text-muted">
            Belum ada ulasan yang dicatat dengan kriteria status dan arah yang dipilih.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const isPublic = rev.direction === "CUSTOMER_TO_DESIGNER";
            const isHidden = rev.status === "HIDDEN";

            return (
              <div
                key={rev.id}
                className={`bg-surface border rounded-xl p-5 space-y-3.5 shadow-2xs transition-all ${
                  isHidden
                    ? "border-danger/30 bg-danger-soft/20"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {/* Header Card */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isPublic
                          ? "bg-primary-soft text-primary"
                          : "bg-secondary-soft text-secondary font-semibold"
                      }`}
                    >
                      {isPublic
                        ? "PUBLIK: Customer → Desainer"
                        : "PRIVAT: Desainer → Customer"}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isHidden
                          ? "bg-danger text-white"
                          : "bg-success-soft text-success"
                      }`}
                    >
                      {isHidden ? "DISEMBUNYIKAN" : "VISIBLE"}
                    </span>

                    {rev.reports && rev.reports.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-danger-soft text-danger text-[10px] font-bold flex items-center gap-1">
                        <Flag className="w-2.5 h-2.5" />
                        <span>{rev.reports.length} Laporan Pelanggaran</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">{formatDate(rev.createdAt)}</span>
                    <Link
                      href={`/orders/${rev.orderId}`}
                      target="_blank"
                      className="text-primary hover:underline font-mono inline-flex items-center gap-1"
                    >
                      <span>Order #{rev.orderId.slice(0, 8)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Reviewer & Reviewee Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-background p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-text-muted block text-[11px]">Penilai (Reviewer):</span>
                    <span className="font-bold text-text">
                      {rev.reviewer?.displayName} ({rev.reviewer?.email})
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px]">Yang Dinilai (Reviewee):</span>
                    <span className="font-bold text-text">
                      {rev.reviewee?.displayName} ({rev.reviewee?.email})
                    </span>
                  </div>
                </div>

                {/* Rating & Komentar */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < rev.rating
                            ? "fill-amber-400 text-amber-500"
                            : "fill-transparent text-text-muted/30"
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-text">{rev.rating} / 5</span>
                  </div>

                  {rev.comment ? (
                    <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                      {rev.comment}
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted italic">Tanpa ulasan tertulis</p>
                  )}

                  {rev.designerReply && (
                    <div className="p-3 bg-surface border-l-4 border-primary rounded text-xs space-y-1">
                      <div className="flex items-center gap-1 font-bold text-primary">
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>Tanggapan Desainer:</span>
                      </div>
                      <p className="text-text leading-relaxed">{rev.designerReply}</p>
                    </div>
                  )}

                  {/* Keterangan jika ulasan disembunyikan */}
                  {isHidden && (
                    <div className="p-3 bg-danger-soft/60 border border-danger/20 rounded-lg text-xs text-danger space-y-1">
                      <span className="font-bold block">
                        Alasan Penyembunyian oleh Moderator:
                      </span>
                      <p>{rev.hiddenReason || "Tidak ada rincian alasan"}</p>
                    </div>
                  )}

                  {/* Rincian Laporan jika ada */}
                  {rev.reports && rev.reports.length > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1.5">
                      <span className="font-bold text-amber-700 block">
                        Daftar Laporan Pelanggaran Pengguna:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-text">
                        {rev.reports.map((rep) => (
                          <li key={rep.id}>
                            &ldquo;{rep.reason}&rdquo; ({formatDate(rep.createdAt)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Tombol Aksi Moderasi */}
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  {isHidden ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestoreReview(rev)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 text-xs text-success border-success/40 hover:bg-success-soft"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pulihkan Ulasan (Tampilkan Kembali)</span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenHideModal(rev)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 text-xs text-danger border-danger/40 hover:bg-danger-soft"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Sembunyikan Ulasan</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Sembunyikan Ulasan */}
      {hideModalOpen && targetReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="font-bold text-sm text-text flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-danger" />
                <span>Sembunyikan Ulasan Dari Publik</span>
              </h4>
              <button
                type="button"
                onClick={() => setHideModalOpen(false)}
                className="text-text-muted hover:text-text p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmHide} className="space-y-3.5">
              <p className="text-xs text-text-muted leading-relaxed">
                Menyembunyikan ulasan ini akan mengubah statusnya menjadi <strong>HIDDEN</strong> dan otomatis menghitung ulang rata-rata bintang penerima ulasan.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text">
                  Alasan Penyembunyian (Dicatat dalam Audit Log) <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={3}
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  placeholder="Contoh: Mengandung kata kasar, penghinaan pribadi, spam, atau nomor kontak terlarang..."
                  className="w-full text-xs p-2.5 rounded border border-border bg-background text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => setHideModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  isLoading={actionLoading}
                >
                  Konfirmasi Sembunyikan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
