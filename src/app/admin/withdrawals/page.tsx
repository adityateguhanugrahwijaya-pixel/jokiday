import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
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

  const [
    withdrawals,
    autoPayoutConfig,
    platformBalance,
    totalPlatformRevenueAllTime,
    totalPlatformWithdrawnAllTime,
    platformLedgerEntries,
  ] = await Promise.all([
    prisma.withdrawal.findMany({
      include: {
        user: {
          include: { designerProfile: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appConfig.findUnique({
      where: { key: "auto_payout_verified" },
    }),
    LedgerService.getPlatformBalance(),
    LedgerService.getTotalPlatformRevenueAllTime(),
    LedgerService.getTotalPlatformWithdrawnAllTime(),
    prisma.ledgerEntry.findMany({
      where: { account: "PLATFORM_REVENUE" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

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

        <AdminWithdrawalClient
          initialWithdrawals={withdrawals}
          initialAutoPayout={autoPayoutConfig?.value === "true"}
          initialPlatformBalance={platformBalance}
          initialTotalPlatformRevenueAllTime={totalPlatformRevenueAllTime}
          initialTotalPlatformWithdrawnAllTime={totalPlatformWithdrawnAllTime}
          initialPlatformLedgerEntries={platformLedgerEntries}
        />
      </div>
    </AppShell>
  );
}
