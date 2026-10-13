import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { ProfileRoleClient } from "./ProfileRoleClient";
import { ProfileDriveClient } from "./ProfileDriveClient";
import { ProfileAvatarClient } from "./ProfileAvatarClient";
import { Cloud, UserCheck } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await AuthService.getCurrentUser();
  let user = null;
  if (session) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        designerProfile: true,
        driveConnection: true,
      },
    });
  }

  if (!user) {
    redirect("/login?redirect=/profile");
  }

  const driveConnectionData = user.driveConnection
    ? {
        isConnected: user.driveConnection.status === "ACTIVE",
        googleEmail: user.driveConnection.googleEmail,
        status: user.driveConnection.status,
        connectedAt: user.driveConnection.connectedAt.toISOString(),
      }
    : null;

  return (
    <AppShell role={user?.activeRole as any || "CUSTOMER"}>
      <div className="max-w-form mx-auto space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">
            Profil & Pengaturan Akun
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Kelola identitas, ganti peran aktif, dan integrasi penyimpanan file Google Drive.
          </p>
        </div>

        {/* Kartu Profil Utama */}
        <div className="bg-surface border border-border rounded-lg p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <ProfileAvatarClient
              currentAvatarUrl={user?.avatarUrl || null}
              displayName={user?.displayName || "Pengguna"}
            />
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-text">
                {user?.displayName || "Pengguna JokiDay"}
              </h2>
              <p className="text-xs sm:text-sm text-text-muted font-mono">
                {user?.email || "user@jokiday.com"}
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-soft text-xs text-text-muted font-medium">
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                <span>Akun Terverifikasi</span>
              </div>
            </div>
          </div>

          {/* Pengaturan Peran Akun */}
          {user?.isDesigner ? (
            <div className="pt-6 border-t border-border">
              <ProfileRoleClient
                userId={user.id}
                initialRole={user.activeRole as any || "CUSTOMER"}
              />
            </div>
          ) : (
            <div className="pt-6 border-t border-border flex items-center justify-between text-xs text-text-muted">
              <div>
                <span className="font-semibold text-text block">Peran Akun: Pelanggan (Customer)</span>
                <span>Akun Anda digunakan untuk memesan dan mengelola proyek desain.</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-secondary-soft text-secondary font-bold text-[11px]">
                Pelanggan
              </span>
            </div>
          )}
        </div>

        {/* Status Google Drive (Khusus Desainer untuk penyerahan file hasil kerja) */}
        {user?.isDesigner && (
          <div className="bg-surface border border-border rounded-lg p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-soft text-primary rounded-md">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-text">
                  Penyimpanan Google Drive Desainer
                </h3>
                <p className="text-xs text-text-muted">
                  File asli pesanan kamu disimpan langsung di Google Drive milikmu sendiri, bukan di server JokiDay.
                </p>
              </div>
            </div>

            <ProfileDriveClient connection={driveConnectionData} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
