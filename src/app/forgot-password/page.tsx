"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal memproses permintaan reset kata sandi");
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan koneksi. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-xl">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Halaman Masuk</span>
        </Link>

        {isSubmitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">Tautan Reset Terkirim</h1>
              <p className="text-sm text-text-muted mt-2 leading-relaxed">
                Jika email <span className="text-text font-semibold">{email}</span> terdaftar di JokiDay, kami telah mengirimkan instruksi dan tautan untuk membuat kata sandi baru.
              </p>
            </div>
            <div className="p-3.5 bg-background rounded-lg border border-border text-xs text-text-muted text-left leading-relaxed">
              <p className="font-semibold text-text mb-1">Tips:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Periksa folder <strong className="text-text">Kotak Masuk (Inbox)</strong> atau <strong className="text-text">Spam/Junk</strong>.</li>
                <li>Tautan hanya berlaku selama <strong className="text-text">30 menit</strong> demi keamanan akun.</li>
              </ul>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="ghost" className="border border-border" fullWidth>
                  Kembali ke Masuk
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-3">
                <Mail className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-text">Lupa Kata Sandi?</h1>
              <p className="text-sm text-text-muted mt-1 leading-relaxed">
                Masukkan alamat email yang terdaftar. Kami akan mengirimkan tautan aman untuk mengatur ulang kata sandi Anda.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-danger-soft border border-danger/20 rounded-md text-danger text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-text mb-1">
                  Alamat Email Akun
                </label>
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                variant="cta"
                fullWidth
                isLoading={isLoading}
                className="mt-2"
              >
                Kirim Tautan Reset Kata Sandi
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
