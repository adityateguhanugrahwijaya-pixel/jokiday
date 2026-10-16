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
    include: { driveConnection: true },
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
    where: {
      status: "OPEN",
      OR: [
        { mode: "MARKET" },
        { mode: "DIRECT", targetDesignerId: user.id },
      ],
    },
    include: { customer: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  // Prioritaskan pesanan brief direct khusus desainer ini di baris teratas
  const sortedMarketBriefs = [...marketBriefs].sort((a, b) => {
    const aIsDirect = a.mode === "DIRECT" && a.targetDesignerId === user.id;
    const bIsDirect = b.mode === "DIRECT" && b.targetDesignerId === user.id;
    if (aIsDirect && !bIsDirect) return -1;
    if (!aIsDirect && bIsDirect) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const initialPackages = await prisma.servicePackage.findMany({
    where: { designerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const rawProducts = await prisma.product.findMany({
    where: { designerId: user.id, deletedAt: null },
    include: { previewAsset: true },
    orderBy: { createdAt: "desc" },
  });

  const initialProducts = rawProducts.map((p) => ({
    id: p.id,
    designerId: p.designerId,
    title: p.title,
    description: p.description,
    category: p.category,
    price: p.price,
    status: p.status as "PUBLISHED" | "ARCHIVED" | "HIDDEN",
    sourceType: p.sourceType as "DRIVE_FILE" | "EXTERNAL_LINK",
    fileExtension: p.fileExtension,
    fileSizeBytes: p.fileSizeBytes,
    downloadCount: p.downloadCount,
    hasAccess: true,
    isOwner: true,
    hasPurchased: false,
    previewUrl: p.previewAsset?.id
      ? `/api/previews/${p.previewAsset.id}`
      : p.previewAsset?.driveFileId,
    createdAt: p.createdAt.toISOString(),
  }));

  const isDriveConnected = Boolean(
    user.driveConnection && user.driveConnection.status === "ACTIVE"
  );

  return (
    <DesignerDashboardView
      displayName={user.displayName}
      username={user.username}
      availableBalance={availableBalance}
      activeOrders={activeOrders}
      awaitingPaymentOrders={awaitingPaymentOrders}
      marketBriefs={sortedMarketBriefs.slice(0, 6)}
      initialPackages={initialPackages}
      initialProducts={initialProducts}
      isDriveConnected={isDriveConnected}
    />
  );
}
