"use client";

import React, { useState } from "react";
import { Star, Flag, MessageSquare, CheckCircle2, AlertTriangle, X, CornerDownRight, Send } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export interface PublicReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  createdAt: string;
  designerReply?: string | null;
  designerRepliedAt?: string | null;
}

export interface PublicDesignerReviewsListProps {
  designerId: string;
  isOwner: boolean;
  reviews: PublicReviewItem[];
  totalReviews: number;
  ratingAvg: number;
}

export function PublicDesignerReviewsList({
  designerId,
  isOwner,
  reviews: initialReviews,
  totalReviews,
  ratingAvg,
}: PublicDesignerReviewsListProps) {
  const [reviews, setReviews] = useState<PublicReviewItem[]>(initialReviews);

  // Modal laporkan
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState("");

  // Reply form states
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");

  const handleOpenReport = (reviewId: string) => {
    setReportingReviewId(reviewId);
    setReportReason("");
    setReportSuccess(false);
    setReportError("");
    setReportModalOpen(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim() || !reportingReviewId) {
      setReportError("Harap isi alasan pelaporan");
      return;
    }

    setReportSubmitting(true);
    setReportError("");

    try {
      const res = await fetch(`/api/reviews/${reportingReviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal melaporkan ulasan");
      setReportSuccess(true);
      setTimeout(() => {
        setReportModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setReportError(err.message || "Gagal melaporkan ulasan");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleSendReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      setReplyError("Balasan tidak boleh kosong");
      return;
    }

    setReplySubmitting(true);
    setReplyError("");

    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengirim balasan");

      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, designerReply: replyText.trim(), designerRepliedAt: new Date().toISOString() }
            : r
        )
      );
      setReplyingReviewId(null);
      setReplyText("");
    } catch (err: any) {
      setReplyError(err.message || "Gagal mengirim balasan");
    } finally {
      setReplySubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Rangkuman Rating */}
      <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-lg text-text">
            Ulasan Pelanggan ({totalReviews})
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Kepuasan pelanggan nyata yang telah menyelesaikan pesanan dengan desainer ini.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-background border border-border px-4 py-2.5 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
          </div>
          <div>
            {totalReviews >= 3 ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="font-extrabold text-xl text-text font-mono">
                    {ratingAvg.toFixed(1)}
                  </span>
                  <span className="text-xs text-text-muted">/ 5.0</span>
                </div>
                <span className="text-[11px] text-text-muted">
                  Berdasarkan {totalReviews} ulasan
                </span>
              </>
            ) : totalReviews > 0 ? (
              <>
                <div className="font-extrabold text-sm text-text">
                  Desainer Aktif
                </div>
                <span className="text-[11px] text-text-muted">
                  {totalReviews} pesanan selesai dengan ulasan
                </span>
              </>
            ) : (
              <>
                <div className="font-bold text-sm text-text">
                  Belum Ada Ulasan
                </div>
                <span className="text-[11px] text-text-muted">
                  Siap melayani pesanan pertama
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Daftar Ulasan */}
      {reviews.length === 0 ? (
        <div className="p-8 bg-surface border border-dashed border-border rounded-xl text-center space-y-2">
          <MessageSquare className="w-8 h-8 mx-auto text-text-muted/60" />
          <p className="text-sm font-semibold text-text">
            Belum ada ulasan dari pelanggan
          </p>
          <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
            Ulasan akan otomatis muncul di sini setelah pelanggan menyetujui hasil karya pesanan desainer.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-surface border border-border rounded-xl p-4 sm:p-5 space-y-3 shadow-2xs transition-shadow hover:shadow-xs"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                    {rev.reviewerName.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-text block">
                      {rev.reviewerName}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {formatDate(rev.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded-md">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>{rev.rating}.0</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenReport(rev.id)}
                    title="Laporkan ulasan ini"
                    className="text-text-muted hover:text-danger text-xs p-1 rounded transition-colors inline-flex items-center gap-1"
                  >
                    <Flag className="w-3 h-3" />
                    <span className="text-[11px] hidden sm:inline">Laporkan</span>
                  </button>
                </div>
              </div>

              {rev.comment && (
                <p className="text-sm text-text leading-relaxed whitespace-pre-wrap pl-9 sm:pl-9.5">
                  {rev.comment}
                </p>
              )}

              {/* Tanggapan desainer jika sudah ada */}
              {rev.designerReply && (
                <div className="ml-6 sm:ml-9 mt-3 p-3 bg-background border-l-4 border-primary rounded-r-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>Tanggapan Desainer</span>
                    {rev.designerRepliedAt && (
                      <span className="text-[10px] text-text-muted font-normal">
                        • {formatDate(rev.designerRepliedAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-text leading-relaxed">
                    {rev.designerReply}
                  </p>
                </div>
              )}

              {/* Tombol balas jika pemilik profil dan belum membalas */}
              {isOwner && !rev.designerReply && (
                <div className="ml-6 sm:ml-9 pt-1">
                  {replyingReviewId === rev.id ? (
                    <div className="space-y-2 p-3 bg-background border border-border rounded-lg">
                      <span className="text-xs font-bold text-text">
                        Tanggapi Ulasan Pelanggan (Satu Kali)
                      </span>
                      {replyError && (
                        <p className="text-xs text-danger">{replyError}</p>
                      )}
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Tuliskan ucapan terima kasih atau tanggapan profesional Anda..."
                        className="w-full text-xs p-2.5 rounded border border-border bg-surface text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={replySubmitting}
                          onClick={() => {
                            setReplyingReviewId(null);
                            setReplyText("");
                          }}
                        >
                          Batal
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={replySubmitting}
                          onClick={() => handleSendReply(rev.id)}
                          className="flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Kirim Balasan</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingReviewId(rev.id);
                        setReplyText("");
                        setReplyError("");
                      }}
                      className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Balas Ulasan Ini</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Laporkan Ulasan */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="font-bold text-sm text-text flex items-center gap-2">
                <Flag className="w-4 h-4 text-danger" />
                <span>Laporkan Ulasan Ini</span>
              </h4>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="text-text-muted hover:text-text p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-success" />
                <p className="text-sm font-bold text-text">Laporan Terkirim</p>
                <p className="text-xs text-text-muted">
                  Terima kasih. Tim moderator akan meninjau ulasan ini.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-3.5">
                {reportError && (
                  <div className="p-2.5 bg-danger-soft border border-danger/20 rounded text-xs text-danger">
                    {reportError}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text">
                    Alasan Pelaporan <span className="text-danger">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Contoh: Mengandung kata-kata kasar, spam, fitnah, atau informasi pribadi..."
                    className="w-full text-xs p-2.5 rounded border border-border bg-background text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={reportSubmitting}
                    onClick={() => setReportModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    size="sm"
                    isLoading={reportSubmitting}
                  >
                    Kirim Laporan
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
