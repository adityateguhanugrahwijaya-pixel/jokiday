"use client";

import React, { useState, useRef } from "react";
import { Camera, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileAvatarClientProps {
  currentAvatarUrl: string | null;
  displayName: string;
}

export function ProfileAvatarClient({
  currentAvatarUrl,
  displayName,
}: ProfileAvatarClientProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset status
    setErrorMsg("");
    setSuccessMsg("");

    // Validasi ukuran client-side (maks 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran file maksimal 5 MB.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMsg("Format file harus JPG, PNG, atau WebP.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal mengunggah foto profil");
      }

      setAvatarUrl(data.avatarUrl);
      setSuccessMsg("Foto profil berhasil diperbarui!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat mengunggah foto.");
    } finally {
      setIsUploading(false);
      // Reset input value agar dapat memilih file yang sama jika diperlukan
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center sm:items-start gap-2">
      <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
        {/* Lingkaran Avatar */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-primary-soft text-primary font-extrabold text-2xl flex items-center justify-center shadow-sm transition-all group-hover:border-primary">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{displayName.slice(0, 1).toUpperCase() || "J"}</span>
          )}

          {/* Loading Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}
        </div>

        {/* Tombol Kamera Overlay */}
        <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-white shadow-md border-2 border-surface hover:bg-primary-hover transition-transform group-hover:scale-110">
          <Camera className="w-3.5 h-3.5" />
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>

      <span className="text-[11px] text-text-muted hover:text-primary transition-colors cursor-pointer" onClick={handleAvatarClick}>
        {isUploading ? "Mengunggah..." : "Klik foto untuk mengganti"}
      </span>

      {/* Pesan Sukses / Error */}
      {successMsg && (
        <div className="flex items-center gap-1.5 text-xs text-success font-medium animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-danger font-medium animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
