import React from "react";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { redirect } from "next/navigation";
import { CustomerDashboardView } from "./CustomerDashboardView";
import { DesignerDashboardView } from "./DesignerDashboardView";
import { AdminDashboardView } from "./AdminDashboardView";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect("/login?redirect=/dashboard");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    redirect("/login");
  }

  // 0. DASHBOARD MODE ADMINISTRATOR
  if (user.isAdmin) {
    const [
      totalUsers,
      totalCustomers,
      totalDesigners,
      totalOrders,
      activeOrders,
      completedOrders,
      pendingWithdrawals,
      activeInvites,
      pendingWithdrawalsList,
      recentOrders,
      recentInvites,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isCustomer: true, isDesigner: false } }),
      prisma.user.count({ where: { isDesigner: true } }),
      prisma.order.count(),
      prisma.order.count({
        where: {
          status: {
            in: ["IN_PROGRESS", "AWAITING_APPROVAL", "REVISION", "DISPUTED"],
          },
        },
      }),
      prisma.order.count({ where: { status: "COMPLETED" } }),
      prisma.withdrawal.count({ where: { status: "REQUESTED" } }),
      prisma.designerInvite.count({ where: { status: "ACTIVE" } }),
      prisma.withdrawal.findMany({
        where: { status: "REQUESTED" },
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.order.findMany({
        include: { customer: true, designer: true, brief: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.designerInvite.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return (
      <AdminDashboardView
        displayName={user.displayName}
        stats={{
          totalUsers,
          totalCustomers,
          totalDesigners,
          totalOrders,
          activeOrders,
          completedOrders,
          pendingWithdrawals,
          activeInvites,
        }}
        pendingWithdrawalsList={pendingWithdrawalsList}
        recentOrders={recentOrders}
        recentInvites={recentInvites}
      />
    );
  }

  const role = user.activeRole || "CUSTOMER";

  // 1. DASHBOARD MODE CUSTOMER (PELANGGAN)
  if (role === "CUSTOMER") {
    const activeOrders = await prisma.order.findMany({
      where: {
        customerId: user.id,
        status: {
          in: ["IN_PROGRESS", "AWAITING_APPROVAL", "REVISION", "DISPUTED"],
        },
      },
      include: { brief: true, designer: true },
      orderBy: { deadlineAt: "asc" },
    });

    const awaitingPaymentOrders = await prisma.order.findMany({
      where: {
        customerId: user.id,
        status: "AWAITING_PAYMENT",
      },
      include: { brief: true, designer: true },
      orderBy: { createdAt: "desc" },
    });

    const completedOrdersCount = await prisma.order.count({
      where: {
        customerId: user.id,
        status: "COMPLETED",
      },
    });

    const myBriefs = await prisma.brief.findMany({
      where: {
        customerId: user.id,
      },
      include: {
        offers: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return (
      <CustomerDashboardView
        displayName={user.displayName}
        activeOrders={activeOrders}
        awaitingPaymentOrders={awaitingPaymentOrders}
        completedOrdersCount={completedOrdersCount}
        myBriefs={myBriefs}
      />
    );
  }

  // 2. DASHBOARD MODE DESAINER
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
