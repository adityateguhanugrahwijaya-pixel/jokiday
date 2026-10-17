import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { formatDate } from "@/lib/format";
import { ArrowLeft, Clock, FileCheck } from "lucide-react";
import { BriefDetailClient } from "./BriefDetailClient";
import { CustomerReputationCard } from "@/components/reviews/CustomerReputationCard";
import { ReviewService } from "@/server/reviews/review.service";

export const dynamic = "force-dynamic";

export default async function BriefDetailPage({ params }: { params: { id: string } }) {
  const session = await AuthService.getCurrentUser();
  let currentUser = null;
  if (session) {
    currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { designerProfile: true },
    });
  }

  const brief = await prisma.brief.findUnique({
    where: { id: params.id },
    include: {
      customer: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
        },
      },
      offers: {
        include: { designer: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!brief) {
    notFound();
  }

  let targetDesigner = null;
  if (brief.targetDesignerId) {
    targetDesigner = await prisma.user.findUnique({
      where: { id: brief.targetDesignerId },
      select: { id: true, displayName: true, username: true },
    });
  }

  const isVerifiedDesigner = Boolean(currentUser?.isDesigner && currentUser?.designerProfile?.isVerified);
  const currentDesignerId = isVerifiedDesigner ? (currentUser?.id || "") : "";

  let customerReputation = null;
  if (
    currentUser?.activeRole === "DESIGNER" &&
    currentUser.id !== brief.customerId
  ) {
    customerReputation = await ReviewService.getCustomerReputationForDesigner(
      brief.customerId,
      {
        userId: currentUser.id,
        activeRole: currentUser.activeRole,
        isAdmin: currentUser.isAdmin,
      }
    );
  }

  return (
    <AppShell
      role={currentUser?.activeRole as "CUSTOMER" | "DESIGNER" || "CUSTOMER"}
      displayName={currentUser?.displayName || "Pengguna"}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/market"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke pasar brief</span>
        </Link>

        {/* Info Brief */}
        <div className="bg-surface border border-border rounded-lg p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-soft text-text-muted capitalize">
                {brief.category}
              </span>
              {brief.mode === "DIRECT" && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary shadow-2xs">
                  ⭐ Pesanan Langsung ({targetDesigner?.displayName || "Desainer"})
                </span>
              )}
            </div>
            <Badge variant={brief.status === "OPEN" ? "info" : "neutral"}>
              {brief.status === "OPEN" ? "Terbuka Menerima Penawaran" : brief.status}
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
            {brief.title}
          </h1>

          <p className="text-sm sm:text-base text-text-muted leading-relaxed whitespace-pre-line">
            {brief.description}
          </p>

          <div className="pt-4 border-t border-border flex flex-wrap gap-6 text-xs text-text-muted">
            <span>Pemilik: {brief.customer.displayName}</span>
            <span>Diposting: {formatDate(brief.createdAt)}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Target: {brief.desiredDeadlineDays || 3} hari kerja</span>
            </span>
            <span className="flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Kuota revisi diharapkan: {brief.revisionQuota}x</span>
            </span>
          </div>
        </div>

        {/* Reputasi Pelanggan Khusus untuk Desainer Lain */}
        {customerReputation && (
          <CustomerReputationCard reputation={customerReputation} />
        )}

        {/* Client Interactive Area (Daftar Penawaran & Form Kirim Penawaran) */}
        <BriefDetailClient
          brief={brief}
          currentUserId={currentUser?.id || ""}
          currentDesignerId={currentDesignerId}
          customerId={brief.customerId}
        />
      </div>
    </AppShell>
  );
}
