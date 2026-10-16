"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { UploadCloud, ShieldCheck, AlertCircle, X, Loader2 } from "lucide-react";

export interface UploadFeedModalProps {
  isOpen: boolean;
  designerId: string;
  onClose: () => void;
  onSuccess?: (newPost: any) => void;
}

export function UploadFeedModal({
  isOpen,
  designerId,
  onClose,
  onSuccess,
}: UploadFeedModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("logo");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Kunci scroll body saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (selected?: File) => {
    if (selected) {
      if (!selected.type.startsWith("image/")) {
        setErrorMsg("Format berkas harus berupa gambar (PNG, JPG, JPEG, WEBP)");
        return;
      }
      setFile(selected);
      setErrorMsg("");
      const url = URL.createObjectURL(selected);
      setPreviewSrc(url);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Pilih file gambar desain terlebih dahulu");
      return;
    }
    if (!caption.trim()) {
      setErrorMsg("Isi judul atau keterangan karya desain");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", caption.trim());
      formData.append("category", category);
      if (designerId) formData.append("designerId", designerId);

      const res = await fetch("/api/portfolio/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengunggah karya");

      // Reset state form
      setFile(null);
      setPreviewSrc(null);
      setCaption("");
      setCategory("logo");

      if (onSuccess) {
        onSuccess(data.post);
      } else {
        router.refresh();
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat mengunggah karya");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="bg-surface border border-border rounded-xl max-w-lg w-full p-5 sm:p-7 space-y-4 shadow-floating my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-text">
              Unggah Karya ke Feed Portofolio
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Pamerkan karya desain terbaik Anda di feed publik JokiDay.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-background transition-colors disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-danger-soft text-danger text-xs rounded-lg border border-danger/20 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          {/* File Drop Area */}
          <div>
            <label className="block font-semibold text-text mb-1.5">
              File Gambar Desain <span className="text-danger">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer relative ${
                isDragging
                  ? "border-primary bg-primary-soft/30"
                  : "border-border bg-background hover:bg-surface-alt"
              }`}
            >
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                disabled={isLoading}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                required={!file}
              />
              {previewSrc ? (
                <div className="space-y-2">
                  <img
                    src={previewSrc}
                    alt="Pratinjau unggahan"
                    className="max-h-48 mx-auto rounded-lg border border-border object-contain shadow-xs"
                  />
                  <span className="text-[11px] text-text-muted block">
                    {file?.name} (Klik atau tarik berkas lain untuk mengganti)
                  </span>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-text">
                    Tarik gambar ke sini atau klik untuk memilih
                  </div>
                  <div className="text-[11px] text-text-muted">
                    Format PNG, JPG, JPEG, WEBP (maks. 50MB)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Watermark Banner Info */}
          <div className="p-3 bg-surface-alt border border-border rounded-lg text-[11px] text-text-muted flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold text-text">Proteksi Otomatis:</span> Gambar pratinjau publik akan otomatis diberi watermark proteksi <em>JokiDay • @username</em> di bagian tengah gambar sebelum ditampilkan ke pembeli.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-text mb-1.5">
              Judul Karya Desain <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Desain Kemasan Kopi Robusta Nusantara"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isLoading}
              className="w-full h-10 px-3 bg-background border border-border rounded-lg text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-text mb-1.5">
              Kategori Karya <span className="text-danger">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isLoading}
              className="w-full h-10 px-3 bg-background border border-border rounded-lg text-text text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="logo">Logo & Identitas Visual</option>
              <option value="kemasan">Kemasan Produk & Label</option>
              <option value="poster">Poster & Banner Iklan</option>
              <option value="ui">UI/UX Aplikasi & Web</option>
              <option value="thumbnail">Thumbnail Medsos & Banner</option>
              <option value="ilustrasi">Ilustrasi Kustom</option>
              <option value="branding">Identitas Brand Lengkap</option>
            </select>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-text-muted hover:text-text hover:bg-background transition-colors disabled:opacity-50 touch-target"
            >
              Batal
            </button>
            <Button
              type="submit"
              variant="cta"
              isLoading={isLoading}
              className="h-9 px-5 text-xs font-bold"
            >
              Unggah & Beri Watermark
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
