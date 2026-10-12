"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatRupiah, formatDate } from "@/lib/format";
import { CheckCircle2, Send, Tag, AlertCircle, MessageSquare } from "lucide-react";

export function BriefDetailClient({
  brief,
  currentUserId,
  currentDesignerId,
  customerId,
}: {
  brief: any;
  currentUserId?: string;
  currentDesignerId: string;
  customerId: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form state penawaran desainer
  const [offerPrice, setOfferPrice] = useState("50000");
  const [durationDays, setDurationDays] = useState(String(brief.desiredDeadlineDays || 3));
  const [revisionQuota, setRevisionQuota] = useState(String(brief.revisionQuota || 2));
  const [offerNote, setOfferNote] = useState("");

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseInt(offerPrice, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Harga penawaran harus valid dalam rupiah");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefId: brief.id,
          designerId: currentDesignerId,
          price: priceNum,
          durationDays: parseInt(durationDays, 10) || 3,
          revisionQuota: parseInt(revisionQuota, 10) || 2,
          deliverables: ["Hasil desain final resolusi tinggi (PNG/JPG)"],
          note: offerNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengirim penawaran");

      setOfferNote("");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChatDesigner = async (offer: any) => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const initialMsg = `Halo kak ${offer.designer.displayName}, saya tertarik dengan penawaran Anda untuk proyek "${brief.title}" seharga ${formatRupiah(offer.price)} (${offer.durationDays} hari kerja, kuota ${offer.revisionQuota}x revisi). Saya ingin berdiskusi terlebih dahulu mengenai pengerjaannya.`;

      const res = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designerId: offer.designer.id,
          initialMessage: initialMsg,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal membuka obrolan dengan desainer");

      const params = new URLSearchParams({
        threadId: data.threadId,
        offerId: offer.id,
        briefId: brief.id,
        briefTitle: brief.title,
        offerPrice: String(offer.price),
        durationDays: String(offer.durationDays),
        revisionQuota: String(offer.revisionQuota),
        designerName: offer.designer.displayName,
      });

      router.push(`/chat?${params.toString()}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3 bg-danger-soft text-danger text-xs rounded border border-danger/20 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Daftar Penawaran Masuk */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text">
          Penawaran Masuk ({brief.offers.length})
        </h2>

        {brief.offers.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-muted text-sm">
            Belum ada penawaran untuk brief ini. Desainer dapat mengirim penawaran di bawah.
          </div>
        ) : (
          <div className="space-y-4">
            {brief.offers.map((offer: any) => (
              <div
                key={offer.id}
                className="bg-surface border border-border rounded-lg p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-text">
                      {offer.designer.displayName}
                    </span>
                    <span className="text-xs text-text-muted">
                      v{offer.version}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-soft text-text-muted">
                      {offer.status}
                    </span>
                  </div>

                  {offer.note && (
                    <p className="text-sm text-text-muted leading-relaxed">
                      "{offer.note}"
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-text-muted">
                    <span>Durasi: {offer.durationDays} hari kerja</span>
                    <span>Revisi: {offer.revisionQuota}x</span>
                    <span>Terkirim: {formatDate(offer.createdAt)}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                  <div className="font-money text-xl font-extrabold text-primary">
                    {formatRupiah(offer.price)}
                  </div>

                  {brief.status === "OPEN" && offer.status === "PENDING" && currentUserId === customerId && (
                    <Button
                      variant="cta"
                      size="sm"
                      isLoading={isSubmitting}
                      onClick={() => handleChatDesigner(offer)}
                      className="flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Tanya & Chat Desainer</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Kirim Penawaran Baru (Hanya untuk Desainer Terverifikasi yang Bukan Pemilik Brief) */}
      {brief.status === "OPEN" && Boolean(currentDesignerId) && currentUserId !== customerId && (
        <div className="bg-surface border border-border rounded-lg p-6 sm:p-8 space-y-4">
          <div>
            <h3 className="font-bold text-lg text-text">
              Kirim Penawaran Harga (Sisi Desainer)
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Tentukan harga pasti, durasi, dan kuota revisi yang kamu tawarkan untuk brief ini.
            </p>
          </div>

          <form onSubmit={handleCreateOffer} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-text mb-1">
                  Harga Penawaran (Rp)
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text font-money focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <span className="text-[11px] text-text-muted mt-1 block">
                  Net diterima: {formatRupiah(Math.floor((parseInt(offerPrice, 10) || 0) * 0.95))} (potongan fee 5%)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Durasi Pengerjaan (Hari)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Kuota Revisi
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={revisionQuota}
                  onChange={(e) => setRevisionQuota(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-text mb-1">
                Catatan Penawaran Tambahan
              </label>
              <textarea
                rows={3}
                placeholder="Jelaskan apa saja yang akan didapatkan customer dan jadwal pengerjaanmu..."
                value={offerNote}
                onChange={(e) => setOfferNote(e.target.value)}
                className="w-full p-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Penawaran ke Customer</span>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
