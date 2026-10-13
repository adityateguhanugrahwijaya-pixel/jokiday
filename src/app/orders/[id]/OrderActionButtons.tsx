"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/format";
import {
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  Send,
  Wallet,
  Clock,
  MessageSquare,
  FileCheck,
  X,
  Upload,
} from "lucide-react";

export interface OrderActionButtonsProps {
  orderId: string;
  status: string;
  price: number;
  designerNet?: number;
  viewerRole: "CUSTOMER" | "DESIGNER" | "ADMIN";
  customerName?: string;
  designerName?: string;
  customerId?: string;
  designerId?: string;
  latestRevisionNote?: string;
}

export function OrderActionButtons({
  orderId,
  status,
  price,
  designerNet = 0,
  viewerRole,
  customerName = "Pelanggan",
  designerName = "Desainer",
  customerId,
  designerId,
  latestRevisionNote,
}: OrderActionButtonsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoPay = searchParams?.get("pay") === "true";

  const [isLoading, setIsLoading] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("Pengiriman hasil desain final");
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // State untuk saldo refund customer
  const [refundBalance, setRefundBalance] = useState<number>(0);
  const [useBalance, setUseBalance] = useState<boolean>(true);

  useEffect(() => {
    if (status === "AWAITING_PAYMENT" && viewerRole === "CUSTOMER") {
      fetch("/api/wallet/customer-balance")
        .then((res) => res.json())
        .then((data) => {
          if (data.refundBalance) {
            setRefundBalance(data.refundBalance);
          }
        })
        .catch(() => {});
    }
  }, [status, viewerRole]);

  // Kunci scroll halaman belakang saat modal pengiriman atau revisi aktif
  useEffect(() => {
    if (showDeliverModal || showRevisionModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showDeliverModal, showRevisionModal]);

  const balanceToDeduct = useBalance ? Math.min(refundBalance, price) : 0;
  const remainingQrisAmount = Math.max(0, price - balanceToDeduct);

  const handlePay = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/orders/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, useBalance }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Gagal memproses pembayaran: Format respon server tidak valid.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memproses pembayaran");

      if (data.paidDirectly) {
        router.refresh();
      } else if (data.checkoutUrl) {
        // Direct ke menu pembayaran WaroengPay (UI pembayaran resmi)
        window.location.href = data.checkoutUrl;
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses pembayaran");
    } finally {
      setIsLoading(false);
    }
  };

  // Otomatis buka checkout pembayaran jika pengguna datang dari parameter ?pay=true
  useEffect(() => {
    if (autoPay && status === "AWAITING_PAYMENT" && viewerRole === "CUSTOMER" && !isLoading) {
      handlePay();
    }
  }, [autoPay, status, viewerRole]);

  const handleApprove = async () => {
    if (!confirm("Apakah kamu yakin menyetujui hasil desain ini? Dana akan langsung dirilis ke desainer.")) {
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/orders/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, event: "APPROVE_DELIVERY" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Gagal menyetujui order");
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionNote.trim()) {
      setErrorMsg("Harap tuliskan catatan revisi dengan jelas");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/orders/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          event: "REQUEST_REVISION",
          extraData: { note: revisionNote },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Gagal mengajukan revisi");
      }
      setShowRevisionModal(false);
      setRevisionNote("");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeliverWork = async () => {
    if (!deliveryNote.trim() && !deliveryFile) {
      setErrorMsg("Tuliskan catatan pengiriman atau pilih file hasil desain");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("note", deliveryNote.trim());
      if (deliveryFile) {
        formData.append("file", deliveryFile);
      }

      const res = await fetch(`/api/orders/${orderId}/deliver`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Gagal mengirim hasil kerja");
      }
      setShowDeliverModal(false);
      setDeliveryFile(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {errorMsg && (
        <div className="p-3 bg-danger-soft border border-danger/20 rounded text-xs text-danger flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAMPILAN KHUSUS DESAINER */}
      {viewerRole === "DESIGNER" && (
        <div className="space-y-3">
          {status === "AWAITING_PAYMENT" && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Menunggu Pembayaran Pelanggan</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Pelanggan ({customerName}) belum menyelesaikan pembayaran untuk order ini. Desainer tidak perlu membayar apa pun dan dilarang memulai pekerjaan sebelum status pembayaran lunas terverifikasi.
              </p>
              {customerId && (
                <div className="pt-1">
                  <Link
                    href={`/chat?userId=${customerId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border rounded text-xs font-semibold text-text hover:bg-background transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    <span>Hubungi Pelanggan via Chat</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {(status === "IN_PROGRESS" || status === "REVISION") && (
            <div className="space-y-3">
              {status === "REVISION" && latestRevisionNote ? (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2 text-xs">
                  <div className="font-bold text-amber-600 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span>Catatan Revisi dari Pelanggan:</span>
                  </div>
                  <div className="p-2.5 bg-surface border border-border rounded text-text font-medium whitespace-pre-wrap leading-relaxed">
                    &ldquo;{latestRevisionNote}&rdquo;
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-success-soft/70 border border-success/30 rounded-md text-xs text-success font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Pembayaran Berhasil. Proyek Siap Dikerjakan.</span>
                </div>
              )}
              <Button
                variant="primary"
                fullWidth
                isLoading={isLoading}
                onClick={() => {
                  setErrorMsg("");
                  setShowDeliverModal(true);
                }}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>
                  {status === "REVISION"
                    ? "Kirim Hasil Revisi ke Pelanggan"
                    : "Kirim Hasil Desain ke Pelanggan"}
                </span>
              </Button>
              {customerId && (
                <Link
                  href={`/chat?userId=${customerId}&designerId=${customerId}`}
                  className="inline-flex items-center justify-center w-full h-10 px-4 rounded-md bg-surface text-text border border-border font-semibold text-xs hover:bg-background transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  <span>Diskusi via Chat</span>
                </Link>
              )}
            </div>
          )}

          {status === "AWAITING_APPROVAL" && (
            <div className="p-4 bg-primary-soft border border-primary/20 rounded-lg space-y-2 text-xs">
              <div className="font-bold text-primary flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Menunggu Persetujuan Pelanggan</span>
              </div>
              <p className="text-text-muted leading-relaxed">
                Hasil karya telah dikirim ke pelanggan. Menunggu pelanggan memeriksa pratinjau dan memberikan persetujuan atau catatan revisi.
              </p>
              {customerId && (
                <Link
                  href={`/chat?userId=${customerId}&designerId=${customerId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded text-xs font-semibold text-text hover:bg-background mt-1"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  <span>Chat Pelanggan</span>
                </Link>
              )}
            </div>
          )}

          {status === "COMPLETED" && (
            <div className="p-4 bg-success-soft border border-success/30 rounded-lg space-y-2 text-xs">
              <div className="font-bold text-success flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" />
                <span>Order Selesai & Dana Berhasil Cair</span>
              </div>
              <p className="text-text leading-relaxed">
                Pelanggan telah menyetujui hasil desain. Pendapatan bersih sebesar{" "}
                <strong>{formatRupiah(designerNet)}</strong> telah diteruskan ke Saldo Dompet Anda.
              </p>
              <Link
                href="/wallet"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded text-xs font-bold hover:bg-primary/90 mt-1 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Buka Dompet Desainer</span>
              </Link>
            </div>
          )}

          {status === "CANCELLED" && (
            <div className="p-4 bg-neutral-soft border border-border rounded-lg space-y-1 text-xs text-text-muted">
              <div className="font-bold text-text flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-danger" />
                <span>Order Dibatalkan</span>
              </div>
              <p>Pembayaran dari pelanggan tidak diselesaikan atau order telah dibatalkan.</p>
            </div>
          )}
        </div>
      )}

      {/* TAMPILAN KHUSUS PELANGGAN (CUSTOMER) */}
      {viewerRole === "CUSTOMER" && (
        <div className="space-y-3">
          {status === "AWAITING_PAYMENT" && (
            <div className="space-y-3">
              {refundBalance > 0 && (
                <div className="p-3.5 bg-primary-soft/60 border border-primary/20 rounded-md space-y-2 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useBalance}
                      onChange={(e) => setUseBalance(e.target.checked)}
                      className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-text flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-primary" />
                        <span>Pakai Saldo Refund ({formatRupiah(refundBalance)})</span>
                      </div>
                      <p className="text-text-muted mt-0.5 leading-relaxed">
                        Dana dari order batal atau refund sebelumnya bisa langsung dipakai sebagai potongan pembayaran.
                      </p>
                    </div>
                  </label>

                  {useBalance && (
                    <div className="pt-2 border-t border-primary/10 space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between text-text-muted">
                        <span>Total Order:</span>
                        <span>{formatRupiah(price)}</span>
                      </div>
                      <div className="flex justify-between text-success font-semibold">
                        <span>Potongan Saldo:</span>
                        <span>-{formatRupiah(balanceToDeduct)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-primary pt-1 border-t border-primary/10">
                        <span>Sisa Tagihan QRIS:</span>
                        <span>{formatRupiah(remainingQrisAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="cta"
                fullWidth
                isLoading={isLoading}
                onClick={handlePay}
                className="flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {remainingQrisAmount === 0
                    ? "Bayar Lunas dengan Saldo Refund"
                    : `Bayar Sekarang (${formatRupiah(remainingQrisAmount)})`}
                </span>
              </Button>
            </div>
          )}

          {(status === "IN_PROGRESS" || status === "REVISION") && (
            <div className="space-y-3">
              {status === "REVISION" && latestRevisionNote ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-xs space-y-1.5">
                  <div className="font-bold text-amber-600 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span>Catatan Revisi Terkirim ke Desainer:</span>
                  </div>
                  <div className="p-2 bg-surface/90 border border-border rounded text-text font-medium leading-relaxed">
                    &ldquo;{latestRevisionNote}&rdquo;
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-surface border border-border rounded-md text-xs text-text space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-primary">
                    <Clock className="w-4 h-4" />
                    <span>Desainer Sedang Mengerjakan Proyek</span>
                  </div>
                  <p className="text-text-muted leading-relaxed">
                    Desainer {designerName} sedang memproses pesananmu. Hasil pratinjau akan otomatis muncul begitu diunggah.
                  </p>
                </div>
              )}
              {designerId && (
                <Link
                  href={`/chat?userId=${designerId}&designerId=${designerId}`}
                  className="inline-flex items-center justify-center w-full h-10 px-4 rounded-md bg-surface text-text border border-border font-semibold text-xs hover:bg-background transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  <span>Kirim Pesan ke Desainer</span>
                </Link>
              )}
            </div>
          )}

          {status === "AWAITING_APPROVAL" && (
            <div className="space-y-2">
              <Button
                variant="primary"
                fullWidth
                isLoading={isLoading}
                onClick={handleApprove}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Setujui Hasil Desain</span>
              </Button>

              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setErrorMsg("");
                  setShowRevisionModal(true);
                }}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Minta Revisi</span>
              </Button>
            </div>
          )}

          {status === "COMPLETED" && (
            <div className="p-3 bg-success-soft text-success rounded-md text-xs font-semibold text-center">
              Order telah selesai. Anda dapat mengunduh berkas desain resolusi penuh.
            </div>
          )}

          {status === "CANCELLED" && (
            <div className="p-3 bg-neutral-soft text-text-muted rounded-md text-xs text-center">
              Pesanan ini telah dibatalkan.
            </div>
          )}
        </div>
      )}

      {/* Modal Kirim Hasil Desain (Khusus Desainer) */}
      {showDeliverModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) {
              setShowDeliverModal(false);
              setErrorMsg("");
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
                <h3 className="font-bold text-base sm:text-lg text-text">
                  Kirim Hasil Pekerjaan Desain
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Tuliskan catatan hasil pengerjaan desain untuk pelanggan. Pratinjau hasil karya akan otomatis dilindungi sebelum pelanggan menyetujui pesanan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isLoading) {
                    setShowDeliverModal(false);
                    setErrorMsg("");
                  }
                }}
                disabled={isLoading}
                className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-neutral-soft transition-colors shrink-0"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Konten Scrollable */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {errorMsg && (
                <div className="p-3 bg-danger-soft border border-danger/20 rounded-md text-xs text-danger flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text">
                  Catatan Pengiriman
                </label>
                <textarea
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Contoh: Halo kak, berikut konsep logo final sesuai brief. File master vektor AI dan PNG transparan siap diunduh setelah disetujui."
                  rows={3}
                  className="w-full p-3 bg-background border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted/60"
                />
              </div>

              <div className="space-y-2 p-3.5 bg-background border border-border rounded-lg">
                <label className="block text-xs font-semibold text-text">
                  Upload File Master (Google Drive)
                </label>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  File otomatis tersimpan di Google Drive Anda. Format gambar akan otomatis dibuatkan pratinjau watermark.
                </p>
                <div className="mt-2">
                  <input
                    type="file"
                    id="master-delivery-file"
                    onChange={(e) => setDeliveryFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-text-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-soft file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>
                {deliveryFile && (
                  <div className="mt-2 p-2.5 bg-surface border border-border rounded-md flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text truncate">
                        {deliveryFile.name}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {(deliveryFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeliveryFile(null)}
                      className="text-text-muted hover:text-danger p-1 rounded transition-colors text-xs shrink-0"
                      title="Hapus file terpilih"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Aksi Pinned */}
            <div className="p-4 sm:p-5 border-t border-border bg-surface flex items-center justify-end gap-3 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDeliverModal(false);
                  setErrorMsg("");
                }}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isLoading}
                onClick={handleDeliverWork}
              >
                Kirim ke Pelanggan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Minta Revisi (Khusus Pelanggan) */}
      {showRevisionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) {
              setShowRevisionModal(false);
              setErrorMsg("");
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
                <h3 className="font-bold text-base sm:text-lg text-text">
                  Ajukan Catatan Revisi
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Jelaskan bagian yang perlu disesuaikan oleh desainer secara jelas dan spesifik.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isLoading) {
                    setShowRevisionModal(false);
                    setErrorMsg("");
                  }
                }}
                disabled={isLoading}
                className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-neutral-soft transition-colors shrink-0"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Konten Scrollable */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {errorMsg && (
                <div className="p-3 bg-danger-soft border border-danger/20 rounded-md text-xs text-danger flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text">
                  Detail Revisi
                </label>
                <textarea
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Contoh: Tolong sesuaikan warna biru logo agar lebih terang dan ubah font slogan..."
                  rows={4}
                  className="w-full p-3 bg-background border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted/60"
                />
              </div>
            </div>

            {/* Footer Aksi Pinned */}
            <div className="p-4 sm:p-5 border-t border-border bg-surface flex items-center justify-end gap-3 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowRevisionModal(false);
                  setErrorMsg("");
                }}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isLoading}
                onClick={handleRequestRevision}
              >
                Kirim Revisi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

