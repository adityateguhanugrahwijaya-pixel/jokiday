"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Building2, Smartphone, CreditCard, Edit3, Plus, CheckCircle2, AlertCircle, X, ShieldCheck } from "lucide-react";
import { PAYOUT_CHANNELS } from "@/lib/payout-channels";

interface PayoutAccountCardProps {
  initialBank?: string | null;
  initialAccount?: string | null;
  initialHolder?: string | null;
  userDisplayName: string;
}

export function PayoutAccountCard({
  initialBank,
  initialAccount,
  initialHolder,
  userDisplayName,
}: PayoutAccountCardProps) {
  const router = useRouter();
  const [bankName, setBankName] = useState(initialBank || "");
  const [accountNumber, setAccountNumber] = useState(initialAccount || "");
  const [accountHolder, setAccountHolder] = useState(initialHolder || userDisplayName);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formBankCode, setFormBankCode] = useState(initialBank || "BCA");
  const [formAccount, setFormAccount] = useState(initialAccount || "");
  const [formHolder, setFormHolder] = useState(initialHolder || userDisplayName);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const categories = Array.from(new Set(PAYOUT_CHANNELS.map((c) => c.category)));

  const selectedChannel =
    PAYOUT_CHANNELS.find((c) => c.code === formBankCode || c.name === formBankCode) ||
    PAYOUT_CHANNELS[0];

  const isEWallet = selectedChannel.type === "EWALLET";

  const handleOpenModal = () => {
    setFormBankCode(bankName || "BCA");
    setFormAccount(accountNumber || "");
    setFormHolder(accountHolder || userDisplayName);
    setErrorMsg("");
    setSuccessMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAccount.trim() || !formHolder.trim()) {
      setErrorMsg("Nomor rekening/e-wallet dan nama pemilik rekening wajib diisi.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/designer/payout-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: selectedChannel.name,
          accountNumber: formAccount.trim(),
          accountHolder: formHolder.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menyimpan informasi rekening.");

      setBankName(data.payoutAccount.bankName);
      setAccountNumber(data.payoutAccount.accountNumber);
      setAccountHolder(data.payoutAccount.accountHolder);

      setSuccessMsg("Informasi rekening pencairan berhasil disimpan!");
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg("");
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasSavedAccount = Boolean(bankName && accountNumber);

  return (
    <>
      <Card className="space-y-4 border-border bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-secondary-soft text-secondary-text flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-text">
                Rekening Pencairan Dana
              </h3>
              <p className="text-xs text-text-muted">
                Rekening tujuan pengiriman hasil joki desain kamu.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 self-start sm:self-auto text-xs"
          >
            {hasSavedAccount ? (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ubah Rekening</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Atur Rekening</span>
              </>
            )}
          </Button>
        </div>

        {hasSavedAccount ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-background border border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-text">
                  {bankName}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-soft text-primary font-bold">
                  Rekening Utama
                </span>
              </div>
              <p className="font-mono text-base font-bold text-text tracking-wide">
                {accountNumber}
              </p>
              <p className="text-xs text-text-muted">
                Atas Nama: <strong className="text-text">{accountHolder}</strong>
              </p>
            </div>

            <div className="flex items-center gap-1 text-xs text-success font-medium shrink-0">
              <ShieldCheck className="w-4 h-4" />
              <span>Siap Menerima Transfer</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-secondary-soft/40 border border-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="text-xs font-bold text-secondary-text">
                Belum ada rekening pencairan yang disimpan
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Simpan nomor rekening bank atau e-wallet kamu agar penarikan saldo dapat diproses dengan cepat.
              </p>
            </div>
            <Button
              type="button"
              variant="cta"
              size="sm"
              onClick={handleOpenModal}
              className="shrink-0 text-xs"
            >
              Atur Sekarang
            </Button>
          </div>
        )}
      </Card>

      {/* Modal Edit Rekening */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-floating my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text">
                {hasSavedAccount ? "Perbarui Rekening Pencairan" : "Atur Rekening Pencairan"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMsg && (
              <div className="p-3 bg-success-soft text-success text-xs rounded-md border border-success/20 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="p-3 bg-danger-soft text-danger text-xs rounded-md border border-danger/20 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-text mb-1 text-xs">
                  Pilihan Bank / Dompet Digital (E-Money)
                </label>
                <select
                  value={formBankCode}
                  onChange={(e) => setFormBankCode(e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map((cat) => (
                    <optgroup key={cat} label={cat}>
                      {PAYOUT_CHANNELS.filter((c) => c.category === cat).map((ch) => (
                        <option key={ch.code} value={ch.code}>
                          {ch.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1 text-xs">
                  {isEWallet ? "Nomor Handphone E-Wallet" : "Nomor Rekening Bank"}
                </label>
                <input
                  type="text"
                  placeholder={isEWallet ? "Contoh: 081234567890" : "Contoh: 1234567890"}
                  value={formAccount}
                  onChange={(e) => setFormAccount(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full h-10 px-3 bg-background border border-border rounded-md text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1 text-xs">
                  {isEWallet ? "Nama Pemilik Akun E-Wallet" : "Nama Pemilik Rekening"}
                </label>
                <input
                  type="text"
                  placeholder="Sesuai buku tabungan atau akun e-wallet"
                  value={formHolder}
                  onChange={(e) => setFormHolder(e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="cta"
                  size="sm"
                  isLoading={isLoading}
                >
                  Simpan Rekening
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
