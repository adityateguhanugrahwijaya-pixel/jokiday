"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AlertCircle, KeyRound } from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Email atau kata sandi salah");

      const target = redirectTarget || (data.user?.isAdmin ? "/admin/invites" : data.user?.activeRole === "DESIGNER" ? "/dashboard" : "/");
      window.location.href = target;
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setErrorMsg("");
  };

  return (
    <div className="bg-surface py-8 px-6 sm:px-10 border border-border rounded-lg shadow-floating space-y-6">
      {errorMsg && (
        <div className="p-3 bg-danger-soft text-danger text-xs rounded border border-danger/20 flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 text-sm">
        <div>
          <label className="block font-semibold text-text mb-1">
            Alamat Email
          </label>
          <input
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label className="block font-semibold text-text mb-1">
            Kata Sandi
          </label>
          <input
            type="password"
            placeholder="Masukkan kata sandi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <Button
          type="submit"
          variant="cta"
          fullWidth
          isLoading={isLoading}
          className="mt-2"
        >
          Masuk
        </Button>
      </form>

      <div className="p-3 bg-background border border-border rounded-lg space-y-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-text">
          <KeyRound className="w-3.5 h-3.5 text-primary" />
          <span>Akun Demo Bawaan:</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => fillDemoAccount("admin@jokiday.com")}
            className="p-1.5 rounded bg-surface hover:bg-border/40 border border-border text-center text-text font-medium transition-colors"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount("budi.designer@jokiday.com")}
            className="p-1.5 rounded bg-surface hover:bg-border/40 border border-border text-center text-text font-medium transition-colors"
          >
            Desainer
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount("ani.customer@jokiday.com")}
            className="p-1.5 rounded bg-surface hover:bg-border/40 border border-border text-center text-text font-medium transition-colors"
          >
            Pelanggan
          </button>
        </div>
        <p className="text-[11px] text-text-muted text-center">
          Kata sandi semua akun demo: <span className="font-mono text-text">password123</span>
        </p>
      </div>

      <p className="text-center text-xs text-text-muted">
        Belum punya akun?{" "}
        <Link href="/register" className="font-bold text-primary hover:underline">
          Daftar sebagai pelanggan
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-md bg-primary text-white flex items-center justify-center font-extrabold text-xl">
            J
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-text">
            Joki<span className="text-secondary">Day</span>
          </span>
        </Link>
        <h1 className="text-2xl font-extrabold text-text">
          Masuk ke Akun Anda
        </h1>
        <p className="text-sm text-text-muted">
          Masukkan alamat email dan kata sandi untuk melanjutkan.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Suspense fallback={<div className="bg-surface p-8 border border-border rounded-lg text-center text-xs text-text-muted">Memuat...</div>}>
          <LoginFormContent />
        </Suspense>
      </div>
    </div>
  );
}
