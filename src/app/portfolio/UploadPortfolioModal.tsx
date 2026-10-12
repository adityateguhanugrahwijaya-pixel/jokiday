"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { UploadCloud, PlusCircle, ShieldCheck, AlertCircle, Image as ImageIcon } from "lucide-react";

export function UploadPortfolioModal({ designerId }: { designerId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("logo");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreviewSrc(url);
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
      formData.append("caption", caption);
      formData.append("category", category);
      if (designerId) formData.append("designerId", designerId);

      const res = await fetch("/api/portfolio/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengunggah karya");

      setIsOpen(false);
      setFile(null);
      setPreviewSrc(null);
      setCaption("");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-secondary text-on-secondary font-bold text-sm hover:bg-secondary-hover transition-colors touch-target shrink-0"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Unggah Desain Baru</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-lg max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-floating my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-text">
                  Unggah Karya ke Portofolio
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Tampilkan karya terbaikmu di feed publik JokiDay.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-danger-soft text-danger text-xs rounded border border-danger/20 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4 text-sm">
              {/* File Drop Area */}
              <div>
                <label className="block font-semibold text-text mb-1.5">
                  File Gambar Desain
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-5 text-center bg-background hover:bg-surface transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    required
                  />
                  {previewSrc ? (
                    <div className="space-y-2">
                      <img
                        src={previewSrc}
                        alt="Preview upload"
                        className="max-h-48 mx-auto rounded border border-border object-contain"
                      />
                      <span className="text-xs text-text-muted block">
                        {file?.name} (Klik untuk mengganti gambar)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <UploadCloud className="w-10 h-10 mx-auto text-primary" />
                      <div className="text-xs font-semibold text-text">
                        Tarik gambar ke sini atau klik untuk memilih
                      </div>
                      <div className="text-[11px] text-text-muted">
                        Mendukung format PNG, JPG, JPEG, WEBP (maks. 100MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Watermark Banner Info */}
              <div className="p-3.5 bg-primary-soft/60 border border-primary/20 rounded-md text-xs text-text flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Proteksi Otomatis:</strong> Gambar akan otomatis diberi watermark diagonal <em>JokiDay • @username</em> berulang pada tingkat piksel oleh server sebelum ditampilkan ke publik.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1.5">
                  Judul Karya Desain
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Desain Kemasan Kopi Robusta Nusantara"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1.5">
                  Kategori Karya
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="logo">Logo & Identitas Visual</option>
                  <option value="kemasan">Kemasan Produk & Label</option>
                  <option value="poster">Poster & Banner Iklan</option>
                  <option value="ui">UI/UX Aplikasi & Web</option>
                  <option value="thumbnail">Thumbnail Medsos & Banner</option>
                  <option value="ilustrasi">Ilustrasi Kustom</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="cta"
                  isLoading={isLoading}
                >
                  Unggah & Beri Watermark
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
