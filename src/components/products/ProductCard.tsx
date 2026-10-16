"use client";

import React, { useState } from "react";
import Image from "next/image";
import { formatRupiah } from "@/lib/format";
import { FeedPreviewImage } from "@/components/feed/FeedPreviewImage";
import {
  Download,
  MoreVertical,
  Archive,
  RotateCcw,
  Trash2,
  ExternalLink,
  ShieldAlert,
  FileBox,
  CheckCircle2,
} from "lucide-react";

export interface ProductItem {
  id: string;
  designerId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  status: "PUBLISHED" | "ARCHIVED" | "HIDDEN";
  sourceType: "DRIVE_FILE" | "EXTERNAL_LINK";
  fileExtension?: string | null;
  fileSizeBytes?: number | null;
  downloadCount: number;
  hasAccess?: boolean;
  isOwner?: boolean;
  hasPurchased?: boolean;
  previewUrl?: string | null;
  designer?: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
  createdAt: string;
}

interface ProductCardProps {
  product: ProductItem;
  isOwner?: boolean;
  isAdmin?: boolean;
  onSelect: (product: ProductItem) => void;
  onArchiveToggle?: (product: ProductItem) => void;
  onDelete?: (product: ProductItem) => void;
}

export function ProductCard({
  product,
  isOwner,
  isAdmin,
  onSelect,
  onArchiveToggle,
  onDelete,
}: ProductCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isFree = product.price === 0;
  const isArchived = product.status === "ARCHIVED";
  const isHidden = product.status === "HIDDEN";

  return (
    <div
      onClick={() => onSelect(product)}
      className="group relative bg-surface border border-border hover:border-primary/50 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
    >
      {/* Gambar Cover / Pratinjau Watermarked */}
      <div className="relative aspect-[4/3] w-full bg-surface-alt overflow-hidden">
        {product.previewUrl ? (
          <FeedPreviewImage
            src={product.previewUrl}
            alt={product.title}
            category={product.category}
            aspectRatio="video"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-2">
            <FileBox className="w-10 h-10 text-text-muted/60" />
            <span className="text-xs">Aset Premade</span>
          </div>
        )}

        {/* Badge Kategori & Harga */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md">
            {product.category}
          </span>
          {isFree ? (
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
              Gratis
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold font-money bg-primary text-white shadow-xs">
              {formatRupiah(product.price)}
            </span>
          )}
        </div>

        {/* Status Badge jika tidak aktif */}
        {isArchived && (
          <div className="absolute bottom-2.5 left-2.5 z-10 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/90 text-white backdrop-blur-sm">
            Diarsipkan
          </div>
        )}
        {isHidden && (
          <div className="absolute bottom-2.5 left-2.5 z-10 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white backdrop-blur-sm flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            <span>Dimoderasi</span>
          </div>
        )}

        {/* Menu Titik Tiga (⋯) Pemilik atau Admin */}
        {(isOwner || isAdmin) && (
          <div
            className="absolute top-2.5 right-2.5 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors touch-target"
              title="Opsi Produk"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 mt-1.5 w-44 bg-surface border border-border rounded-lg shadow-xl py-1.5 z-30 text-xs"
                onMouseLeave={() => setShowMenu(false)}
              >
                {onArchiveToggle && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onArchiveToggle(product);
                    }}
                    className="w-full text-left px-3.5 py-2 text-text hover:bg-background flex items-center gap-2 transition-colors font-medium"
                  >
                    {isArchived ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 text-primary" />
                        <span>Pulihkan ke Publik</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5 text-amber-500" />
                        <span>Arsipkan Produk</span>
                      </>
                    )}
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(product);
                    }}
                    className="w-full text-left px-3.5 py-2 text-danger hover:bg-danger/10 flex items-center gap-2 transition-colors font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Produk</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Informasi Detail Produk */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <h3 className="font-bold text-sm sm:text-base text-text line-clamp-1 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Footer Kartu: Ekstensi, Hitungan Unduhan & Tombol Aksi */}
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-muted gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            {product.fileExtension && (
              <span className="font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-surface-alt text-text-muted">
                .{product.fileExtension}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Download className="w-3.5 h-3.5 text-text-muted" />
              <span>{product.downloadCount} unduhan</span>
            </span>
          </div>

          <div>
            {product.hasPurchased ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Dimiliki</span>
              </span>
            ) : isFree ? (
              <span className="font-bold text-primary text-xs hover:underline">
                Unduh &rarr;
              </span>
            ) : (
              <span className="font-bold text-primary text-xs hover:underline">
                Beli &rarr;
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
