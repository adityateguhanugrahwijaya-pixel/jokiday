import React from "react";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { redirect } from "next/navigation";
import { CustomerDashboardView } from "@/app/dashboard/CustomerDashboardView";

import { LedgerService } from "@/server/ledger/ledger.service";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect("/login?redirect=/dashboard/customer");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    redirect("/login");
  }

  // Admin memiliki dashboard tersendiri dan tidak mengakses dashboard pelanggan
  if (user.isAdmin) {
    redirect("/admin");
  }

  const refundBalance = await LedgerService.getCustomerRefundBalance(user.id);

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
      refundBalance={refundBalance}
    />
  );
}
