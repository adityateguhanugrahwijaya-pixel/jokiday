"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/format";
import { ArrowDownLeft, AlertCircle, Building2, Smartphone, CheckCircle2, ShieldCheck, X, Info } from "lucide-react";
import { PAYOUT_CHANNELS } from "@/lib/payout-channels";
import {
  MIN_WITHDRAWAL_AMOUNT,
  WithdrawalSettings,
  generateWithdrawalNoticeText,
  calculateWithdrawalFee,
  calculateNetAmount,
} from "@/lib/constants/withdrawal";

interface WithdrawalModalButtonProps {
  availableBalance: number;
  minWithdrawal?: number;
  savedBankName?: string | null;
  savedAccountNumber?: string | null;
  savedAccountHolder?: string | null;
  userDisplayName?: string;
  settings?: WithdrawalSettings | null;
}

export function WithdrawalModalButton({
  availableBalance,
  minWithdrawal = MIN_WITHDRAWAL_AMOUNT,
  savedBankName,
  savedAccountNumber,
  savedAccountHolder,
  userDisplayName = "",
  settings,
}: WithdrawalModalButtonProps) {
  const router = useRouter();
  const effectiveMinWithdrawal = settings?.minWithdrawal ?? minWithdrawal ?? MIN_WITHDRAWAL_AMOUNT;
  const noticeText = generateWithdrawalNoticeText(settings);

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>(
    availableBalance >= effectiveMinWithdrawal ? String(availableBalance) : String(effectiveMinWithdrawal)
  );

  const [bankCode, setBankCode] = useState<string>(
    savedBankName || "BCA"
  );
  const [accountNumber, setAccountNumber] = useState<string>(
    savedAccountNumber || ""
  );
  const [accountHolder, setAccountHolder] = useState<string>(
    savedAccountHolder || userDisplayName
  );
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedChannel =
    PAYOUT_CHANNELS.find((c) => c.code === bankCode || c.name === bankCode) ||
    PAYOUT_CHANNELS[0];

  const isEWallet = selectedChannel.type === "EWALLET";

  // Pengelompokan kanal
  const categories = Array.from(new Set(PAYOUT_CHANNELS.map((c) => c.category)));

  // Rincian realtime nominal & biaya
  const numAmount = parseInt(amount, 10) || 0;
  const transferFee = calculateWithdrawalFee(selectedChannel.code || selectedChannel.name, settings);
  const isFree = transferFee === 0;
  const netAmount = numAmount - transferFee;
  const isAmountValid = numAmount >= effectiveMinWithdrawal && numAmount <= availableBalance && netAmount > 0;

  const handleOpenModal = () => {
    setAmount(
      availableBalance >= effectiveMinWithdrawal ? String(availableBalance) : String(effectiveMinWithdrawal)
    );
    setErrorMsg("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < effectiveMinWithdrawal) {
      setErrorMsg(`Batas minimal penarikan dana adalah ${formatRupiah(effectiveMinWithdrawal)}`);
      return;
    }
    if (parsedAmount > availableBalance) {
      setErrorMsg("Nominal penarikan melebihi saldo tersedia");
      return;
    }
    const currentFee = calculateWithdrawalFee(selectedChannel.code || selectedChannel.name, settings);
    if (parsedAmount - currentFee <= 0) {
      setErrorMsg("Nominal penarikan setelah dikurangi biaya transfer tidak boleh Rp0 atau minus");
      return;
    }
    if (!accountNumber.trim() || !accountHolder.trim()) {
      setErrorMsg(
        isEWallet
          ? "Nomor akun E-Wallet dan nama pemilik akun wajib diisi"
          : "Nomor rekening dan nama pemilik rekening wajib diisi"
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          method: isEWallet ? "EWALLET" : "BANK",
          destination: {
            bankName: selectedChannel.name,
            accountNumber: accountNumber.trim(),
            accountHolder: accountHolder.trim(),
          },
          saveAsDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengajukan penarikan");

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses penarikan.");
    } finally {
      setIsLoading(false);
    }
  };

  const isBalanceInsufficient = availableBalance < effectiveMinWithdrawal;

  return (
    <>
      <Button
        variant="cta"
        onClick={handleOpenModal}
        className="flex items-center gap-2 font-bold shadow-sm"
      >
        <ArrowDownLeft className="w-4 h-4" />
        <span>Tarik Saldo</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-xl max-w-lg w-full p-5 sm:p-7 space-y-4 shadow-floating my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-text">
                    Tarik Saldo Freelancer
                  </h3>
                  <p className="text-xs text-text-muted">
                    Transfer langsung ke rekening bank atau dompet digital (e-money).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-text-muted hover:text-text p-1 rounded-md touch-target"
                aria-label="Tutup modal penarikan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notice Resmi Ketentuan Penarikan Saldo */}
            <div className="p-3.5 bg-primary-soft/70 border border-primary/20 rounded-lg flex items-start gap-2.5 text-xs text-text leading-relaxed shrink-0">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{noticeText}</span>
            </div>

            {/* Banner Informasi Batas Penarikan jika saldo kurang */}
            {isBalanceInsufficient && (
              <div className="p-3.5 bg-neutral-soft border border-border rounded-xl flex items-start gap-2.5 text-xs text-text shrink-0">
                <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-text">
                    Saldo Belum Mencapai Batas Minimum
                  </p>
                  <p className="text-text-muted leading-relaxed">
                    Saldo siap tarik Anda saat ini adalah <strong className="text-text">{formatRupiah(availableBalance)}</strong>. Batas minimum pencairan dana adalah <strong className="text-text">{formatRupiah(effectiveMinWithdrawal)}</strong>. Anda dapat mencairkan saldo setelah menyelesaikan order berikutnya.
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-danger-soft text-danger text-xs rounded-md border border-danger/20 flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm overflow-y-auto pr-1 flex-1">
              {/* Nominal */}
              <div>
                <label className="block font-semibold text-text mb-1">
                  Nominal Penarikan
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-text-muted text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={effectiveMinWithdrawal}
                    max={availableBalance}
                    step={1000}
                    disabled={isBalanceInsufficient}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 bg-background border border-border rounded-md text-text font-money text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted mt-1.5">
                  <span>Minimal: {formatRupiah(effectiveMinWithdrawal)}</span>
                  {availableBalance >= effectiveMinWithdrawal && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(availableBalance))}
                      className="text-primary font-semibold hover:underline"
                    >
                      Tarik Semua ({formatRupiah(availableBalance)})
                    </button>
                  )}
                </div>
              </div>

              {/* Pilihan Bank / E-Money */}
              <div>
                <label className="block font-semibold text-text mb-1">
                  Bank Tujuan / E-Money
                </label>
                <div className="relative">
                  <select
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
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
                <div className="text-[11px] text-text-muted mt-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    {isEWallet ? (
                      <>
                        <Smartphone className="w-3 h-3 text-secondary" />
                        <span>Kategori Uang Elektronik (E-Wallet)</span>
                      </>
                    ) : (
                      <>
                        <Building2 className="w-3 h-3 text-primary" />
                        <span>Kategori Transfer Bank</span>
                      </>
                    )}
                  </span>
                  <span className={`font-semibold ${isFree ? "text-success" : "text-text-muted"}`}>
                    {isFree ? "Gratis Biaya Transfer" : "Biaya BI-FAST Rp4.000"}
                  </span>
                </div>
              </div>

              {/* Rincian Realtime Nominal Penarikan */}
              <div className="p-3.5 bg-background border border-border rounded-lg space-y-2 text-xs">
                <span className="font-bold text-text block text-[11px] uppercase tracking-wider text-text-muted">
                  Rincian Penarikan
                </span>
                <div className="flex items-center justify-between text-text-muted">
                  <span>Nominal penarikan:</span>
                  <span className="font-semibold text-text font-money">
                    {formatRupiah(numAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-text-muted">
                  <span>Biaya transfer:</span>
                  <span className={`font-semibold font-money ${isFree ? "text-success font-bold" : "text-text"}`}>
                    {isFree ? "Rp0 (Gratis)" : `${formatRupiah(transferFee)} (BI-FAST)`}
                  </span>
                </div>
                <div className="border-t border-border pt-2 flex items-center justify-between font-bold">
                  <span className="text-text">Estimasi diterima:</span>
                  <span className="text-primary text-sm font-money">
                    {formatRupiah(Math.max(0, netAmount))}
                  </span>
                </div>
                {numAmount > 0 && numAmount < minWithdrawal && (
                  <p className="text-[11px] text-danger font-medium pt-1">
                    Minimal penarikan adalah {formatRupiah(minWithdrawal)}.
                  </p>
                )}
                {numAmount > availableBalance && (
                  <p className="text-[11px] text-danger font-medium pt-1">
                    Nominal melebihi saldo tersedia ({formatRupiah(availableBalance)}).
                  </p>
                )}
                {numAmount >= minWithdrawal && netAmount <= 0 && (
                  <p className="text-[11px] text-danger font-medium pt-1">
                    Nominal penarikan setelah dikurangi biaya transfer tidak boleh Rp0 atau minus.
                  </p>
                )}
              </div>

              {/* Nomor Rekening / Nomor HP */}
              <div>
                <label className="block font-semibold text-text mb-1">
                  {isEWallet ? "Nomor Handphone Terdaftar di E-Wallet" : "Nomor Rekening Bank"}
                </label>
                <input
                  type="text"
                  placeholder={isEWallet ? "Contoh: 081234567890" : "Contoh: 1234567890"}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-[11px] text-text-muted mt-1 block">
                  {isEWallet
                    ? "Pastikan nomor HP aktif dan akun e-wallet sudah upgrade/terverifikasi."
                    : "Hanya masukkan digit angka tanpa tanda titik atau spasi."}
                </span>
              </div>

              {/* Nama Pemilik Rekening */}
              <div>
                <label className="block font-semibold text-text mb-1">
                  {isEWallet ? "Nama Pemilik Akun E-Wallet" : "Nama Pemilik Rekening"}
                </label>
                <input
                  type="text"
                  placeholder={isEWallet ? "Nama lengkap di aplikasi e-wallet" : "Sesuai nama di buku tabungan / m-banking"}
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Opsi Simpan Rekening */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveAsDefault}
                    onChange={(e) => setSaveAsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                  />
                  <span className="text-xs text-text font-medium">
                    Simpan sebagai rekening utama pencairan otomatis
                  </span>
                </label>
              </div>

              {/* Ringkasan & Tombol Aksi */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  {isFree ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                      <span className="text-success font-medium">Gratis biaya transfer</span>
                    </>
                  ) : (
                    <>
                      <Info className="w-4 h-4 text-text-muted shrink-0" />
                      <span>Biaya BI-FAST Rp4.000</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="cta"
                    disabled={isBalanceInsufficient || !isAmountValid}
                    isLoading={isLoading}
                  >
                    {isBalanceInsufficient ? "Saldo Belum Mencukupi" : "Konfirmasi Penarikan"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
