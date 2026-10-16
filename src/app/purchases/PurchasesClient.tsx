"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/format";
import { FeedPreviewImage } from "@/components/feed/FeedPreviewImage";
import { ReportProductModal } from "@/components/products/ReportProductModal";
import {
  Download,
  ShoppingBag,
  ExternalLink,
  Flag,
  FileBox,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  CreditCard,
} from "lucide-react";

export interface PurchasedProductItem {
  id: string;
  productId: string;
  priceSnapshot: number;
  feeSnapshot: number;
  paymentMethod: string;
  purchasedAt: string;
  product: {
    id: string;
    title: string;
    description: string;
    category: string;
    sourceType: "DRIVE_FILE" | "EXTERNAL_LINK";
    fileExtension?: string | null;
    fileSizeBytes?: number | null;
    status: string;
    isDeleted: boolean;
    previewUrl?: string | null;
    downloadUrl: string;
    designer: {
      id: string;
      displayName: string;
      username: string;
      avatarUrl?: string | null;
    };
  };
}

export function PurchasesClient({
  initialPurchases,
}: {
  initialPurchases: PurchasedProductItem[];
}) {
  const [purchases, setPurchases] = useState<PurchasedProductItem[]>(initialPurchases);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; title: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDownload = async (item: PurchasedProductItem) => {
    setDownloadingId(item.productId);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/products/${item.productId}/download?json=true`);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error?.message || "Gagal mengunduh file produk");
      }

      if (data?.downloadType === "EXTERNAL_LINK" && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = `/api/products/${item.productId}/download`;
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengambil file produk");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-primary" />
            <span>Pembelian Aset & Desain Premade</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Daftar karya dan template digital yang telah Anda beli atau klaim. Anda dapat mengunduh ulang berkas kapan saja.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-surface border border-border text-text font-bold text-xs hover:bg-surface-alt transition-colors touch-target self-start sm:self-auto"
        >
          <span>Jelajahi Feed Desain</span>
        </Link>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-medium flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Konten Daftar Pembelian */}
      {purchases.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 my-8">
          <div className="w-14 h-14 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-text">Belum Ada Pembelian</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Anda belum pernah membeli atau mengklaim produk desain premade. Buka profil desainer untuk melihat template dan aset digital siap pakai.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary-hover transition-colors touch-target"
          >
            <span>Mulai Jelajah Karya</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {purchases.map((item) => (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs space-y-4"
            >
              <div className="space-y-3">
                {/* Bagian Atas: Cover & Informasi Utama */}
                <div className="flex gap-3.5">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-surface-alt border border-border shrink-0">
                    {item.product.previewUrl ? (
                      <FeedPreviewImage
                        src={item.product.previewUrl}
                        alt={item.product.title}
                        category={item.product.category}
                        aspectRatio="square"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <FileBox className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary-soft text-primary">
                        {item.product.category}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-alt text-text-muted">
                        {item.paymentMethod === "FREE"
                          ? "Gratis"
                          : item.paymentMethod === "BALANCE"
                          ? "Saldo Refund"
                          : "QRIS"}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-text line-clamp-2 leading-snug">
                      {item.product.title}
                    </h3>

                    <Link
                      href={`/designer/${item.product.designer.username}`}
                      className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1 truncate"
                    >
                      <span>oleh</span>
                      <span className="font-bold text-text underline">
                        {item.product.designer.displayName}
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Info Transaksi & Tanggal */}
                <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(item.purchasedAt)}</span>
                  </div>
                  <div className="font-bold text-text font-money">
                    {item.priceSnapshot === 0 ? "Gratis" : formatRupiah(item.priceSnapshot)}
                  </div>
                </div>
              </div>

              {/* Tombol Aksi: Unduh & Laporkan */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setReportTarget({ id: item.productId, title: item.product.title })
                  }
                  className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors touch-target"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Laporkan File Rusak</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(item)}
                  disabled={downloadingId === item.productId}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 touch-target"
                >
                  {downloadingId === item.productId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunduh...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh File</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Laporan */}
      {reportTarget && (
        <ReportProductModal
          productId={reportTarget.id}
          productTitle={reportTarget.title}
          isOpen={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
