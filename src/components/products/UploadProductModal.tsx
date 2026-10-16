"use client";

import React, { useState, useRef } from "react";
import { formatRupiah } from "@/lib/format";
import {
  PRODUCT_CATEGORIES,
  MIN_PAID_PRODUCT_PRICE,
  PRODUCT_ALLOWED_EXTENSIONS,
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
  HelpCircle,
  FileBox,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("template");
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState("25000");

  const [sourceType, setSourceType] = useState<"DRIVE_FILE" | "EXTERNAL_LINK">("EXTERNAL_LINK");
  const [externalUrl, setExternalUrl] = useState("");
  const [productFile, setProductFile] = useState<File | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const coverInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("File sampul harus berupa gambar (JPG, PNG, atau WEBP)");
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setErrorMessage("");
    }
  };

  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !PRODUCT_ALLOWED_EXTENSIONS.includes(ext as any)) {
        setErrorMessage(
          `Ekstensi .${ext} tidak didukung. Pilihan: ${PRODUCT_ALLOWED_EXTENSIONS.join(", ").toUpperCase()}`
        );
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage("Ukuran file aset maksimal 50 MB untuk upload langsung ke Google Drive");
        return;
      }
      setProductFile(file);
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage("Judul produk wajib diisi");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Deskripsi produk wajib diisi");
      return;
    }
    if (!coverFile) {
      setErrorMessage("Gambar cover/sampul produk wajib diunggah");
      return;
    }

    // Validasi harga
    const priceVal = validateProductPrice(price, isFree);
    if (!priceVal.isValid) {
      setErrorMessage(priceVal.error || "Harga tidak valid");
      return;
    }

    // Validasi sumber berkas
    if (sourceType === "DRIVE_FILE") {
      if (!isDriveConnected) {
        setErrorMessage("Google Drive Anda belum terhubung. Gunakan opsi Tempel Link atau hubungkan Drive di Pengaturan.");
        return;
      }
      if (!productFile) {
        setErrorMessage("File produk aset digital wajib dipilih");
        return;
      }
    } else {
      const linkVal = validateProductExternalUrl(externalUrl);
      if (!linkVal.isValid) {
        setErrorMessage(linkVal.error || "Tautan eksternal tidak valid");
        return;
      }
    }

    if (!copyrightAgreed) {
      setErrorMessage("Kamu wajib menyetujui pernyataan kepemilikan hak cipta atas karya ini");
      return;
    }

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
      fd.append("coverFile", coverFile);

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
      setErrorMessage(err.message || "Terjadi kesalahan saat mengunggah produk");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-alt/40 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
              <FileBox className="w-5 h-5 text-primary" />
              <span>Unggah Produk Premade / Aset Digital</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Jual atau bagikan template, aset grafis, dan desain siap pakai langsung kepada pembeli.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-alt flex items-center justify-center text-text-muted hover:text-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-medium text-xs leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* 1. Cover / Preview Image */}
          <div className="space-y-2">
            <label className="block font-bold text-text">
              Gambar Sampul / Pratinjau <span className="text-danger">*</span>
            </label>
            <p className="text-[11px] text-text-muted">
              Gambar pratinjau akan otomatis diberi watermark pelindung JokiDay.
            </p>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleCoverChange}
              className="hidden"
            />

            {coverPreview ? (
              <div className="relative aspect-video w-full rounded-xl border border-border overflow-hidden bg-surface-alt group">
                <img
                  src={coverPreview}
                  alt="Cover Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Ganti Gambar Sampul</span>
                </button>
              </div>
            ) : (
              <div
                onClick={() => coverInputRef.current?.click()}
                className="w-full aspect-[2.4/1] rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-surface-alt/40 flex flex-col items-center justify-center cursor-pointer transition-colors p-4 text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="font-bold text-xs text-text">Klik untuk memilih gambar sampul</span>
                <span className="text-[10px] text-text-muted mt-0.5">JPG, PNG, atau WEBP (Maksimal 10 MB)</span>
              </div>
            )}
          </div>

          {/* 2. Judul & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block font-bold text-text">
                Judul Produk <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
                placeholder="mis. Paket Template Feed Instagram UMKM Minimalis (30 Desain)"
                className="w-full px-3 py-2 rounded-lg bg-surface-alt/60 border border-border focus:border-primary focus:outline-hidden text-text text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-text">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-alt/60 border border-border focus:border-primary focus:outline-hidden text-text text-xs sm:text-sm capitalize"
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
            <label className="block font-bold text-text">
              Deskripsi & Kelengkapan Aset <span className="text-danger">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={3000}
              placeholder="Jelaskan isi paket aset, software yang dibutuhkan (Canva, Photoshop, Figma, Illustrator), ukuran pixel, font yang digunakan, dan cara pakai."
              className="w-full px-3 py-2 rounded-lg bg-surface-alt/60 border border-border focus:border-primary focus:outline-hidden text-text text-xs sm:text-sm leading-relaxed"
            />
          </div>

          {/* 4. Penetapan Harga (Toggle Gratis vs Berbayar) */}
          <div className="p-4 rounded-xl bg-surface-alt/50 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-text text-xs sm:text-sm">Tipe Akses Produk</span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Tentukan apakah produk ini dibagikan cuma-cuma atau berbayar.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFree(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    !isFree
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface border border-border text-text-muted hover:text-text"
                  }`}
                >
                  Berbayar
                </button>
                <button
                  type="button"
                  onClick={() => setIsFree(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    isFree
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-surface border border-border text-text-muted hover:text-text"
                  }`}
                >
                  Gratis (Rp 0)
                </button>
              </div>
            </div>

            {!isFree && (
              <div className="pt-2 border-t border-border space-y-2">
                <label className="block font-bold text-text">
                  Harga Penjualan (Rp) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-text-muted font-bold text-xs sm:text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={MIN_PAID_PRODUCT_PRICE}
                    step={1000}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="25000"
                    className="w-full pl-10 pr-3 py-2 rounded-lg bg-surface border border-border focus:border-primary focus:outline-hidden text-text font-money text-xs sm:text-sm"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>Minimal harga Rp {MIN_PAID_PRODUCT_PRICE.toLocaleString("id-ID")}</span>
                  <span>Fee platform 5% (kamu menerima 95% langsung ke dompet)</span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Sumber Berkas: Upload ke Drive vs Tempel Link */}
          <div className="space-y-3">
            <label className="block font-bold text-text">
              Sumber Berkas Aset Digital <span className="text-danger">*</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSourceType("EXTERNAL_LINK")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
                  sourceType === "EXTERNAL_LINK"
                    ? "border-primary bg-primary-soft/30 text-primary"
                    : "border-border bg-surface-alt/40 text-text-muted hover:text-text"
                }`}
              >
                <LinkIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Tempel Link Eksternal</div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    Google Drive publik, Mega, Dropbox, Canva, Figma
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("DRIVE_FILE")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
                  sourceType === "DRIVE_FILE"
                    ? "border-primary bg-primary-soft/30 text-primary"
                    : "border-border bg-surface-alt/40 text-text-muted hover:text-text"
                }`}
              >
                <HardDrive className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Upload ke Google Drive</div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    Tersimpan rapi di folder JokiDay/produk
                  </div>
                </div>
              </button>
            </div>

            {sourceType === "EXTERNAL_LINK" ? (
              <div className="space-y-1.5 p-3.5 rounded-xl bg-surface-alt/50 border border-border">
                <label className="block font-semibold text-text text-xs">
                  Tautan Unduhan / Akses Aset (URL)
                </label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://drive.google.com/... atau https://www.canva.com/..."
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border focus:border-primary focus:outline-hidden text-text text-xs font-mono"
                />
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[11px] leading-relaxed flex items-start gap-2 mt-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Pastikan tautan sudah diatur publik (<strong>"Siapa saja yang memiliki link dapat melihat/mengunduh"</strong>) agar pembeli tidak terhalang izin akses. Tautan asli akan disamarkan secara aman oleh sistem JokiDay.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3.5 rounded-xl bg-surface-alt/50 border border-border">
                {!isDriveConnected ? (
                  <div className="p-3 rounded-lg bg-primary-soft/40 border border-primary/20 text-text space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed">
                        Akun Google Drive Anda belum terhubung. Hubungkan Drive Anda agar file dapat disimpan langsung ke akun Google Drive Anda secara aman.
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      target="_blank"
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
                      accept=".zip,.rar,.7z,.psd,.ai,.eps,.pdf,.svg,.png,.jpg,.jpeg,.fig,.xd,.cdr"
                      onChange={handleProductFileChange}
                      className="hidden"
                    />

                    {productFile ? (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
                        <div className="flex items-center gap-2.5 truncate">
                          <FileBox className="w-5 h-5 text-primary shrink-0" />
                          <div className="truncate">
                            <p className="font-bold text-xs text-text truncate">{productFile.name}</p>
                            <p className="text-[10px] text-text-muted">
                              {(productFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProductFile(null)}
                          className="text-xs text-danger font-bold hover:underline ml-2"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => productFileInputRef.current?.click()}
                        className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-surface flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
                      >
                        <Upload className="w-5 h-5 text-primary mb-1.5" />
                        <span className="font-bold text-xs text-text">Pilih File Aset Digital</span>
                        <span className="text-[10px] text-text-muted mt-0.5">
                          ZIP, RAR, PSD, AI, EPS, PDF, FIG (Maks. 50 MB)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Pernyataan Hak Cipta Wajib */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={copyrightAgreed}
                onChange={(e) => setCopyrightAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary border-border"
              />
              <span className="text-xs text-text-muted leading-relaxed">
                Saya menyatakan bahwa saya adalah pemilik sah dan pemegang hak cipta atas aset digital ini. Karya ini tidak melanggar hak cipta pihak ketiga mana pun.
              </span>
            </label>
          </div>

          {/* Tombol Simpan / Batalkan */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-surface border border-border text-text font-bold text-xs hover:bg-surface-alt transition-colors"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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
}
