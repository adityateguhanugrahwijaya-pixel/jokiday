"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Link as LinkIcon,
  Copy,
  Check,
  PlusCircle,
  AlertCircle,
  XCircle,
  UserCheck,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { formatDate } from "@/lib/format";

export interface AdminInviteItem {
  id: string;
  token: string;
  inviteeName: string;
  note: string;
  status: "PENDING" | "USED" | "REVOKED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedByUser: { id: string; displayName: string; email: string } | null;
}

export function AdminInvitesClient({
  initialInvites,
}: {
  initialInvites: AdminInviteItem[];
}) {
  const [invites, setInvites] = useState<AdminInviteItem[]>(initialInvites);
  const [inviteeName, setInviteeName] = useState("");
  const [note, setNote] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newlyCreatedUrl, setNewlyCreatedUrl] = useState<string | null>(null);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteeName.trim()) {
      setErrorMsg("Nama calon desainer wajib diisi");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteeName: inviteeName.trim(),
          note: note.trim(),
          expiresInDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal membuat undangan");

      setNewlyCreatedUrl(data.invite.inviteUrl);
      setInviteeName("");
      setNote("");

      // Refresh data
      const refreshRes = await fetch("/api/admin/invites");
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setInvites(refreshData.invites);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = (token: string, id: string) => {
    const origin = window.location.origin;
    const url = `${origin}/register/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan/mencabut tautan undangan ini?")) return;

    try {
      const res = await fetch(`/api/admin/invites/${id}/revoke`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Gagal mencabut undangan");
      }

      setInvites((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "REVOKED" } : item))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tab Navigasi Admin */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <Link
          href="/admin/withdrawals"
          className="px-4 py-2 rounded-t-md text-xs font-semibold text-text-muted hover:text-text transition-colors"
        >
          Penarikan Saldo Freelancer
        </Link>
        <Link
          href="/admin/invites"
          className="px-4 py-2 rounded-t-md text-xs font-bold text-primary border-b-2 border-primary bg-primary-soft/30 transition-colors"
        >
          Undangan Desainer (Invite-Only)
        </Link>
      </div>

      {/* Banner & Form Buat Undangan */}
      <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>Buat Tautan Undangan Desainer Baru</span>
          </h2>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            JokiDay menerapkan sistem khusus undangan (invite-only). Tautan yang dibuat bersifat satu kali pakai (one-time link)
            dan wajib disertai verifikasi NIK KTP serta portofolio oleh calon desainer saat mendaftar.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-danger-soft text-danger text-xs rounded border border-danger/20 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {newlyCreatedUrl && (
          <div className="p-4 bg-primary-soft/80 border border-primary/30 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Check className="w-4 h-4" />
              <span>Tautan Undangan Berhasil Dibuat!</span>
            </div>
            <div className="flex items-center gap-2 bg-surface p-2 rounded border border-border">
              <input
                type="text"
                readOnly
                value={newlyCreatedUrl}
                className="w-full bg-transparent text-xs font-mono text-text select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newlyCreatedUrl);
                  setCopiedId("new");
                  setTimeout(() => setCopiedId(null), 2500);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded text-xs font-bold shrink-0 hover:bg-primary-hover transition-colors"
              >
                {copiedId === "new" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === "new" ? "Tersalin!" : "Salin Link"}</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-text mb-1">
              Nama Calon Desainer
            </label>
            <input
              type="text"
              value={inviteeName}
              onChange={(e) => setInviteeName(e.target.value)}
              placeholder="Contoh: Dewi Maharani"
              className="w-full h-10 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-text mb-1">
              Catatan / Spesialisasi
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Ilustrasi & Karakter"
              className="w-full h-10 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-semibold text-text mb-1">
              Masa Berlaku
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="w-full h-10 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
            >
              <option value={3}>3 Hari</option>
              <option value={7}>7 Hari (Standar)</option>
              <option value={14}>14 Hari</option>
              <option value={30}>30 Hari</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex justify-end pt-2">
            <Button
              type="submit"
              variant="cta"
              isLoading={isLoading}
              className="h-10 px-6 font-bold text-xs"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              <span>Generate Tautan Undangan Khusus</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Tabel Riwayat Undangan */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text">
            Daftar Tautan Undangan Desainer ({invites.length})
          </h3>
        </div>

        {invites.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-muted text-xs">
            Belum ada tautan undangan yang dibuat. Gunakan form di atas untuk mengundang desainer baru.
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-background border-b border-border text-text-muted font-bold">
                  <th className="p-3.5">Calon Desainer</th>
                  <th className="p-3.5">Catatan</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Kadaluarsa</th>
                  <th className="p-3.5">Digunakan Oleh</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invites.map((inv) => {
                  const isCopied = copiedId === inv.id;
                  const isPending = inv.status === "PENDING";

                  return (
                    <tr key={inv.id} className="hover:bg-background/50 transition-colors">
                      <td className="p-3.5 font-bold text-text">
                        {inv.inviteeName}
                      </td>
                      <td className="p-3.5 text-text-muted">
                        {inv.note || "-"}
                      </td>
                      <td className="p-3.5">
                        {inv.status === "PENDING" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary-soft text-primary">
                            Siap Digunakan
                          </span>
                        )}
                        {inv.status === "USED" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-success-soft text-success">
                            Sudah Terdaftar
                          </span>
                        )}
                        {inv.status === "REVOKED" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-danger-soft text-danger">
                            Dibatalkan
                          </span>
                        )}
                        {inv.status === "EXPIRED" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-soft text-text-muted">
                            Kadaluarsa
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-text-muted font-mono">
                        {formatDate(new Date(inv.expiresAt))}
                      </td>
                      <td className="p-3.5">
                        {inv.usedByUser ? (
                          <div>
                            <span className="font-bold text-text block">{inv.usedByUser.displayName}</span>
                            <span className="text-[10px] text-text-muted font-mono">{inv.usedByUser.email}</span>
                          </div>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(inv.token, inv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface border border-border text-primary font-bold text-[11px] hover:bg-background transition-colors"
                            >
                              {isCopied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                              <span>{isCopied ? "Tersalin" : "Salin Link"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRevoke(inv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-danger-soft text-danger font-semibold text-[11px] hover:bg-danger/20 transition-colors"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Cabut</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
