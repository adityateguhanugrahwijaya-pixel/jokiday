import React from "react";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { redirect } from "next/navigation";
import { AdminDashboardView } from "@/app/dashboard/AdminDashboardView";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect("/login?redirect=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.isAdmin) {
    redirect("/dashboard/customer");
  }

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
