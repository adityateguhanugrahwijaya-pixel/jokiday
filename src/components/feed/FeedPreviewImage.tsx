"use client";

import React, { useState } from "react";
import {
  FileText,
  FileArchive,
  Layers,
  ImageOff,
  Sparkles,
} from "lucide-react";

export interface FeedPreviewImageProps {
  src: string;
  alt: string;
  category?: string;
  aspectRatio?: "square" | "4/3" | "video";
  className?: string;
  fileName?: string;
  mimeType?: string;
}

/**
 * Komponen terpadu untuk menyajikan pratinjau karya/desain di Feed dan Profil Desainer.
 * - Dilengkapi skeleton loading animasi saat file sedang dimuat.
 * - Mendeteksi tipe berkas tanpa pratinjau langsung (PSD, AI, ZIP, CDR, PDF).
 * - Menangani error secara anggun dengan tampilan "Preview sedang tidak tersedia"
 *   tanpa pernah merusak grid atau tata letak kartu.
 */
export function FeedPreviewImage({
  src,
  alt,
  category,
  aspectRatio = "4/3",
  className = "",
  fileName,
  mimeType,
}: FeedPreviewImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Deteksi tipe file non-gambar (PSD, AI, ZIP, CDR, PDF) dari URL atau ekstensi
  const lowerSrc = (src || "").toLowerCase();
  const lowerName = (fileName || alt || "").toLowerCase();
  const lowerMime = (mimeType || "").toLowerCase();

  const isZip =
    lowerSrc.endsWith(".zip") ||
    lowerName.endsWith(".zip") ||
    lowerSrc.endsWith(".rar") ||
    lowerName.endsWith(".rar") ||
    lowerMime.includes("zip");

  const isVectorOrPsd =
    lowerSrc.endsWith(".psd") ||
    lowerName.endsWith(".psd") ||
    lowerSrc.endsWith(".ai") ||
    lowerName.endsWith(".ai") ||
    lowerSrc.endsWith(".eps") ||
    lowerName.endsWith(".eps") ||
    lowerSrc.endsWith(".cdr") ||
    lowerName.endsWith(".cdr");

  const isPdf =
    lowerSrc.endsWith(".pdf") ||
    lowerName.endsWith(".pdf") ||
    lowerMime.includes("pdf");

  const isNonImage = isZip || isVectorOrPsd || isPdf;

  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "video"
      ? "aspect-video"
      : "aspect-square sm:aspect-[4/3]";

  // 1. Placeholder untuk Tipe Berkas Khusus (PSD, AI, ZIP, PDF)
  if (isNonImage) {
    let fileTypeLabel = "BERKAS DESAIN";
    let Icon = FileText;
    let badgeColor = "bg-primary-soft text-primary border-primary/20";

    if (isZip) {
      fileTypeLabel = "ARSIP ZIP / RAR";
      Icon = FileArchive;
      badgeColor = "bg-amber-500/10 text-amber-600 border-amber-500/20";
    } else if (isVectorOrPsd) {
      fileTypeLabel = lowerName.endsWith(".psd") ? "MASTER PSD" : "VEKTOR AI / EPS";
      Icon = Layers;
      badgeColor = "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
    } else if (isPdf) {
      fileTypeLabel = "DOKUMEN PDF";
      Icon = FileText;
      badgeColor = "bg-danger-soft text-danger border-danger/20";
    }

    return (
      <div
        className={`relative ${aspectClass} bg-neutral-soft/40 border-b border-border/60 flex flex-col items-center justify-center p-4 select-none ${className}`}
      >
        <div className="w-12 h-12 rounded-xl bg-surface border border-border shadow-xs flex items-center justify-center text-text-muted mb-2">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <span
          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}
        >
          {fileTypeLabel}
        </span>
        <p className="text-[11px] font-medium text-text-muted mt-2 text-center line-clamp-1 max-w-[85%]">
          {alt || fileName || "Master Desain"}
        </p>
      </div>
    );
  }

  // 2. Fallback Tampilan Ramah jika File Rusak atau 404
  if (hasError) {
    return (
      <div
        className={`relative ${aspectClass} bg-neutral-soft/30 border-b border-border/50 flex flex-col items-center justify-center p-4 text-center select-none ${className}`}
      >
        <div className="w-10 h-10 rounded-full bg-neutral-soft flex items-center justify-center text-text-muted/60 mb-2">
          <ImageOff className="w-5 h-5 text-text-muted" />
        </div>
        <span className="text-xs font-bold text-text-muted block">
          Preview sedang tidak tersedia
        </span>
        <span className="text-[10px] text-text-muted/70 mt-0.5 block max-w-[80%] line-clamp-1">
          {category ? `Kategori: ${category}` : "Pratinjau dalam pembaruan"}
        </span>
      </div>
    );
  }

  // 3. Tampilan Gambar Standar dengan Skeleton Loading & Proteksi OnError
  return (
    <div
      className={`relative ${aspectClass} bg-background overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* Skeleton Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-soft/60 animate-pulse flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-text-muted/40 animate-spin" />
        </div>
      )}

      {/* Gambar Pratinjau */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`w-full h-full object-cover transition-all duration-300 pointer-events-none ${
          isLoading ? "opacity-0 scale-98" : "opacity-100 scale-100 group-hover:scale-102"
        }`}
      />

      {/* Lapisan Transparan Pelindung (Anti-Drag & Anti-Klik Kanan sesuai DESIGN.md) */}
      <div
        className="absolute inset-0 z-10 select-none bg-transparent pointer-events-auto"
        onContextMenu={(e) => e.preventDefault()}
        aria-hidden="true"
      />
    </div>
  );
}
