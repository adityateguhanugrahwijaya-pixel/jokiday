"use client";

import React from "react";
import { AlertTriangle, ShieldCheck, X, Loader2 } from "lucide-react";

interface DeletePostConfirmModalProps {
  isOpen: boolean;
  postTitle?: string;
  isDeleting: boolean;
  relatedBriefsCount?: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeletePostConfirmModal({
  isOpen,
  postTitle,
  isDeleting,
  relatedBriefsCount = 0,
  onClose,
  onConfirm,
}: DeletePostConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="bg-surface border border-border rounded-xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-floating animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-danger-soft text-danger flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-text">Hapus Karya Feed</h3>
              <p className="text-xs text-text-muted mt-0.5">Konfirmasi penghapusan karya portofolio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-md text-text-muted hover:text-text hover:bg-background transition-colors disabled:opacity-50"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-text leading-relaxed">
          <p>
            Apakah Anda yakin ingin menghapus{" "}
            {postTitle ? <span className="font-bold text-text">&ldquo;{postTitle}&rdquo;</span> : "karya ini"}?{" "}
            Karya ini akan dihapus dan tidak bisa dikembalikan.
          </p>

          {relatedBriefsCount > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 space-y-1">
              <span className="font-bold block">Perhatian: Karya Pernah Dirujuk</span>
              <p className="text-[11px] leading-relaxed">
                Karya ini pernah dijadikan referensi pada {relatedBriefsCount} brief/pesanan pelanggan. Data pesanan tersebut tidak akan terganggu, namun tautan karya akan menampilkan status tidak lagi tersedia.
              </p>
            </div>
          )}

          <div className="p-3 bg-surface-alt border border-border rounded-lg flex items-start gap-2 text-text-muted">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-semibold text-text">File Google Drive Tetap Aman:</span> Tindakan ini tidak menghapus file asli di Google Drive Anda.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto h-9 px-4 rounded-lg border border-border text-xs font-semibold text-text-muted hover:text-text hover:bg-background transition-colors disabled:opacity-50 touch-target"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto h-9 px-4 rounded-lg bg-danger text-white text-xs font-bold hover:bg-danger-hover transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 touch-target shadow-sm"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <span>Hapus Karya</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
