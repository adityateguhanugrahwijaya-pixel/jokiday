"use client";

import React, { useState } from "react";
import { AlertCircle, X, Loader2, CheckCircle2 } from "lucide-react";

interface ReportProductModalProps {
  productId: string;
  productTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReportProductModal({
  productId,
  productTitle,
  isOpen,
  onClose,
  onSuccess,
}: ReportProductModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!reason.trim() || reason.trim().length < 5) {
      setError("Harap jelaskan kendala berkas secara lengkap (minimal 5 karakter)");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/products/${productId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal mengirimkan laporan");
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setReason("");
        if (onSuccess) onSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengirimkan laporan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-alt/40">
          <h3 className="font-bold text-sm text-text flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-danger" />
            <span>Laporkan File Rusak / Link Mati</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-surface-alt flex items-center justify-center text-text-muted hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-text">Laporan Berhasil Terkirim</h4>
            <p className="text-xs text-text-muted">
              Terima kasih! Tim admin JokiDay dan desainer terkait akan segera memeriksa file tersebut.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
            {error && (
              <div className="p-2.5 rounded-lg bg-danger/10 text-danger text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <p className="text-xs text-text-muted">
                Produk: <span className="font-bold text-text">{productTitle}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-text">
                Jelaskan Kendala <span className="text-danger">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="mis. Tautan Google Drive memerlukan izin akses (Access Denied), file ZIP corrupt saat diekstrak, atau file template tidak lengkap."
                className="w-full px-3 py-2 rounded-lg bg-surface-alt/60 border border-border focus:border-primary focus:outline-hidden text-text text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-lg bg-surface border border-border text-text font-bold text-xs hover:bg-surface-alt"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-danger text-white font-bold text-xs hover:bg-danger/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <span>Kirim Laporan</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
