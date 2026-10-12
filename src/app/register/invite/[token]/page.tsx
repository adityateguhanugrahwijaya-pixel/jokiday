import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { DesignerInviteOnboardingClient } from "./DesignerInviteOnboardingClient";
import { AlertCircle, Lock, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DesignerInvitePage({
  params,
}: {
  params: { token: string };
}) {
  const invite = await prisma.designerInvite.findUnique({
    where: { token: params.token },
  });

  if (!invite) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-floating">
          <div className="w-12 h-12 rounded-full bg-danger-soft text-danger mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">
              Tautan Undangan Tidak Ditemukan
            </h1>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">
              Tautan undangan yang Anda buka tidak valid atau salah ketik.
              JokiDay beroperasi dengan sistem khusus undangan (invite-only) untuk menjamin kualitas desainer.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-lg bg-surface text-primary border border-border text-xs font-bold hover:bg-background transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    );
  }

  if (invite.status === "USED") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-floating">
          <div className="w-12 h-12 rounded-full bg-warning-soft text-warning mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">
              Undangan Sudah Pernah Digunakan
            </h1>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">
              Tautan khusus ini bersifat satu kali pakai (one-time link) dan telah digunakan untuk mendaftarkan akun desainer.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors"
          >
            Masuk ke Akun Anda
          </Link>
        </div>
      </div>
    );
  }

  if (invite.status === "REVOKED") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-floating">
          <div className="w-12 h-12 rounded-full bg-danger-soft text-danger mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">
              Undangan Dibatalkan
            </h1>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">
              Tautan undangan ini telah dibatalkan oleh administrator.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-surface text-text border border-border text-xs font-bold hover:bg-background transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  if (new Date() > invite.expiresAt) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-floating">
          <div className="w-12 h-12 rounded-full bg-warning-soft text-warning mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">
              Tautan Undangan Kadaluarsa
            </h1>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">
              Masa berlaku tautan undangan ini telah habis. Silakan hubungi admin JokiDay untuk mendapatkan tautan undangan baru.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-surface text-text border border-border text-xs font-bold hover:bg-background transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <DesignerInviteOnboardingClient
        token={invite.token}
        inviteeName={invite.inviteeName}
        note={invite.note}
        expiresAt={invite.expiresAt.toISOString()}
      />
    </div>
  );
}
