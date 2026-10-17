"use client";

import React, { useState, useEffect } from "react";
import { Star, MessageSquare, Edit3, CheckCircle2, Lock, AlertTriangle, Send } from "lucide-react";
import { StarRatingInput } from "./StarRatingInput";
import { CustomerReputationCard, CustomerReputationData } from "./CustomerReputationCard";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  direction: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  isOwnReview: boolean;
  reviewerName: string;
  designerReply?: string | null;
  designerRepliedAt?: string | null;
}

export interface OrderReviewSectionProps {
  orderId: string;
  orderStatus: string;
  viewerRole: "CUSTOMER" | "DESIGNER" | "ADMIN";
  initialCustomerReputation?: CustomerReputationData | null;
}

export function OrderReviewSection({
  orderId,
  orderStatus,
  viewerRole,
  initialCustomerReputation,
}: OrderReviewSectionProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [customerReview, setCustomerReview] = useState<ReviewItem | null>(null);
  const [designerReview, setDesignerReview] = useState<ReviewItem | null>(null);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const isCompleted = orderStatus === "COMPLETED";

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}/reviews`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setCustomerReview(json.data.customerReview || null);
        setDesignerReview(json.data.designerReview || null);

        // Inisialisasi form jika sudah ada review milik user ini
        const myReview =
          viewerRole === "CUSTOMER"
            ? json.data.customerReview
            : json.data.designerReview;

        if (myReview) {
          setRating(myReview.rating);
          setComment(myReview.comment || "");
        } else {
          setRating(0);
          setComment("");
        }
      }
    } catch (err) {
      console.warn("Gagal mengambil data ulasan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCompleted) {
      loadReviews();
    }
  }, [orderId, isCompleted, viewerRole]);

  // Hanya tampilkan jika order sudah berstatus COMPLETED
  if (!isCompleted) return null;

  const currentReview = viewerRole === "CUSTOMER" ? customerReview : designerReview;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setErrorMsg("Silakan pilih nilai bintang (1 sampai 5) terlebih dahulu sebelum mengirim penilaian.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (currentReview && isEditing) {
        // Edit review
        const res = await fetch(`/api/orders/${orderId}/reviews/${currentReview.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, comment }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui ulasan");
        setSuccessMsg("Ulasan berhasil diperbarui");
        setIsEditing(false);
      } else {
        // Buat review baru
        const res = await fetch(`/api/orders/${orderId}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, comment }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Gagal mengirim ulasan");
        setSuccessMsg("Penilaian Anda berhasil disimpan");
      }
      await loadReviews();
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses penilaian");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      {/* 1. Tampilan Reputasi Customer untuk Desainer */}
      {viewerRole === "DESIGNER" && initialCustomerReputation && (
        <CustomerReputationCard reputation={initialCustomerReputation} />
      )}

      {/* 2. Kartu Penilaian Utama Sesuai Peran */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-5 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
              </div>
              <h3 className="font-bold text-base text-text">
                {viewerRole === "CUSTOMER"
                  ? "Beri Penilaian untuk Desainer"
                  : "Beri Penilaian untuk Pelanggan"}
              </h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {viewerRole === "CUSTOMER"
                ? "Bagikan pengalamanmu bekerja sama dengan desainer ini. Ulasan akan tampil secara publik di profil desainer."
                : "Penilaian ini bersifat privat dan hanya dapat dilihat oleh sesama desainer untuk referensi kerja sama, tidak akan pernah dilihat oleh pelanggan."}
            </p>
          </div>

          {currentReview && !isEditing && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                currentReview.canEdit
                  ? "bg-primary-soft text-primary"
                  : "bg-neutral-soft text-text-muted"
              }`}
            >
              {currentReview.canEdit ? (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Dapat diedit (Jendela 24 jam)</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Terkunci (Lewat 24 jam)</span>
                </>
              )}
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-danger-soft border border-danger/20 rounded-md text-xs text-danger flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-success-soft border border-success/30 rounded-md text-xs text-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-6 text-center text-xs text-text-muted animate-pulse">
            Memuat data ulasan...
          </div>
        ) : currentReview && !isEditing ? (
          /* Tampilan Review Yang Sudah Dibuat */
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="p-4 bg-background border border-border rounded-lg space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < currentReview.rating
                          ? "fill-amber-400 text-amber-500"
                          : "fill-transparent text-text-muted/30"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-text">{currentReview.rating} / 5</span>
                </div>
                <span className="text-xs text-text-muted">
                  Dikirim pada {formatDate(currentReview.createdAt)}
                </span>
              </div>

              {currentReview.comment ? (
                <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                  {currentReview.comment}
                </p>
              ) : (
                <p className="text-xs text-text-muted italic">
                  Tanpa komentar tertulis
                </p>
              )}

              {/* Tanggapan Desainer jika ada */}
              {currentReview.designerReply && (
                <div className="mt-3 p-3 bg-surface border-l-4 border-primary rounded text-xs space-y-1">
                  <span className="font-bold text-primary block">
                    Tanggapan dari Desainer:
                  </span>
                  <p className="text-text leading-relaxed">
                    {currentReview.designerReply}
                  </p>
                </div>
              )}
            </div>

            {currentReview.canEdit && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Ubah Penilaian</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Formulir Input / Edit Review */
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-text uppercase tracking-wider">
                Nilai Bintang <span className="text-danger">*</span>
              </label>
              <StarRatingInput
                value={rating}
                onChange={setRating}
                disabled={submitting}
                size="md"
              />
              {rating === 0 && (
                <p className="text-[11px] text-text-muted">
                  Pilih 1 sampai 5 bintang untuk menilai.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-text uppercase tracking-wider">
                  Ulasan Tertulis (Opsional)
                </label>
                <span className="text-text-muted text-[11px] font-mono">
                  {comment.length} / 500
                </span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                disabled={submitting}
                rows={3}
                placeholder={
                  viewerRole === "CUSTOMER"
                    ? "Ceritakan kepuasan hasil karya, ketepatan waktu, dan keramahan komunikasi desainer..."
                    : "Catat kejelasan instruksi, kecepatan feedback, dan kerja sama pelanggan..."
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-text text-sm focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-muted/60"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={submitting}
                  onClick={() => {
                    setIsEditing(false);
                    if (currentReview) {
                      setRating(currentReview.rating);
                      setComment(currentReview.comment || "");
                    } else {
                      setRating(0);
                      setComment("");
                    }
                  }}
                >
                  Batal
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting || rating < 1}
                isLoading={submitting}
                className="flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isEditing ? "Simpan Perubahan" : "Kirim Penilaian"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
