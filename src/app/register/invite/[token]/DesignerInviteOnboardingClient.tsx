"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, UserCheck, AlertCircle, ArrowRight, Lock, Mail, User, Phone, CreditCard, ExternalLink, FileText, CheckCircle2 } from "lucide-react";
import { validateNIK } from "@/lib/validation";

export function DesignerInviteOnboardingClient({
  token,
  inviteeName,
  note,
  expiresAt,
}: {
  token: string;
  inviteeName: string;
  note: string;
  expiresAt: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"REGISTER" | "LOGIN">("REGISTER");

  // Form Fields Register
  const [displayName, setDisplayName] = useState(inviteeName || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Form Fields Login Existing
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Mandatory Designer Verification Fields
  const [ktpNumber, setKtpNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [bio, setBio] = useState(
    note ? `Desainer spesialis ${note}. Siap mengerjakan proyek visual profesional.` : ""
  );
  const [categories, setCategories] = useState<string[]>(["logo"]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const availableCategories = [
    { id: "logo", label: "Logo & Identitas Brand" },
    { id: "kemasan", label: "Kemasan Produk & Label" },
    { id: "poster", label: "Poster & Spanduk Event" },
    { id: "media", label: "Konten Media Sosial" },
    { id: "ilustrasi", label: "Ilustrasi & Karakter" },
  ];

  const handleToggleCategory = (catId: string) => {
    if (categories.includes(catId)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== catId));
      }
    } else {
      setCategories([...categories, catId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const nikCheck = validateNIK(ktpNumber.trim());
    if (!nikCheck.valid) {
      setErrorMsg(nikCheck.reason);
      return;
    }
    if (phone.trim().length < 10) {
      setErrorMsg("Nomor WhatsApp/telepon aktif minimal 10 digit");
      return;
    }
    if (!bio.trim()) {
      setErrorMsg("Harap tulis ringkasan bio atau keahlian desainer Anda");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        mode,
        displayName,
        email,
        password,
        loginEmail,
        loginPassword,
        ktpNumber,
        phone,
        categories,
        portfolioUrl,
        bio,
      };

      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal menyelesaikan pendaftaran desainer");
      }

      // Berhasil klaim invite -> langsung menuju dashboard desainer
      window.location.href = data.redirectUrl || "/dashboard";
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Banner Undangan Eksklusif */}
      <div className="bg-primary-soft/60 border border-primary/20 rounded-xl p-5 sm:p-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-white text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Undangan Khusus Desainer Terverifikasi</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-text">
          Halo, {inviteeName}!
        </h1>
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          Selamat! Anda telah diundang oleh administrator untuk membuka jasa desain di JokiDay.
          Tautan ini bersifat satu kali pakai (one-time link). Lengkapi data verifikasi identitas di bawah untuk mengaktifkan akun desainer Anda.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-floating space-y-6">
        {errorMsg && (
          <div className="p-3.5 bg-danger-soft text-danger text-xs rounded-md border border-danger/20 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-sm">
          {/* Pilihan Metode Akun: Baru atau Eksisting */}
          <div>
            <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
              Langkah 1: Akun Pengguna
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-background border border-border rounded-lg">
              <button
                type="button"
                onClick={() => setMode("REGISTER")}
                className={`py-2 px-3 rounded-md text-xs font-bold transition-all ${
                  mode === "REGISTER"
                    ? "bg-surface text-primary shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Daftar Akun Baru
              </button>
              <button
                type="button"
                onClick={() => setMode("LOGIN")}
                className={`py-2 px-3 rounded-md text-xs font-bold transition-all ${
                  mode === "LOGIN"
                    ? "bg-surface text-primary shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Gunakan Akun yang Sudah Ada
              </button>
            </div>
          </div>

          {/* Form Akun Baru */}
          {mode === "REGISTER" ? (
            <div className="space-y-4 p-4 bg-background border border-border rounded-lg">
              <div>
                <label className="block font-semibold text-text text-xs mb-1">
                  Nama Tampilan Desainer
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-text-muted absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full h-10 pl-9 pr-3 bg-surface border border-border rounded-md text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text text-xs mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full h-10 pl-9 pr-3 bg-surface border border-border rounded-md text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text text-xs mb-1">
                  Kata Sandi Akun
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full h-10 pl-9 pr-3 bg-surface border border-border rounded-md text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Form Akun Yang Sudah Ada */
            <div className="space-y-4 p-4 bg-background border border-border rounded-lg">
              <div>
                <label className="block font-semibold text-text text-xs mb-1">
                  Email Akun Terdaftar
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full h-10 pl-9 pr-3 bg-surface border border-border rounded-md text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text text-xs mb-1">
                  Kata Sandi Akun Anda
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun Anda"
                    className="w-full h-10 pl-9 pr-3 bg-surface border border-border rounded-md text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Langkah 2: Verifikasi Identitas & Legalitas Desainer */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-text uppercase tracking-wider mb-1">
                Langkah 2: Data Verifikasi Identitas
              </label>
              <p className="text-[11px] text-text-muted">
                Data NIK KTP dan nomor telepon digunakan untuk verifikasi pencairan saldo dan jaminan keamanan transaksi.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-text text-xs mb-1">
                  Nomor Induk Kependudukan (NIK/KTP)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-text-muted absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={16}
                    value={ktpNumber}
                    onChange={(e) => setKtpNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="16 digit angka KTP"
                    className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-md text-xs text-text font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                {ktpNumber.length === 16 && (
                  <p className={`text-[11px] mt-1 font-medium ${validateNIK(ktpNumber).valid ? "text-emerald-600 dark:text-emerald-400" : "text-danger"}`}>
                    {validateNIK(ktpNumber).reason}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text text-xs mb-1">
                  Nomor WhatsApp Aktif
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-text-muted absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-md text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-text text-xs mb-1">
                Tautan Portofolio Karya (Opsional)
              </label>
              <div className="relative">
                <ExternalLink className="w-4 h-4 text-text-muted absolute left-3 top-3.5 pointer-events-none" />
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://behance.net/username atau Google Drive"
                  className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-md text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-text text-xs mb-2">
                Pilih Kategori Spesialisasi Desain
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableCategories.map((cat) => {
                  const isChecked = categories.includes(cat.id);
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => handleToggleCategory(cat.id)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                        isChecked
                          ? "bg-primary-soft text-primary border-primary font-bold"
                          : "bg-background text-text-muted border-border hover:border-primary/50"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-text text-xs mb-1">
                Biografi Singkat & Keahlian
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ceritakan pengalaman dan gaya desain Anda..."
                className="w-full p-3 bg-background border border-border rounded-md text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="cta"
            fullWidth
            isLoading={isLoading}
            className="h-11 text-sm font-bold mt-4"
          >
            Aktifkan Akun Desainer & Buka Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
}
