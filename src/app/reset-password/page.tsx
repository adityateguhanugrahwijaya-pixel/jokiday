"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setTokenError("Tautan reset kata sandi tidak valid atau tidak menyertakan kode keamanan.");
      setIsVerifying(false);
      return;
    }

    // Verifikasi awal token
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || "Tautan reset kata sandi tidak valid atau telah kedaluwarsa.");
        }
        setUserEmail(data.email || "");
      })
      .catch((err) => {
        setTokenError(err.message || "Tautan reset kata sandi tidak valid.");
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Kata sandi baru minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal mengatur ulang kata sandi.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-text-muted">Memeriksa keabsahan tautan reset...</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="w-12 h-12 bg-danger-soft text-danger rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-text">Tautan Tidak Valid</h1>
        <p className="text-sm text-text-muted leading-relaxed">
          {tokenError}
        </p>
        <div className="pt-2">
          <Link href="/forgot-password">
            <Button variant="cta" fullWidth>
              Minta Tautan Baru
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-text">Kata Sandi Diperbarui!</h1>
        <p className="text-sm text-text-muted leading-relaxed">
          Kata sandi akun Anda telah berhasil diatur ulang. Silakan masuk dengan kata sandi baru Anda.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button variant="cta" fullWidth>
              Masuk Sekarang
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-3">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-text">Atur Kata Sandi Baru</h1>
        <p className="text-sm text-text-muted mt-1 leading-relaxed">
          {userEmail ? (
            <>Untuk akun: <span className="text-text font-semibold">{userEmail}</span></>
          ) : (
            "Buat kata sandi baru yang kuat untuk akun Anda."
          )}
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
            Kata Sandi Baru
          </label>
          <input
            type="password"
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
            required
            minLength={8}
            autoFocus
          />
        </div>

        <div>
          <label className="block font-semibold text-text mb-1">
            Konfirmasi Kata Sandi Baru
          </label>
          <input
            type="password"
            placeholder="Ulangi kata sandi baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
            required
            minLength={8}
          />
        </div>

        <Button
          type="submit"
          variant="cta"
          fullWidth
          isLoading={isLoading}
          className="mt-2"
        >
          Simpan & Masuk
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense
          fallback={
            <div className="text-center py-12 space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-text-muted">Memuat halaman reset...</p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
