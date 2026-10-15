"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, AtSign, User } from "lucide-react";

interface ProfileInfoClientProps {
  userId: string;
  initialDisplayName: string;
  initialUsername: string;
  email: string;
  isDesigner: boolean;
  activeRole: "CUSTOMER" | "DESIGNER";
}

export function ProfileInfoClient({
  userId,
  initialDisplayName,
  initialUsername,
  email,
  isDesigner,
  activeRole,
}: ProfileInfoClientProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const hasChanges =
    displayName.trim() !== initialDisplayName.trim() ||
    username.trim().toLowerCase() !== initialUsername.trim().toLowerCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanName = displayName.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/^@+/, "");

    if (cleanName.length < 2) {
      setErrorMsg("Nama profil minimal terdiri dari 2 karakter.");
      return;
    }

    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      setErrorMsg(
        "Username hanya boleh berupa huruf kecil (a-z), angka (0-9), dan garis bawah (_), antara 3 hingga 30 karakter."
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: cleanName,
          username: cleanUsername,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal memperbarui profil");
      }

      setDisplayName(data.user.displayName);
      setUsername(data.user.username);
      setSuccessMsg("Profil dan username berhasil diperbarui!");
      router.refresh();

      setTimeout(() => {
        setSuccessMsg("");
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan profil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Field Nama Profil */}
        <div className="space-y-1.5">
          <label htmlFor="displayName" className="block text-xs font-bold text-text">
            Nama Profil
          </label>
          <div className="relative">
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama profil atau bisnis Anda"
              maxLength={50}
              required
              className="w-full h-10 px-3 pl-9 rounded-md border border-border bg-background text-sm text-text focus:outline-none focus:border-primary transition-colors"
            />
            <User className="w-4 h-4 text-text-muted absolute left-3 top-3 pointer-events-none" />
          </div>
          <p className="text-[11px] text-text-muted">
            Nama yang ditampilkan pada pesanan, chat, dan penawaran.
          </p>
        </div>

        {/* Field Username */}
        <div className="space-y-1.5">
          <label htmlFor="username" className="block text-xs font-bold text-text">
            Username
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "_")
                    .replace(/[^a-z0-9_]/g, "")
                )
              }
              placeholder="username_anda"
              maxLength={30}
              required
              className="w-full h-10 px-3 pl-8 rounded-md border border-border bg-background text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
            />
            <span className="text-xs font-mono font-bold text-text-muted absolute left-3 top-3 pointer-events-none">
              @
            </span>
          </div>
          <p className="text-[11px] text-text-muted">
            {isDesigner
              ? "Tautan portofolio: /designer/" + (username || "username")
              : "Identitas unik akun Anda untuk panggilan dan chat."}
          </p>
        </div>
      </div>

      {/* Info Tambahan & Tautan Publik untuk Desainer */}
      {isDesigner && (
        <div className="p-3 rounded-md bg-background border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <AtSign className="w-4 h-4 text-primary shrink-0" />
            <span className="text-text-muted">
              Profil Desainer Anda dapat diakses publik melalui:
            </span>
          </div>
          <a
            href={`/designer/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold font-mono shrink-0"
          >
            <span>/designer/@{username}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Pesan Sukses / Error */}
      {successMsg && (
        <div className="p-3 rounded-md bg-success-soft text-success text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-md bg-danger-soft text-danger text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tombol Simpan */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving || !hasChanges}
          className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-target shadow-sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <span>Simpan Perubahan</span>
          )}
        </button>
      </div>
    </form>
  );
}
