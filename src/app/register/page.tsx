"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg("Kata sandi minimal 8 karakter");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Pendaftaran gagal");

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
          Buat Akun Pelanggan JokiDay
        </h1>
        <p className="text-sm text-text-muted">
          Pesan desain grafis profesional dengan jaminan pembayaran aman.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-surface py-8 px-6 sm:px-10 border border-border rounded-lg shadow-floating space-y-6">
          {errorMsg && (
            <div className="p-3 bg-danger-soft text-danger text-xs rounded border border-danger/20 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4 text-sm">
            <div>
              <label className="block font-semibold text-text mb-1">
                Nama Lengkap / Nama Tampilan
              </label>
              <input
                type="text"
                placeholder="Contoh: Rian Pratama"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

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
                placeholder="Minimal 8 karakter"
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
              Daftar Sekarang
            </Button>
          </form>

          <div className="space-y-3 pt-2 border-t border-border text-center text-xs text-text-muted">
            <p>
              Sudah punya akun?{" "}
              <Link href="/login" className="font-bold text-primary hover:underline">
                Masuk di sini
              </Link>
            </p>
            <p className="text-[11px] text-text-muted/80 bg-neutral-soft p-2.5 rounded-md">
              Desainer bergabung via <strong>undangan khusus (invite-only)</strong>. Gunakan tautan khusus dari admin untuk mendaftar sebagai desainer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
