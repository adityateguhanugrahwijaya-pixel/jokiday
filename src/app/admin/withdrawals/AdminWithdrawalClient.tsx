"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatRupiah, formatDate, formatTime } from "@/lib/format";
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  X,
  Building,
  Mail,
  ExternalLink,
  Cloud,
  Copy,
  Check,
  Upload,
  FileText,
  RotateCcw,
} from "lucide-react";

export interface AdminWithdrawalClientProps {
  initialWithdrawals: any[];
  initialAdminDrive?: { isConnected: boolean; googleEmail?: string } | null;
  initialPlatformBalance?: number;
  initialTotalPlatformRevenueAllTime?: number;
  initialTotalPlatformWithdrawnAllTime?: number;
  initialPlatformLedgerEntries?: any[];
}

const SUPPORTED_BANKS = [
  "BCA (Bank Central Asia)",
  "Bank Mandiri",
  "BRI (Bank Rakyat Indonesia)",
  "BNI (Bank Negara Indonesia)",
  "Bank Syariah Indonesia (BSI)",
  "Seabank",
  "Bank Jago",
  "BCA Digital (Blu)",
  "CIMB Niaga",
  "Permata Bank",
  "GoPay",
  "OVO",
  "DANA",
  "ShopeePay",
];

export function AdminWithdrawalClient({
  initialWithdrawals,
  initialAdminDrive = null,
  initialPlatformBalance = 0,
  initialTotalPlatformRevenueAllTime = 0,
  initialTotalPlatformWithdrawnAllTime = 0,
  initialPlatformLedgerEntries = [],
}: AdminWithdrawalClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"FREELANCER" | "PLATFORM">("FREELANCER");
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [adminDrive, setAdminDrive] = useState(initialAdminDrive);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  // State untuk Saldo Platform (Fee 5%)
  const [platformBalance, setPlatformBalance] = useState(initialPlatformBalance);
  const [totalPlatformRevenue, setTotalPlatformRevenue] = useState(initialTotalPlatformRevenueAllTime);
  const [totalPlatformWithdrawn, setTotalPlatformWithdrawn] = useState(initialTotalPlatformWithdrawnAllTime);
  const [platformEntries, setPlatformEntries] = useState(initialPlatformLedgerEntries);

  // State Modal Pencairan Saldo Platform
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawMethod, setWithdrawMethod] = useState<"BANK" | "EWALLET">("BANK");
  const [withdrawBank, setWithdrawBank] = useState<string>("BCA (Bank Central Asia)");
  const [withdrawAccount, setWithdrawAccount] = useState<string>("");
  const [withdrawHolder, setWithdrawHolder] = useState<string>("");
  const [withdrawNote, setWithdrawNote] = useState<string>("Pencairan Saldo Fee Platform 5%");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string>("");
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string>("");

  // State Modal Konfirmasi Transfer & Unggah Bukti
  const [approveModalWithdrawal, setApproveModalWithdrawal] = useState<any | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [proofRefNumber, setProofRefNumber] = useState<string>("");
  const [isSubmittingApprove, setIsSubmittingApprove] = useState<boolean>(false);
  const [approveError, setApproveError] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField((prev) => (prev === fieldName ? null : prev));
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProofFile(file);
    setApproveError("");
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setProofPreviewUrl(url);
    } else {
      setProofPreviewUrl(null);
    }
  };

  const handleCloseApproveModal = () => {
    if (proofPreviewUrl) {
      URL.revokeObjectURL(proofPreviewUrl);
    }
    setApproveModalWithdrawal(null);
    setProofFile(null);
    setProofPreviewUrl(null);
    setProofRefNumber("");
    setApproveError("");
  };

  const handleOpenApproveModal = (withdrawal: any) => {
    setApproveModalWithdrawal(withdrawal);
    setProofFile(null);
    setProofPreviewUrl(null);
    setProofRefNumber("");
    setApproveError("");
  };

  const handleSubmitApproveWithProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveModalWithdrawal) return;

    if (!adminDrive?.isConnected) {
      setApproveError("Google Drive admin belum tersambung. Harap hubungkan Google Drive terlebih dahulu.");
      return;
    }

    if (!proofFile) {
      setApproveError("Silakan pilih file bukti pembayaran transfer.");
      return;
    }

    setIsSubmittingApprove(true);
    setApproveError("");
    try {
      const formData = new FormData();
      formData.append("proof", proofFile);
      if (proofRefNumber.trim()) {
        formData.append("refNumber", proofRefNumber.trim());
      }

      const res = await fetch(`/api/admin/withdrawals/${approveModalWithdrawal.id}/approve`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWithdrawals((prev) =>
          prev.map((w) =>
            w.id === approveModalWithdrawal.id
              ? {
                  ...w,
                  status: "SUCCESS",
                  gatewayRef: proofRefNumber.trim() || w.gatewayRef,
                  proofUrl: data.proofUrl || `/api/withdrawals/${w.id}/proof`,
                  reviewedBy: "ADMIN_MANUAL",
                  reviewedAt: new Date().toISOString(),
                }
              : w
          )
        );
        setMsg(data.message || "Penarikan berhasil dikonfirmasi dan bukti transfer tersimpan di Google Drive admin.");
        handleCloseApproveModal();
        router.refresh();
      } else {
        setApproveError(data.error?.message || data.message || "Gagal menyetujui penarikan");
      }
    } catch (err: any) {
      setApproveError(err.message || "Terjadi kesalahan jaringan saat mengunggah bukti pembayaran");
    } finally {
      setIsSubmittingApprove(false);
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
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWithdrawals((prev) =>
          prev.map((w) =>
            w.id === id
              ? {
                  ...w,
                  status: "FAILED",
                  reviewedBy: "ADMIN_MANUAL",
                  reviewedAt: new Date().toISOString(),
                  rejectionReason: reason,
                }
              : w
          )
        );
        setMsg(data.message || "Penarikan berhasil ditolak dan dana dikembalikan.");
        router.refresh();
      } else {
        alert(data.error?.message || data.message || "Gagal menolak penarikan");
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan jaringan saat menolak penarikan");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubmitPlatformWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccessMsg("");

    const amountNum = parseInt(withdrawAmount.replace(/[^0-9]/g, ""), 10);
    if (isNaN(amountNum) || amountNum < 10000) {
      setWithdrawError("Nominal penarikan minimal Rp10.000");
      return;
    }
    if (amountNum > platformBalance) {
      setWithdrawError("Nominal penarikan melebihi saldo fee platform yang tersedia");
      return;
    }
    if (!withdrawAccount.trim() || !withdrawHolder.trim()) {
      setWithdrawError("Nomor rekening dan nama pemilik rekening wajib diisi");
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const res = await fetch("/api/admin/revenue/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          method: withdrawMethod,
          bankName: withdrawBank,
          accountNumber: withdrawAccount.trim(),
          accountHolder: withdrawHolder.trim(),
          note: withdrawNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal memproses pencairan saldo platform");
      }

      setWithdrawSuccessMsg(data.message || "Pencairan berhasil diproses.");
      setPlatformBalance(data.remainingBalance ?? Math.max(0, platformBalance - amountNum));
      setTotalPlatformWithdrawn((prev) => prev + amountNum);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setMsg(`Pencairan saldo platform sebesar ${formatRupiah(amountNum)} berhasil diproses dan dikirimkan bukti notifikasi.`);
      router.refresh();
    } catch (err: any) {
      setWithdrawError(err.message || "Terjadi kesalahan saat memproses penarikan");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigasi Admin */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("FREELANCER")}
          className={`px-4 py-2 rounded-t-md text-xs font-bold transition-colors shrink-0 ${
            activeTab === "FREELANCER"
              ? "text-primary border-b-2 border-primary bg-primary-soft/30"
              : "text-text-muted hover:text-text"
          }`}
        >
          Penarikan Saldo Freelancer ({withdrawals.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PLATFORM")}
          className={`px-4 py-2 rounded-t-md text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === "PLATFORM"
              ? "text-primary border-b-2 border-primary bg-primary-soft/30"
              : "text-text-muted hover:text-text"
          }`}
        >
          <Wallet className="w-3.5 h-3.5 text-primary" />
          <span>Pencairan Saldo Platform (Fee 5%)</span>
          <span className="px-1.5 py-0.5 text-[10px] bg-primary text-white rounded-full font-bold">
            {formatRupiah(platformBalance)}
          </span>
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-primary-soft text-primary text-xs rounded border border-primary/20 flex items-center gap-1.5 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* TAMPILAN TAB 1: PENARIKAN SALDO FREELANCER */}
      {activeTab === "FREELANCER" && (
        <div className="space-y-6">
          {/* Integrasi Google Drive Admin untuk Penyimpanan Bukti Pembayaran */}
          {adminDrive?.isConnected ? (
            <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-2.5 bg-success-soft text-success rounded-lg shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-text">
                      Google Drive Admin Terhubung
                    </span>
                    <span className="text-[10px] bg-success-soft text-success px-2 py-0.5 rounded-full font-bold">
                      Aktif
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Tersambung ke akun <strong className="text-text font-mono">{adminDrive.googleEmail || "Google Drive"}</strong>. Setiap bukti pembayaran transfer penarikan akan otomatis diunggah dan disimpan ke folder <code className="bg-neutral-soft px-1 py-0.5 rounded text-[11px] font-mono">JokiDay/bukti-penarikan</code>.
                  </p>
                </div>
              </div>

              <a
                href="/api/auth/google/connect?redirect=/admin/withdrawals"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold border border-border hover:bg-neutral-soft text-text transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ganti Akun Drive</span>
              </a>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-2.5 bg-amber-500/20 text-amber-600 rounded-lg shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-text">
                      Google Drive Admin Belum Terhubung
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                      Wajib untuk Approve
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed max-w-xl">
                    Admin wajib menghubungkan akun Google Drive untuk menyimpan file bukti transfer pembayaran saat menyetujui penarikan saldo freelancer.
                  </p>
                </div>
              </div>

              <a
                href="/api/auth/google/connect?redirect=/admin/withdrawals"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-colors shrink-0"
              >
                <Cloud className="w-4 h-4" />
                <span>Hubungkan Google Drive Admin</span>
              </a>
            </div>
          )}

          {/* Tabel Riwayat & Permintaan Penarikan Freelancer */}
          <div className="space-y-3">
            <h2 className="font-bold text-lg text-text">
              Daftar Antrean Penarikan Freelancer ({withdrawals.length})
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
                        const isVerified = w.user?.designerProfile?.isVerified === true;

                        return (
                          <tr key={w.id} className="hover:bg-background transition-colors">
                            <td className="py-3.5 px-4 text-xs text-text-muted">
                              {formatDate(w.createdAt)} {formatTime(w.createdAt)}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-text flex items-center gap-1.5">
                                <span>{w.user?.displayName || "Freelancer"}</span>
                                {isVerified && (
                                  <span className="text-[10px] bg-primary-soft text-primary px-1.5 py-0.2 rounded font-semibold">
                                    Verified
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-text-muted">{w.user?.email}</span>
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
                              {w.status === "SUCCESS" && (
                                <div className="mt-1 space-y-0.5">
                                  {w.proofUrl && (
                                    <a
                                      href={w.proofUrl.startsWith("/") ? w.proofUrl : `/api/withdrawals/${w.id}/proof`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] text-primary font-bold hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Lihat Bukti Transfer</span>
                                    </a>
                                  )}
                                  {w.gatewayRef && (
                                    <span className="block text-[10px] text-text-muted font-mono">
                                      Ref: {w.gatewayRef}
                                    </span>
                                  )}
                                </div>
                              )}
                              {w.rejectionReason && (
                                <span className="block text-[11px] text-danger mt-1">
                                  Alasan: {w.rejectionReason}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {isPending ? (
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleOpenApproveModal(w)}
                                    className="h-8 px-2.5 text-xs font-bold"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                    <span>Konfirmasi & Bukti</span>
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
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-xs text-text-muted font-medium">Selesai</span>
                                  {w.status === "SUCCESS" && w.proofUrl && (
                                    <a
                                      href={w.proofUrl.startsWith("/") ? w.proofUrl : `/api/withdrawals/${w.id}/proof`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Bukti Transfer</span>
                                    </a>
                                  )}
                                </div>
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
      )}

      {/* TAMPILAN TAB 2: PENCAIRAN SALDO PLATFORM (FEE 5%) */}
      {activeTab === "PLATFORM" && (
        <div className="space-y-6">
          {/* Kartu Ringkasan Keuangan Saldo Platform */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 bg-surface border border-primary/20 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Saldo Platform Tersedia
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl sm:text-3xl font-extrabold text-primary font-money">
                    {formatRupiah(platformBalance)}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Pendapatan 5% dari order selesai yang siap dicairkan
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border">
                <Button
                  variant="primary"
                  fullWidth
                  disabled={platformBalance < 10000}
                  onClick={() => {
                    setWithdrawError("");
                    setWithdrawAmount(platformBalance > 0 ? platformBalance.toString() : "");
                    setShowWithdrawModal(true);
                  }}
                  className="flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Cairkan Saldo Platform</span>
                </Button>
                {platformBalance < 10000 && (
                  <p className="text-[11px] text-text-muted text-center mt-1.5">
                    Minimal saldo untuk pencairan adalah Rp10.000
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-5 bg-surface border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Total Fee 5% Terkumpul
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-success-soft text-success flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl sm:text-3xl font-extrabold text-text font-money">
                    {formatRupiah(totalPlatformRevenue)}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Akumulasi seluruh fee 5% platform dari pesanan selesai
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-xs text-text-muted">
                <ShieldCheck className="w-4 h-4 text-success" />
                <span>Otomatis dikreditkan saat pesanan selesai</span>
              </div>
            </Card>

            <Card className="p-5 bg-surface border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Total Dana Dicairkan
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-neutral-soft text-text-muted flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl sm:text-3xl font-extrabold text-text font-money">
                    {formatRupiah(totalPlatformWithdrawn)}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Total penarikan kas pendapatan platform oleh admin
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-xs text-text-muted">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Semua penarikan tercatat di buku besar akuntansi</span>
              </div>
            </Card>
          </div>

          {/* Banner Informasi Audit & Track Notifikasi Email */}
          <div className="bg-primary-soft/50 border border-primary/20 rounded-xl p-4 sm:p-5 flex items-start gap-3.5">
            <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-text">
                Transparansi & Pengawalan Saldo Platform (Anti-Kehilangan)
              </p>
              <p className="text-text-muted leading-relaxed">
                Biaya platform 5% dari setiap pesanan yang selesai tidak dihapus, melainkan langsung dialokasikan ke Saldo Pendapatan Platform Admin. Setiap kali fee masuk atau dicairkan, sistem secara otomatis melacak audit trail di buku besar dan mengirimkan salinan email resmi ke:
              </p>
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                <span className="px-2.5 py-1 bg-surface border border-border rounded-md font-semibold text-primary">
                  aditya.teguhanugrahwijaya@gmail.com
                </span>
                <span className="px-2.5 py-1 bg-surface border border-border rounded-md font-semibold text-primary">
                  admin@jokiday.com
                </span>
              </div>
            </div>
          </div>

          {/* Tabel Track & Mutasi Saldo Fee Platform */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-text">
                Track & Riwayat Mutasi Saldo Fee Platform 5% ({platformEntries.length})
              </h2>
              <span className="text-xs text-text-muted">
                Buku Besar Double-Entry Ledger JokiDay
              </span>
            </div>

            {platformEntries.length === 0 ? (
              <div className="bg-surface border border-border rounded-lg p-10 text-center text-text-muted text-sm">
                Belum ada mutasi pendapatan platform atau penarikan yang tercatat.
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-soft border-b border-border text-xs text-text-muted uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Waktu Mutasi</th>
                        <th className="py-3 px-4 font-semibold">Tipe</th>
                        <th className="py-3 px-4 font-semibold">Referensi</th>
                        <th className="py-3 px-4 font-semibold">Keterangan</th>
                        <th className="py-3 px-4 font-semibold text-right">Nominal</th>
                        <th className="py-3 px-4 font-semibold text-center">Track Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {platformEntries.map((entry: any) => {
                        const isCredit = entry.direction === "CREDIT";

                        return (
                          <tr key={entry.id} className="hover:bg-background transition-colors">
                            <td className="py-3.5 px-4 text-xs text-text-muted whitespace-nowrap">
                              {formatDate(entry.createdAt)} {formatTime(entry.createdAt)}
                            </td>
                            <td className="py-3.5 px-4">
                              {isCredit ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-success-soft text-success border border-success/20">
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                  <span>+ Fee 5% Masuk</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                  <span>- Pencairan Admin</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              {entry.orderId ? (
                                <Link
                                  href={`/orders/${entry.orderId}`}
                                  className="font-mono text-primary hover:underline font-semibold flex items-center gap-1"
                                >
                                  <span>Order #{entry.orderId.slice(0, 8)}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              ) : (
                                <span className="font-mono text-text-muted">Pencairan Kas</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-text leading-relaxed max-w-xs">
                              {entry.reason}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span
                                className={`font-money font-bold text-sm ${
                                  isCredit ? "text-success" : "text-danger"
                                }`}
                              >
                                {isCredit ? "+" : "-"}
                                {formatRupiah(entry.amount)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-soft text-text-muted border border-border">
                                <Mail className="w-3 h-3 text-primary" />
                                <span>Terkirim</span>
                              </span>
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
      )}

      {/* MODAL PENCAIRAN SALDO PLATFORM */}
      {showWithdrawModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingWithdraw) {
              setShowWithdrawModal(false);
            }
          }}
        >
          <div
            className="bg-surface border border-border rounded-xl max-w-lg w-full max-h-[90dvh] flex flex-col shadow-floating overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border bg-surface shrink-0">
              <div className="pr-3">
                <h3 className="font-bold text-base sm:text-lg text-text flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <span>Cairkan Saldo Pendapatan Platform</span>
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Tarik dana fee 5% platform ke rekening bank atau e-wallet resmi. Seluruh mutasi akan otomatis dicatat dan dilaporkan via email audit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingWithdraw && setShowWithdrawModal(false)}
                disabled={isSubmittingWithdraw}
                className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-neutral-soft transition-colors shrink-0"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Konten Scrollable Modal */}
            <form onSubmit={handleSubmitPlatformWithdraw} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {withdrawError && (
                  <div className="p-3 bg-danger-soft border border-danger/20 rounded-md text-xs text-danger flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                {/* Saldo Tersedia Box */}
                <div className="p-3.5 bg-primary-soft/40 border border-primary/20 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs text-text-muted block">Saldo Tersedia Saat Ini</span>
                    <span className="text-lg font-extrabold text-primary font-money">
                      {formatRupiah(platformBalance)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(platformBalance.toString())}
                    className="text-xs font-bold text-primary hover:underline px-2.5 py-1 rounded bg-primary-soft"
                  >
                    Tarik Semua
                  </button>
                </div>

                {/* Input Nominal */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text">
                    Nominal Pencairan (Rupiah)
                  </label>
                  <input
                    type="number"
                    min="10000"
                    max={platformBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Contoh: 100000"
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm text-text font-money focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />

                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[50000, 100000, 250000, 500000].map((nominal) => {
                      if (nominal > platformBalance) return null;
                      return (
                        <button
                          key={nominal}
                          type="button"
                          onClick={() => setWithdrawAmount(nominal.toString())}
                          className="px-2.5 py-1 text-xs rounded border border-border bg-background hover:bg-neutral-soft text-text transition-colors font-mono"
                        >
                          {formatRupiah(nominal)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pilihan Metode & Bank */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text">
                    Pilih Bank atau E-Wallet Tujuan
                  </label>
                  <select
                    value={withdrawBank}
                    onChange={(e) => {
                      setWithdrawBank(e.target.value);
                      const isEw = ["GoPay", "OVO", "DANA", "ShopeePay"].some((ew) =>
                        e.target.value.includes(ew)
                      );
                      setWithdrawMethod(isEw ? "EWALLET" : "BANK");
                    }}
                    className="w-full p-2.5 bg-background border border-border rounded-md text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {SUPPORTED_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nomor Rekening */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text">
                    Nomor Rekening / Nomor HP E-Wallet
                  </label>
                  <input
                    type="text"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    placeholder="Contoh: 1234567890 atau 08123456789"
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                {/* Nama Pemilik Rekening */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text">
                    Nama Pemilik Rekening (Sesuai Buku Tabungan / Akun)
                  </label>
                  <input
                    type="text"
                    value={withdrawHolder}
                    onChange={(e) => setWithdrawHolder(e.target.value)}
                    placeholder="Contoh: Aditya Teguh Anugrah Wijaya"
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                {/* Catatan */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text">
                    Catatan Internal Admin (Opsional)
                  </label>
                  <input
                    type="text"
                    value={withdrawNote}
                    onChange={(e) => setWithdrawNote(e.target.value)}
                    placeholder="Contoh: Pencairan pendapatan mingguan"
                    className="w-full p-2.5 bg-background border border-border rounded-md text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Info Notifikasi */}
                <div className="p-3 bg-neutral-soft rounded-lg text-[11px] text-text-muted flex items-start gap-2">
                  <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Bukti transaksi pencairan kas platform ini akan langsung dikirimkan ke <strong>aditya.teguhanugrahwijaya@gmail.com</strong> dan <strong>admin@jokiday.com</strong>.
                  </span>
                </div>
              </div>

              {/* Footer Pinned */}
              <div className="p-4 sm:p-5 border-t border-border bg-surface flex items-center justify-end gap-3 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={isSubmittingWithdraw}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingWithdraw}
                >
                  Konfirmasi & Cairkan Saldo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Transfer Dana & Unggah Bukti Pembayaran */}
      {approveModalWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl shadow-floating max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-neutral-soft/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary-soft text-primary rounded-lg shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-text">
                    Konfirmasi Transfer & Unggah Bukti
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Pastikan dana telah ditransfer ke rekening desainer sebelum konfirmasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseApproveModal}
                disabled={isSubmittingApprove}
                className="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-neutral-soft transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitApproveWithProof} className="flex-1 overflow-y-auto flex flex-col min-h-0">
              <div className="p-4 sm:p-6 space-y-4 flex-1">
                {approveError && (
                  <div className="p-3 bg-danger-soft text-danger text-xs rounded-md border border-danger/20 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{approveError}</span>
                  </div>
                )}

                {/* Box Rincian Rekening Tujuan */}
                {(() => {
                  let dest: Record<string, string> = {};
                  try {
                    dest = JSON.parse(approveModalWithdrawal.destination || "{}");
                  } catch {
                    dest = {};
                  }
                  return (
                    <div className="bg-neutral-soft/80 border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text uppercase tracking-wider">
                          Rekening Tujuan Transfer
                        </span>
                        <span className="text-[10px] bg-primary-soft text-primary px-2 py-0.5 rounded-full font-bold">
                          {dest.bankName || "Bank / E-Wallet"}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-border/60">
                          <span className="text-text-muted">Penerima</span>
                          <span className="font-bold text-text">
                            {approveModalWithdrawal.user?.displayName || "Desainer"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-border/60">
                          <span className="text-text-muted">Atas Nama</span>
                          <span className="font-bold text-text">
                            {dest.accountHolder || approveModalWithdrawal.user?.displayName}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-border/60">
                          <span className="text-text-muted">Nomor Rekening / No. HP</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm text-text">
                              {dest.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(dest.accountNumber, "account")}
                              className="p-1 rounded hover:bg-background text-text-muted hover:text-text transition-colors"
                              title="Salin Nomor Rekening"
                            >
                              {copiedField === "account" ? (
                                <Check className="w-3.5 h-3.5 text-success" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-1.5 bg-surface px-3 rounded-lg border border-border">
                          <span className="text-text-muted font-medium">Nominal Transfer</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-money font-bold text-base text-primary">
                              {formatRupiah(approveModalWithdrawal.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(String(approveModalWithdrawal.amount), "amount")}
                              className="p-1 rounded hover:bg-neutral-soft text-text-muted hover:text-text transition-colors"
                              title="Salin Nominal"
                            >
                              {copiedField === "amount" ? (
                                <Check className="w-3.5 h-3.5 text-success" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Status Google Drive Admin */}
                {adminDrive?.isConnected ? (
                  <div className="p-3 bg-success-soft/50 border border-success/30 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-success shrink-0" />
                      <span className="text-text">
                        Bukti tersimpan ke Drive: <strong>{adminDrive.googleEmail}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-success font-bold font-mono">
                      JokiDay/bukti-penarikan
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                    <div className="flex items-start gap-2 text-xs text-amber-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <span>
                        Akun Google Drive admin belum tersambung. Anda wajib menyambungkan Google Drive untuk menyimpan bukti transfer.
                      </span>
                    </div>
                    <a
                      href="/api/auth/google/connect?redirect=/admin/withdrawals"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-xs transition-colors"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Sambungkan Google Drive Admin</span>
                    </a>
                  </div>
                )}

                {/* Upload Bukti Pembayaran */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-text">
                    Unggah Bukti Transfer Pembayaran <span className="text-danger">*</span>
                  </label>
                  <p className="text-[11px] text-text-muted">
                    Format: JPG, PNG, WEBP, atau PDF (Maksimal 10MB).
                  </p>

                  <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors bg-background/50">
                    <input
                      type="file"
                      id="proof-upload-input"
                      accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      required
                    />
                    <label
                      htmlFor="proof-upload-input"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      {proofPreviewUrl ? (
                        <div className="relative group">
                          <img
                            src={proofPreviewUrl}
                            alt="Preview Bukti"
                            className="max-h-36 rounded-lg object-contain shadow-xs border border-border"
                          />
                          <div className="text-[11px] text-primary font-bold mt-2 flex items-center justify-center gap-1">
                            <RotateCcw className="w-3 h-3" />
                            <span>Ganti File Bukti</span>
                          </div>
                        </div>
                      ) : proofFile ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-text">
                          <FileText className="w-5 h-5 text-primary" />
                          <span>{proofFile.name} ({(proofFile.size / 1024).toFixed(0)} KB)</span>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 bg-primary-soft text-primary rounded-full">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-primary hover:underline">
                              Klik untuk memilih file bukti transfer
                            </span>
                            <span className="block text-[10px] text-text-muted mt-0.5">
                              atau seret foto struk transfer ke sini
                            </span>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Nomor Referensi Transfer */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text">
                    Nomor Referensi Bank / Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={proofRefNumber}
                    onChange={(e) => setProofRefNumber(e.target.value)}
                    placeholder="Contoh: REF987654321 / Transfer m-Banking BCA"
                    className="w-full p-2.5 bg-background border border-border rounded-md text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-border bg-surface flex items-center justify-end gap-3 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseApproveModal}
                  disabled={isSubmittingApprove}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingApprove}
                  disabled={!proofFile || !adminDrive?.isConnected}
                >
                  Setujui & Unggah Bukti
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
