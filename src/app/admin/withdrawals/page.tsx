import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { AdminWithdrawalClient } from "./AdminWithdrawalClient";

export const dynamic = "force-dynamic";

export default async function AdminWithdrawalsPage() {
  const session = await AuthService.getCurrentUser();
  const currentUser = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { displayName: true },
      })
    : null;

  const withdrawals = await prisma.withdrawal.findMany({
    include: {
      user: {
        include: { designerProfile: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const autoPayoutConfig = await prisma.appConfig.findUnique({
    where: { key: "auto_payout_verified" },
  });

  return (
    <AppShell displayName={currentUser?.displayName || "Admin"} isAdmin={true}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">
            Panel Admin: Manajemen Penarikan Saldo
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Verifikasi transfer pencairan dana freelancer dan konfigurasi otomatisasi persetujuan.
          </p>
        </div>

        {/* Tab Navigasi Admin */}
        <div className="flex items-center gap-2 border-b border-border pb-1">
          <span className="px-4 py-2 rounded-t-md text-xs font-bold text-primary border-b-2 border-primary bg-primary-soft/30">
            Penarikan Saldo Freelancer
          </span>
          <a
            href="/admin/invites"
            className="px-4 py-2 rounded-t-md text-xs font-semibold text-text-muted hover:text-text transition-colors"
          >
            Undangan Desainer (Invite-Only)
          </a>
        </div>

        <AdminWithdrawalClient
          initialWithdrawals={withdrawals}
          initialAutoPayout={autoPayoutConfig?.value === "true"}
        />
      </div>
    </AppShell>
  );
}
