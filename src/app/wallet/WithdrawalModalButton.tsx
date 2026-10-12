"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/format";
import { ArrowDownLeft, AlertCircle } from "lucide-react";

export function WithdrawalModalButton({ availableBalance }: { availableBalance: number }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>("50000");
  const [bankName, setBankName] = useState("BCA");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 50000) {
      setErrorMsg("Batas minimal penarikan adalah Rp50.000");
      return;
    }
    if (numAmount > availableBalance) {
      setErrorMsg("Saldo tidak mencukupi untuk penarikan ini");
      return;
    }
    if (!accountNumber || !accountHolder) {
      setErrorMsg("Nomor rekening dan nama pemilik rekening wajib diisi");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          method: "BANK",
          destination: { bankName, accountNumber, accountHolder },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengajukan penarikan");

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="cta"
        onClick={() => setIsOpen(true)}
        disabled={availableBalance < 50000}
        className="flex items-center gap-2"
      >
        <ArrowDownLeft className="w-4 h-4" />
        <span>Tarik Saldo</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg max-w-md w-full p-6 space-y-4 shadow-floating">
            <h3 className="font-bold text-lg text-text">
              Ajukan Penarikan Saldo
            </h3>

            {errorMsg && (
              <div className="p-3 bg-danger-soft text-danger text-xs rounded border border-danger/20 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-text mb-1">
                  Nominal Penarikan (Rp)
                </label>
                <input
                  type="number"
                  min={50000}
                  max={availableBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text font-money focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-xs text-text-muted mt-1 block">
                  Maksimal: {formatRupiah(availableBalance)} (Min. Rp50.000)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Bank Tujuan
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="BCA">Bank BCA</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">Bank BRI</option>
                  <option value="BNI">Bank BNI</option>
                  <option value="Jago">Bank Jago</option>
                  <option value="DANA">DANA (E-Wallet)</option>
                  <option value="GoPay">GoPay (E-Wallet)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Nomor Rekening / Nomor HP E-Wallet
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Nama Pemilik Rekening
                </label>
                <input
                  type="text"
                  placeholder="Sesuai buku tabungan"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
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
                  isLoading={isLoading}
                >
                  Konfirmasi Tarik Dana
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
