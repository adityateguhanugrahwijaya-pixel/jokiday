import React from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { AdminInvitesClient, AdminInviteItem } from "./AdminInvitesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Undangan Desainer - JokiDay",
};

export default async function AdminInvitesPage() {
  const invites = await prisma.designerInvite.findMany({
    orderBy: { createdAt: "desc" },
  });

  const usedUserIds = invites.map((i) => i.usedBy).filter(Boolean) as string[];
  const usedUsers = await prisma.user.findMany({
    where: { id: { in: usedUserIds } },
    select: { id: true, displayName: true, email: true },
  });
  const userMap = new Map(usedUsers.map((u) => [u.id, u]));

  const mappedInvites: AdminInviteItem[] = invites.map((inv) => {
    const isExpired = new Date() > inv.expiresAt && inv.status === "PENDING";
    const displayStatus = (isExpired ? "EXPIRED" : inv.status) as any;
    return {
      id: inv.id,
      token: inv.token,
      inviteeName: inv.inviteeName,
      note: inv.note,
      status: displayStatus,
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
      usedAt: inv.usedAt?.toISOString() || null,
      usedByUser: inv.usedBy ? userMap.get(inv.usedBy) || null : null,
    };
  });

  const session = await AuthService.getCurrentUser();
  const currentUser = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { displayName: true },
      })
    : null;

  return (
    <AppShell displayName={currentUser?.displayName || "Admin"} isAdmin={true}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">
            Undangan Desainer
          </h1>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">
            Hanya desainer yang menerima tautan undangan khusus satu kali pakai (one-time link) yang dapat membuka jasa di JokiDay.
          </p>
        </div>

        <AdminInvitesClient initialInvites={mappedInvites} />
      </div>
    </AppShell>
  );
}
