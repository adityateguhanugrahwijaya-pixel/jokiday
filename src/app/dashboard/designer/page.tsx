import React from "react";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { redirect } from "next/navigation";
import { DesignerDashboardView } from "@/app/dashboard/DesignerDashboardView";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DesignerDashboardPage() {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect("/login?redirect=/dashboard/designer");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    redirect("/login");
  }

  // Admin memiliki dashboard tersendiri dan tidak mengakses dashboard desainer
  if (user.isAdmin) {
    redirect("/admin");
  }

  // Perlindungan akses: jika pengguna bukan akun desainer terdaftar
  if (!user.isDesigner) {
    return (
      <AppShell role="CUSTOMER" displayName={user.displayName}>
        <div className="max-w-md mx-auto text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-full bg-secondary-soft text-secondary-text mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-text">
            Akses Desainer Belum Aktif
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Akun Anda saat ini terdaftar sebagai Pelanggan. Pendaftaran desainer di JokiDay beroperasi secara eksklusif dengan sistem tautan undangan resmi (invite-only).
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-primary text-white font-semibold text-sm hover:bg-primary/90"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // Akun desainer resmi
  const availableBalance = await LedgerService.getAvailableBalance(user.id);

  const activeOrders = await prisma.order.findMany({
    where: {
      designerId: user.id,
      status: {
        in: ["IN_PROGRESS", "AWAITING_APPROVAL", "REVISION", "DISPUTED"],
      },
    },
    include: { brief: true, customer: true },
    orderBy: { deadlineAt: "asc" },
  });

  const awaitingPaymentOrders = await prisma.order.findMany({
    where: {
      designerId: user.id,
      status: "AWAITING_PAYMENT",
    },
    include: { brief: true, customer: true },
    orderBy: { createdAt: "desc" },
  });

  const marketBriefs = await prisma.brief.findMany({
    where: { status: "OPEN", mode: "MARKET" },
    include: { customer: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const initialPackages = await prisma.servicePackage.findMany({
    where: { designerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DesignerDashboardView
      displayName={user.displayName}
      username={user.username}
      availableBalance={availableBalance}
      activeOrders={activeOrders}
      awaitingPaymentOrders={awaitingPaymentOrders}
      marketBriefs={marketBriefs}
      initialPackages={initialPackages}
    />
  );
}
