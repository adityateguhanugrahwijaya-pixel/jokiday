"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatRupiah, formatDate, formatTime } from "@/lib/format";
import { CheckCircle2, XCircle, ShieldCheck, ToggleLeft, ToggleRight, AlertCircle } from "lucide-react";

export function AdminWithdrawalClient({
  initialWithdrawals,
  initialAutoPayout,
}: {
  initialWithdrawals: any[];
  initialAutoPayout: boolean;
}) {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(initialAutoPayout);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const handleToggleAutoPayout = async () => {
    setIsUpdatingConfig(true);
    const nextState = !autoPayoutEnabled;
    try {
      const res = await fetch("/api/admin/settings/auto-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      });
      if (res.ok) {
        setAutoPayoutEnabled(nextState);
        setMsg(`Otomatisasi pencairan desainer terverifikasi ${nextState ? "DIAKTIFKAN" : "DINONAKTIFKAN"}`);
      }
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Konfirmasi bahwa transfer dana ke rekening desainer telah dilakukan?")) return;
    setActionLoadingId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Alasan penolakan penarikan dana:", "Data rekening tujuan tidak sesuai");
    if (!reason) return;

    setActionLoadingId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pengaturan Auto-Confirm untuk Freelancer Terverifikasi */}
      <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-bold text-base text-text">
              Auto-Confirm Freelancer Terverifikasi
            </span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed max-w-xl">
            Jika aktif, penarikan saldo oleh freelancer dengan lencana terverifikasi (Verified) akan otomatis disetujui tanpa perlu konfirmasi manual admin. Admin dapat mematikan fitur ini kapan saja.
          </p>
        </div>

        <button
          onClick={handleToggleAutoPayout}
          disabled={isUpdatingConfig}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md font-semibold text-xs border transition-colors shrink-0 ${
            autoPayoutEnabled
              ? "bg-success-soft text-success border-success/30 hover:bg-success-soft/80"
              : "bg-neutral-soft text-text-muted border-border hover:bg-border"
          }`}
        >
          {autoPayoutEnabled ? (
            <>
              <ToggleRight className="w-5 h-5 text-success" />
              <span>Status: Aktif</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5 text-text-muted" />
              <span>Status: Nonaktif</span>
            </>
          )}
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-primary-soft text-primary text-xs rounded border border-primary/20 flex items-center gap-1.5 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Tabel Riwayat & Permintaan Penarikan */}
      <div className="space-y-3">
        <h2 className="font-bold text-lg text-text">
          Daftar Antrean Penarikan ({withdrawals.length})
        </h2>

        {withdrawals.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-10 text-center text-text-muted text-sm">
            Belum ada permintaan penarikan saldo dari freelancer.
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-soft border-b border-border text-xs text-text-muted uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Waktu Pengajuan</th>
                    <th className="py-3 px-4 font-semibold">Freelancer</th>
                    <th className="py-3 px-4 font-semibold">Tujuan Transfer</th>
                    <th className="py-3 px-4 font-semibold text-right">Nominal</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {withdrawals.map((w: any) => {
                    const dest = JSON.parse(w.destination || "{}");
                    const isPending = w.status === "REQUESTED";
                    const isVerified = w.user.designerProfile?.isVerified === true;

                    return (
                      <tr key={w.id} className="hover:bg-background transition-colors">
                        <td className="py-3.5 px-4 text-xs text-text-muted">
                          {formatDate(w.createdAt)} {formatTime(w.createdAt)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-text flex items-center gap-1.5">
                            <span>{w.user.displayName}</span>
                            {isVerified && (
                              <span className="text-[10px] bg-primary-soft text-primary px-1.5 py-0.2 rounded font-semibold">
                                Verified
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-muted">{w.user.email}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="font-bold block text-text">
                            {dest.bankName} &bull; {dest.accountNumber}
                          </span>
                          <span className="text-text-muted">a.n. {dest.accountHolder}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-money font-bold text-text text-base">
                            {formatRupiah(w.amount)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              w.status === "SUCCESS"
                                ? "success"
                                : w.status === "REQUESTED"
                                ? "warning"
                                : "danger"
                            }
                          >
                            {w.status === "SUCCESS"
                              ? "Berhasil Ditransfer"
                              : w.status === "REQUESTED"
                              ? "Menunggu Cek Admin"
                              : "Ditolak"}
                          </Badge>
                          {w.reviewedBy === "SYSTEM_AUTO_VERIFIED" && (
                            <span className="block text-[10px] text-text-muted mt-0.5 font-mono">
                              Auto-Approved
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={actionLoadingId === w.id}
                                onClick={() => handleApprove(w.id)}
                                className="h-8 px-2.5 text-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                <span>Konfirmasi</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionLoadingId === w.id}
                                onClick={() => handleReject(w.id)}
                                className="h-8 px-2.5 text-xs text-danger hover:bg-danger-soft"
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                <span>Tolak</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted">Selesai</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
