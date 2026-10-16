"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { FeedPreviewImage } from "@/components/feed/FeedPreviewImage";
import { ProductItem } from "./ProductCard";
import { ReportProductModal } from "./ReportProductModal";
import { PRODUCT_REFUND_POLICY_TEXT } from "@/lib/constants/products";
import {
  X,
  Download,
  ShieldCheck,
  AlertCircle,
  FileBox,
  CheckCircle2,
  Wallet,
  ExternalLink,
  Loader2,
  User,
  Flag,
} from "lucide-react";

interface ProductDetailModalProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  onProductPurchased?: (productId: string) => void;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  isLoggedIn,
  onProductPurchased,
}: ProductDetailModalProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [refundBalance, setRefundBalance] = useState<number>(0);
  const [useBalance, setUseBalance] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [hasPurchasedLocally, setHasPurchasedLocally] = useState(false);

  useEffect(() => {
    if (product) {
      setHasPurchasedLocally(Boolean(product.hasPurchased || product.isOwner));
      setErrorMsg("");
    }
  }, [product]);

  useEffect(() => {
    if (isOpen && isLoggedIn && product && product.price > 0 && !hasPurchasedLocally) {
      fetch("/api/wallet/customer-balance")
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.refundBalance === "number") {
            setRefundBalance(data.refundBalance);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, isLoggedIn, product, hasPurchasedLocally]);

  if (!isOpen || !product) return null;

  const isFree = product.price === 0;
  const hasAccess = hasPurchasedLocally || Boolean(product.isOwner);

  const balanceToUse = useBalance ? Math.min(refundBalance, product.price) : 0;
  const remainingPay = Math.max(0, product.price - balanceToUse);

  const handleDownload = async () => {
    setIsDownloading(true);
    setErrorMsg("");

    try {
      // Panggil endpoint download dalam mode json untuk mendeteksi apakah eksternal link atau streaming file
      const res = await fetch(`/api/products/${product.id}/download?json=true`);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error?.message || "Gagal mengunduh produk");
      }

      if (data?.downloadType === "EXTERNAL_LINK" && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        // Direct download stream
        window.location.href = `/api/products/${product.id}/download`;
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat mengunduh berkas");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBuyOrClaim = async () => {
    if (!isLoggedIn) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setIsPurchasing(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/products/${product.id}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useBalance }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal memproses pembelian");
      }

      if (data.paidDirectly) {
        setHasPurchasedLocally(true);
        if (onProductPurchased) {
          onProductPurchased(product.id);
        }
        // Otomatis unduh setelah berhasil
        handleDownload();
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses pembelian");
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-alt/40 shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary-soft text-primary">
                {product.category}
              </span>
              {isFree ? (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-600 text-white">
                  Gratis
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold font-money bg-primary text-white">
                  {formatRupiah(product.price)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-surface-alt flex items-center justify-center text-text-muted hover:text-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-medium text-xs leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {/* Gambar Cover */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-surface-alt border border-border">
              {product.previewUrl ? (
                <FeedPreviewImage
                  src={product.previewUrl}
                  alt={product.title}
                  category={product.category}
                  aspectRatio="video"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
                  <FileBox className="w-12 h-12 mb-2 text-text-muted/60" />
                  <span>Aset Digital JokiDay</span>
                </div>
              )}
            </div>

            {/* Judul & Info Desainer */}
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-text leading-snug">
                {product.title}
              </h2>

              {product.designer && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Link
                    href={`/designer/${product.designer.username}`}
                    className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-xs overflow-hidden">
                      {product.designer.avatarUrl ? (
                        <img
                          src={product.designer.avatarUrl}
                          alt={product.designer.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        product.designer.displayName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-text text-xs flex items-center gap-1">
                        <span>{product.designer.displayName}</span>
                        {product.designer.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted">
                        @{product.designer.username}
                      </span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1 font-medium">
                      <Download className="w-3.5 h-3.5 text-primary" />
                      <span>{product.downloadCount} unduhan</span>
                    </span>
                    {product.fileExtension && (
                      <span className="font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-surface-alt">
                        .{product.fileExtension}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted">
                Deskripsi Produk
              </h4>
              <p className="text-text leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                {product.description}
              </p>
            </div>

            {/* Ketentuan Refund Digital */}
            <div className="p-3.5 rounded-xl bg-surface-alt/50 border border-border space-y-1.5 text-[11px] text-text-muted leading-relaxed">
              <div className="font-bold text-text flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Ketentuan Pengembalian Produk Digital</span>
              </div>
              <p>{PRODUCT_REFUND_POLICY_TEXT}</p>
            </div>

            {/* Opsi Pembayaran untuk Produk Berbayar yang Belum Dimiliki */}
            {!hasAccess && !isFree && isLoggedIn && (
              <div className="p-4 rounded-xl bg-surface-alt/60 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-text">Ringkasan Pembayaran</span>
                  <span className="font-bold font-money text-primary text-sm">
                    {formatRupiah(product.price)}
                  </span>
                </div>

                {refundBalance > 0 && (
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={useBalance}
                        onChange={(e) => setUseBalance(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-text">Gunakan Saldo Dompet</span>
                        <p className="text-[10px] text-text-muted">
                          Tersedia: {formatRupiah(refundBalance)}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-600">
                      -{formatRupiah(balanceToUse)}
                    </span>
                  </label>
                )}

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-bold text-text">
                  <span>Total Tagihan (QRIS)</span>
                  <span className="font-money text-base text-primary">
                    {formatRupiah(remainingPay)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Aksi */}
          <div className="p-4 border-t border-border bg-surface-alt/30 flex items-center justify-between gap-3 shrink-0">
            <div>
              {hasAccess && (
                <button
                  type="button"
                  onClick={() => setIsReportOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-danger hover:underline touch-target"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Laporkan Link Rusak</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-surface border border-border text-text font-bold text-xs hover:bg-surface-alt transition-colors"
              >
                Tutup
              </button>

              {hasAccess ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 touch-target"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyiapkan Berkas...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Unduh File Sekarang</span>
                    </>
                  )}
                </button>
              ) : !isLoggedIn ? (
                <Link
                  href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors touch-target"
                >
                  <User className="w-4 h-4" />
                  <span>Masuk untuk {isFree ? "Mengunduh" : "Membeli"}</span>
                </Link>
              ) : isFree ? (
                <button
                  type="button"
                  onClick={handleBuyOrClaim}
                  disabled={isPurchasing}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 touch-target"
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengklaim...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Klaim & Unduh Gratis</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBuyOrClaim}
                  disabled={isPurchasing}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 touch-target"
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses Tagihan...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>Beli Sekarang ({formatRupiah(product.price)})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReportProductModal
        productId={product.id}
        productTitle={product.title}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </>
  );
}
