"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
}: OrderActionButtonsProps) {
  const router = useRouter();
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memproses pembayaran");

      if (data.paidDirectly) {
        router.refresh();
      } else if (data.checkoutUrl) {
        router.push(data.checkoutUrl);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses pembayaran");
    } finally {
      setIsLoading(false);
    }
  };

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
              <div className="p-3 bg-success-soft/70 border border-success/30 rounded-md text-xs text-success font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Pembayaran Berhasil. Proyek Siap Dikerjakan.</span>
              </div>
              <Button
                variant="primary"
                fullWidth
                isLoading={isLoading}
                onClick={() => setShowDeliverModal(true)}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Hasil Desain ke Pelanggan</span>
              </Button>
              {customerId && (
                <Link
                  href={`/chat?userId=${customerId}`}
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
                  href={`/chat?userId=${customerId}`}
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
              <div className="p-3 bg-surface border border-border rounded-md text-xs text-text space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-primary">
                  <Clock className="w-4 h-4" />
                  <span>Desainer Sedang Mengerjakan Proyek</span>
                </div>
                <p className="text-text-muted leading-relaxed">
                  Desainer {designerName} sedang memproses pesananmu. Hasil pratinjau akan otomatis muncul begitu diunggah.
                </p>
              </div>
              {designerId && (
                <Link
                  href={`/chat?userId=${designerId}`}
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
                onClick={() => setShowRevisionModal(true)}
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg max-w-md w-full p-6 space-y-4 shadow-floating">
            <h3 className="font-bold text-lg text-text">
              Kirim Hasil Pekerjaan Desain
            </h3>
            <p className="text-xs text-text-muted">
              Tuliskan catatan hasil pengerjaan desain untuk pelanggan. Pratinjau hasil karya akan otomatis dilindungi sebelum pelanggan menyetujui pesanan.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text">
                Catatan Pengiriman
              </label>
              <textarea
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="Contoh: Halo kak, berikut konsep logo final sesuai brief. File master vektor AI dan PNG transparan siap diunduh setelah disetujui."
                rows={3}
                className="w-full p-3 bg-background border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5 p-3.5 bg-background border border-border rounded-md">
              <label className="block text-xs font-semibold text-text">
                Upload File Master (Google Drive)
              </label>
              <p className="text-[11px] text-text-muted">
                File otomatis tersimpan di Google Drive Anda. Format gambar akan otomatis dibuatkan pratinjau watermark.
              </p>
              <input
                type="file"
                onChange={(e) => setDeliveryFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-soft file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              {deliveryFile && (
                <p className="text-[11px] text-success font-medium flex items-center gap-1.5 pt-1">
                  <span>File terpilih: {deliveryFile.name} ({(deliveryFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeliverModal(false)}
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg max-w-md w-full p-6 space-y-4 shadow-floating">
            <h3 className="font-bold text-lg text-text">
              Ajukan Catatan Revisi
            </h3>
            <p className="text-xs text-text-muted">
              Jelaskan bagian yang perlu disesuaikan oleh desainer secara jelas dan spesifik.
            </p>

            <textarea
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="Contoh: Tolong sesuaikan warna biru logo agar lebih terang dan ubah font slogan..."
              rows={4}
              className="w-full p-3 bg-background border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRevisionModal(false)}
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

