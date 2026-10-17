import React from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";
import { AdminReviewsClient } from "./AdminReviewsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderasi Ulasan - JokiDay",
};

export default async function AdminReviewsPage() {
  const session = await AuthService.getCurrentUser();
  const currentUser = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { displayName: true },
      })
    : null;

  return (
    <AppShell displayName={currentUser?.displayName || "Admin"} isAdmin={true}>
      <AdminReviewsClient />
    </AppShell>
  );
}
