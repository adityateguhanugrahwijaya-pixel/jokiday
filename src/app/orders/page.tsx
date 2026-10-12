import React from "react";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { redirect } from "next/navigation";
import { OrdersViewClient } from "./OrdersViewClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect("/login?redirect=/orders");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  const role = (currentUser?.activeRole as "CUSTOMER" | "DESIGNER") || "CUSTOMER";

  // Strict role separation:
  // Mode Desainer hanya mengambil pekerjaan desainer.
  // Mode Pelanggan hanya mengambil pesanan belanja pelanggan.
  const whereClause =
    role === "DESIGNER"
      ? { designerId: session.userId }
      : { customerId: session.userId };

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      brief: true,
      designer: true,
      customer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <OrdersViewClient
      orders={orders}
      role={role}
      displayName={currentUser?.displayName || "Pengguna"}
    />
  );
}

