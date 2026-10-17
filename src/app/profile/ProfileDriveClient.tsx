"use client";

import React, { useState } from "react";
import { Cloud, ShieldCheck, AlertCircle, Unlink, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/format";

interface ProfileDriveClientProps {
  connection: {
    isConnected: boolean;
    googleEmail?: string | null;
    status?: string | null;
    connectedAt?: string | null;
  } | null;
}

export function ProfileDriveClient({ connection }: ProfileDriveClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const driveParam = searchParams.get("drive");
  const errorParam = searchParams.get("error");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState(
    driveParam === "connected" ? "Google Drive berhasil disambungkan ke akun Anda." : ""
  );

  const isConnected = Boolean(connection?.isConnected);

  const handleDisconnect = async () => {
    if (!confirm("Apakah Anda yakin ingin memutuskan sambungan Google Drive dari akun JokiDay?")) {
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/google/disconnect", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal memutuskan sambungan Google Drive");
      }

      setSuccessMsg("Sambungan Google Drive berhasil diputuskan.");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (code: string) => {
    switch (code) {
      case "GOOGLE_CONFIG_MISSING":
        return "Kredensial GOOGLE_CLIENT_ID belum dikonfigurasi di server. Harap hubungi administrator.";
      case "TOKEN_EXCHANGE_FAILED":
        return "Gagal menukar kode otorisasi dengan token Google. Silakan coba lagi.";
      case "INVALID_CSRF_STATE":
        return "Validasi keamanan CSRF gagal. Silakan coba sambungkan kembali.";
      case "GOOGLE_ACCESS_DENIED":
        return "Pemberian izin akses Google Drive dibatalkan.";
      default:
        return `Gagal menghubungkan Google Drive (${code}). Silakan coba lagi.`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Notifikasi feedback */}
      {successMsg && (
        <div className="p-3.5 bg-success-soft border border-success/20 rounded-md text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {(errorMsg || errorParam) && (
        <div className="p-3.5 bg-danger-soft border border-danger/20 rounded-md text-xs text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg || (errorParam ? getErrorMessage(errorParam) : "")}</span>
        </div>
      )}

      {isConnected ? (
        <div className="p-5 bg-background border border-border rounded-lg space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-success" />
                <span className="font-bold text-sm text-text">
                  Drive Terkoneksi: {connection?.googleEmail || "Google Drive"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-soft text-success">
                  AKTIF
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Folder penyimpanan otomatis <code className="bg-surface px-1.5 py-0.5 rounded text-primary">JokiDay/</code> aktif di Google Drive Anda.
              </p>
              {connection?.connectedAt && (
                <p className="text-[11px] text-text-muted font-mono">
                  Tersambung sejak: {formatDate(connection.connectedAt)}
                </p>
              )}
            </div>

            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-md border border-danger/30 text-danger hover:bg-danger-soft text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlink className="w-3.5 h-3.5" />
              )}
              <span>Putuskan Sambungan</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 bg-background border border-dashed border-border rounded-lg space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-text-muted" />
                <span className="font-bold text-sm text-text">
                  Google Drive Belum Tersambung
                </span>
              </div>
              <p className="text-xs text-text-muted max-w-lg leading-relaxed">
                Sambungkan Google Drive Anda untuk menyimpan master file pesanan pelanggan secara mandiri dan aman dengan izin scope minimal (hanya folder JokiDay).
              </p>
            </div>

            <a
              href="/api/auth/google/connect"
              className="px-4 py-2.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Sambungkan Google Drive</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
