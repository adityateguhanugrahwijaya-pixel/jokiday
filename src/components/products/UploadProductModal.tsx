"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { formatRupiah } from "@/lib/format";
import {
  PRODUCT_CATEGORIES,
  MIN_PAID_PRODUCT_PRICE,
  PRODUCT_ALLOWED_EXTENSIONS,
  PRODUCT_REFUND_POLICY_TEXT,
  validateProductPrice,
  validateProductExternalUrl,
} from "@/lib/constants/products";
import {
  X,
  Upload,
  Link as LinkIcon,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  FileBox,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Info,
} from "lucide-react";
import Link from "next/link";

interface UploadProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProduct: any) => void;
  isDriveConnected: boolean;
}

export function UploadProductModal({
  isOpen,
  onClose,
  onSuccess,
  isDriveConnected,
}: UploadProductModalProps) {
  // Hydration state for createPortal
  const [mounted, setMounted] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("template");
  const [accessType, setAccessType] = useState<"PAID" | "FREE">("PAID");
  const [price, setPrice] = useState("25000");

  const [sourceType, setSourceType] = useState<"EXTERNAL_LINK" | "DRIVE_FILE">("EXTERNAL_LINK");
  const [externalUrl, setExternalUrl] = useState("");
  const [productFile, setProductFile] = useState<File | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const coverInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if form has user inputs (dirty state)
  const isDirty =
    title.trim() !== "" ||
    description.trim() !== "" ||
    coverFile !== null ||
    productFile !== null ||
    externalUrl.trim() !== "";

  // Safe close handler with dirty check
  const requestClose = () => {
    if (isSubmitting) return;
    if (isDirty) {
      const confirmDiscard = window.confirm(
        "Perubahan yang belum disimpan akan hilang. Yakin ingin menutup form?"
      );
      if (!confirmDiscard) return;
    }
    onClose();
  };

  // Lock body scroll and register Escape key listener while open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isDirty, isSubmitting]);

  // Clean up preview object URL on unmount
  useEffect(() => {
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  if (!mounted || !isOpen) return null;

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        cover: "File sampul harus berupa gambar (JPG, PNG, atau WEBP)",
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        cover: "Ukuran file sampul maksimal 10 MB",
      }));
      return;
    }

    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.cover;
      return next;
    });
  };

  const handleRemoveCover = () => {
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverFile(null);
    setCoverPreview(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  };

  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !PRODUCT_ALLOWED_EXTENSIONS.includes(ext as any)) {
      setFieldErrors((prev) => ({
        ...prev,
        productFile: `Ekstensi .${ext || ""} tidak didukung. Pilihan: ${PRODUCT_ALLOWED_EXTENSIONS.join(", ").toUpperCase()}`,
      }));
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        productFile: "Ukuran file aset digital maksimal 50 MB untuk upload langsung ke Google Drive",
      }));
      return;
    }

    setProductFile(file);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.productFile;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    const errors: Record<string, string> = {};

    // 1. Cover validation
    if (!coverFile) {
      errors.cover = "Gambar sampul / pratinjau produk wajib diunggah";
    }

    // 2. Title validation
    if (!title.trim()) {
      errors.title = "Judul produk wajib diisi";
    }

    // 3. Description validation
    if (!description.trim()) {
      errors.description = "Deskripsi & kelengkapan aset wajib diisi";
    }

    // 4. Price validation
    const isFree = accessType === "FREE";
    const priceVal = validateProductPrice(price, isFree);
    if (!priceVal.isValid) {
      errors.price = priceVal.error || "Harga tidak valid";
    }

    // 5. File source validation
    if (sourceType === "DRIVE_FILE") {
      if (!isDriveConnected) {
        errors.productFile =
          "Google Drive Anda belum terhubung. Gunakan opsi Tempel Link atau hubungkan Drive di Pengaturan.";
      } else if (!productFile) {
        errors.productFile = "File produk aset digital wajib dipilih";
      }
    } else {
      const linkVal = validateProductExternalUrl(externalUrl);
      if (!linkVal.isValid) {
        errors.externalUrl = linkVal.error || "Tautan unduhan tidak valid";
      }
    }

    // 6. Copyright agreement
    if (!copyrightAgreed) {
      errors.copyright = "Kamu wajib menyetujui pernyataan kepemilikan hak cipta atas karya ini";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError("Mohon periksa dan lengkapi bagian formulir yang bertanda merah di bawah.");
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("category", category);
      fd.append("isFree", String(isFree));
      fd.append("price", String(priceVal.value || 0));
      fd.append("sourceType", sourceType);
      fd.append("copyrightAgreed", String(copyrightAgreed));
      fd.append("coverFile", coverFile!);

      if (sourceType === "DRIVE_FILE" && productFile) {
        fd.append("productFile", productFile);
      } else if (sourceType === "EXTERNAL_LINK") {
        fd.append("externalUrl", externalUrl.trim());
      }

      const res = await fetch("/api/products", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal menerbitkan produk premade");
      }

      onSuccess(data.product);
      onClose();
    } catch (err: any) {
      setGeneralError(err.message || "Terjadi kesalahan saat mengunggah produk");
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs overscroll-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-product-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER (Fixed, pinned at top) */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
          <div className="min-w-0 pr-3">
            <h2
              id="upload-product-modal-title"
              className="text-base sm:text-lg font-bold text-text flex items-center gap-2 truncate"
            >
              <FileBox className="w-5 h-5 text-primary shrink-0" />
              <span className="truncate">Unggah Produk Premade / Aset Digital</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
              Jual atau bagikan template, aset grafis, dan desain siap pakai langsung.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="w-8 h-8 rounded-full hover:bg-surface-alt flex items-center justify-center text-text-muted hover:text-text transition-colors shrink-0"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. FORM BODY & STICKY FOOTER */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Body */}
          <div
            ref={bodyRef}
            className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 text-xs sm:text-sm"
          >
            {generalError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-medium text-xs leading-relaxed">{generalError}</p>
              </div>
            )}

            {/* 1. Cover / Preview Image */}
            <div className="space-y-2">
              <label htmlFor="cover-upload-input" className="block font-bold text-text">
                Gambar Sampul / Pratinjau <span className="text-danger">*</span>
              </label>

              <input
                id="cover-upload-input"
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleCoverChange}
                className="hidden"
              />

              {coverPreview && coverFile ? (
                <div className="rounded-xl border border-border bg-surface-alt/40 p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-20 rounded-lg overflow-hidden border border-border bg-black/10 shrink-0">
                    <img
                      src={coverPreview}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-text truncate" title={coverFile.name}>
                      {coverFile.name}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {(coverFile.size / (1024 * 1024)).toFixed(2)} MB • Format Gambar Valid
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Watermark pelindung otomatis diterapkan di server</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-alt font-semibold text-xs transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ganti</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 font-semibold text-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className={`w-full h-36 sm:h-40 rounded-xl border-2 border-dashed ${
                    fieldErrors.cover ? "border-danger bg-danger/5" : "border-border hover:border-primary/60 bg-surface-alt/30"
                  } flex flex-col items-center justify-center cursor-pointer transition-colors p-4 text-center group`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-text">
                    Klik atau seret gambar sampul ke sini
                  </span>
                  <span className="text-[11px] text-text-muted mt-0.5">
                    JPG, PNG, atau WEBP (Maksimal 10 MB)
                  </span>
                  <span className="text-[10px] text-text-muted/80 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    Otomatis diberi watermark pelindung JokiDay
                  </span>
                </div>
              )}

              {fieldErrors.cover && (
                <p className="text-xs text-danger font-medium">{fieldErrors.cover}</p>
              )}
            </div>

            {/* 2. Judul & Kategori (Responsive Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="product-title-input" className="block font-bold text-text">
                  Judul Produk <span className="text-danger">*</span>
                </label>
                <input
                  id="product-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.title;
                        return next;
                      });
                    }
                  }}
                  maxLength={150}
                  placeholder="mis. Template Feed Instagram UMKM"
                  className={`w-full px-3 py-2 rounded-lg bg-surface-alt/60 border ${
                    fieldErrors.title ? "border-danger" : "border-border"
                  } focus:border-primary focus:outline-hidden text-text text-xs sm:text-sm`}
                />
                {fieldErrors.title && (
                  <p className="text-xs text-danger font-medium">{fieldErrors.title}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="product-category-select" className="block font-bold text-text">
                  Kategori <span className="text-danger">*</span>
                </label>
                <select
                  id="product-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-alt/60 border border-border focus:border-primary focus:outline-hidden text-text text-xs sm:text-sm"
                >
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Deskripsi */}
            <div className="space-y-1.5">
              <label htmlFor="product-description-input" className="block font-bold text-text">
                Deskripsi & Kelengkapan Aset <span className="text-danger">*</span>
              </label>
              <textarea
                id="product-description-input"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.description;
                      return next;
                    });
                  }
                }}
                rows={4}
                maxLength={3000}
                placeholder="Jelaskan isi paket aset, software yang dibutuhkan (Canva, Photoshop, Figma, Illustrator), format berkas, resolusi, dan petunjuk pakai."
                className={`w-full px-3 py-2 rounded-lg bg-surface-alt/60 border ${
                  fieldErrors.description ? "border-danger" : "border-border"
                } focus:border-primary focus:outline-hidden text-text text-xs sm:text-sm leading-relaxed`}
              />
              {fieldErrors.description && (
                <p className="text-xs text-danger font-medium">{fieldErrors.description}</p>
              )}
            </div>

            {/* 4. Tipe Akses Produk (Segmented Control Berimbang) */}
            <div className="p-4 rounded-xl bg-surface-alt/50 border border-border space-y-3.5">
              <div>
                <span className="font-bold text-text text-xs sm:text-sm">Tipe Akses Produk</span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Tentukan apakah produk ini dijual atau dibagikan gratis kepada pengguna.
                </p>
              </div>

              {/* Segmented Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setAccessType("PAID");
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.price;
                      return next;
                    });
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    accessType === "PAID"
                      ? "border-primary bg-primary-soft/30 ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-surface hover:bg-surface-alt/60 text-text-muted"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      accessType === "PAID"
                        ? "border-primary bg-primary text-white"
                        : "border-text-muted/40"
                    }`}
                  >
                    {accessType === "PAID" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-bold text-xs sm:text-sm whitespace-nowrap ${
                          accessType === "PAID" ? "text-primary" : "text-text"
                        }`}
                      >
                        Berbayar
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                        Jual
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                      Tetapkan harga jual. Pembeli wajib membayar sebelum mengunduh.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccessType("FREE");
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.price;
                      return next;
                    });
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    accessType === "FREE"
                      ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40 shadow-xs"
                      : "border-border bg-surface hover:bg-surface-alt/60 text-text-muted"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      accessType === "FREE"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-text-muted/40"
                    }`}
                  >
                    {accessType === "FREE" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-bold text-xs sm:text-sm whitespace-nowrap ${
                          accessType === "FREE" ? "text-emerald-600 dark:text-emerald-400" : "text-text"
                        }`}
                      >
                        Gratis (Rp 0)
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Cuma-cuma
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                      Dibagikan gratis. Pengguna yang login langsung dapat mengunduh.
                    </p>
                  </div>
                </button>
              </div>

              {/* Price input when PAID */}
              {accessType === "PAID" ? (
                <div className="pt-3 border-t border-border space-y-2">
                  <label htmlFor="product-price-input" className="block font-bold text-text">
                    Harga Penjualan (Rp) <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-text-muted font-bold text-xs sm:text-sm select-none">
                      Rp
                    </span>
                    <input
                      id="product-price-input"
                      type="number"
                      min={MIN_PAID_PRODUCT_PRICE}
                      step={1000}
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        if (fieldErrors.price) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.price;
                            return next;
                          });
                        }
                      }}
                      placeholder="25000"
                      className={`w-full pl-10 pr-3 py-2 rounded-lg bg-surface border ${
                        fieldErrors.price ? "border-danger" : "border-border"
                      } focus:border-primary focus:outline-hidden text-text font-money text-xs sm:text-sm`}
                    />
                  </div>
                  {fieldErrors.price ? (
                    <p className="text-xs text-danger font-medium">{fieldErrors.price}</p>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-text-muted">
                      <span>Minimal harga {formatRupiah(MIN_PAID_PRODUCT_PRICE)}</span>
                      <span>Fee platform 5% (kamu menerima 95% langsung ke dompet)</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Produk ini dapat diunduh cuma-cuma oleh semua pengguna yang sudah masuk (login) ke JokiDay tanpa dipungut biaya.
                  </span>
                </div>
              )}
            </div>

            {/* 5. Sumber Berkas: Upload ke Drive vs Tempel Link */}
            <div className="space-y-3">
              <label className="block font-bold text-text">
                Sumber Berkas Aset Digital <span className="text-danger">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSourceType("EXTERNAL_LINK");
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.productFile;
                      delete next.externalUrl;
                      return next;
                    });
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
                    sourceType === "EXTERNAL_LINK"
                      ? "border-primary bg-primary-soft/30 text-primary ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-surface-alt/40 text-text-muted hover:text-text"
                  }`}
                >
                  <LinkIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs">Tempel Link Eksternal</div>
                    <div className="text-[10px] text-text-muted mt-0.5 leading-snug">
                      Google Drive publik, Mega, Dropbox, Canva, Figma
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSourceType("DRIVE_FILE");
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.productFile;
                      delete next.externalUrl;
                      return next;
                    });
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
                    sourceType === "DRIVE_FILE"
                      ? "border-primary bg-primary-soft/30 text-primary ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-surface-alt/40 text-text-muted hover:text-text"
                  }`}
                >
                  <HardDrive className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs">Upload ke Google Drive</div>
                    <div className="text-[10px] text-text-muted mt-0.5 leading-snug">
                      Tersimpan rapi di folder JokiDay/produk akun Drive kamu
                    </div>
                  </div>
                </button>
              </div>

              {sourceType === "EXTERNAL_LINK" ? (
                <div className="space-y-2 p-3.5 rounded-xl bg-surface-alt/50 border border-border">
                  <label htmlFor="product-external-url-input" className="block font-semibold text-text text-xs">
                    Tautan Unduhan / Akses Aset (URL) <span className="text-danger">*</span>
                  </label>
                  <input
                    id="product-external-url-input"
                    type="url"
                    value={externalUrl}
                    onChange={(e) => {
                      setExternalUrl(e.target.value);
                      if (fieldErrors.externalUrl) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.externalUrl;
                          return next;
                        });
                      }
                    }}
                    placeholder="https://drive.google.com/... atau https://www.canva.com/..."
                    className={`w-full px-3 py-2 rounded-lg bg-surface border ${
                      fieldErrors.externalUrl ? "border-danger" : "border-border"
                    } focus:border-primary focus:outline-hidden text-text text-xs font-mono`}
                  />
                  {fieldErrors.externalUrl && (
                    <p className="text-xs text-danger font-medium">{fieldErrors.externalUrl}</p>
                  )}
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed flex items-start gap-2 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Pastikan tautan sudah diatur publik (<strong>"Siapa saja yang memiliki link dapat melihat/mengunduh"</strong>) agar pembeli tidak terhalang izin akses. Tautan asli akan disamarkan secara aman oleh sistem JokiDay.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3.5 rounded-xl bg-surface-alt/50 border border-border">
                  {!isDriveConnected ? (
                    <div className="p-3.5 rounded-xl bg-primary-soft/40 border border-primary/20 text-text space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div className="text-xs leading-relaxed">
                          <strong className="block text-text font-bold">Google Drive Belum Terhubung</strong>
                          Akun Google Drive Anda belum terhubung. Hubungkan Drive Anda agar file dapat disimpan langsung ke akun Google Drive Anda secara aman.
                        </div>
                      </div>
                      <Link
                        href="/profile"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary-hover transition-colors"
                      >
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>Hubungkan Google Drive di Profil</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        ref={productFileInputRef}
                        type="file"
                        accept=".zip,.rar,.7z,.tar,.gz,.psd,.ai,.eps,.pdf,.svg,.png,.jpg,.jpeg,.fig,.xd,.cdr,.indd"
                        onChange={handleProductFileChange}
                        className="hidden"
                      />

                      {productFile ? (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
                          <div className="flex items-center gap-2.5 truncate">
                            <FileBox className="w-5 h-5 text-primary shrink-0" />
                            <div className="truncate">
                              <p className="font-bold text-xs text-text truncate" title={productFile.name}>
                                {productFile.name}
                              </p>
                              <p className="text-[10px] text-text-muted">
                                {(productFile.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setProductFile(null)}
                            className="text-xs text-danger font-bold hover:underline ml-2 shrink-0"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => productFileInputRef.current?.click()}
                          className={`w-full p-4 rounded-xl border-2 border-dashed ${
                            fieldErrors.productFile ? "border-danger bg-danger/5" : "border-border hover:border-primary/60 bg-surface"
                          } flex flex-col items-center justify-center cursor-pointer transition-colors text-center`}
                        >
                          <Upload className="w-5 h-5 text-primary mb-1.5" />
                          <span className="font-bold text-xs text-text">Pilih File Aset Digital</span>
                          <span className="text-[10px] text-text-muted mt-0.5">
                            ZIP, RAR, 7Z, PSD, AI, EPS, PDF, SVG, FIG, XD, CDR (Maks. 50 MB)
                          </span>
                        </div>
                      )}

                      {fieldErrors.productFile && (
                        <p className="text-xs text-danger font-medium">{fieldErrors.productFile}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 6. Ringkasan Kebijakan Refund Produk Digital */}
            <div className="p-3 rounded-xl bg-surface-alt/40 border border-border flex items-start gap-2.5 text-text-muted">
              <Info className="w-4 h-4 shrink-0 text-text-muted mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                {PRODUCT_REFUND_POLICY_TEXT}
              </p>
            </div>

            {/* 7. Pernyataan Hak Cipta Wajib */}
            <div className="pt-1">
              <label htmlFor="product-copyright-agreement" className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  id="product-copyright-agreement"
                  type="checkbox"
                  checked={copyrightAgreed}
                  onChange={(e) => {
                    setCopyrightAgreed(e.target.checked);
                    if (fieldErrors.copyright) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.copyright;
                        return next;
                      });
                    }
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
                <span className="text-xs text-text leading-relaxed">
                  Saya menyatakan bahwa saya adalah pemilik sah dan pemegang hak cipta atas aset digital ini. Karya ini tidak melanggar hak cipta pihak ketiga mana pun. <span className="text-danger">*</span>
                </span>
              </label>
              {fieldErrors.copyright && (
                <p className="text-xs text-danger font-medium mt-1 ml-6.5">{fieldErrors.copyright}</p>
              )}
            </div>
          </div>

          {/* 3. FOOTER (Sticky, pinned at bottom, always visible) */}
          <div className="shrink-0 border-t border-border bg-surface px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom,0px))] flex items-center justify-end gap-2.5 shadow-xs">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-lg bg-surface border border-border text-text font-bold text-xs sm:text-sm hover:bg-surface-alt transition-colors disabled:opacity-50"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Menerbitkan Produk...</span>
                </>
              ) : (
                <span>Terbitkan Produk Premade</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
