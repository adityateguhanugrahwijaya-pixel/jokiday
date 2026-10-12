import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { ArrowLeft } from "lucide-react";
import { BriefForm } from "./BriefForm";

export const dynamic = "force-dynamic";

export default async function NewBriefPage({
  searchParams,
}: {
  searchParams: { designerId?: string };
}) {
  const session = await AuthService.getCurrentUser();
  let currentUser = null;
  if (session) {
    currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });
  }

  let targetDesigner = null;
  if (searchParams.designerId) {
    targetDesigner = await prisma.user.findFirst({
      where: {
        id: searchParams.designerId,
        isDesigner: true,
        designerProfile: { isVerified: true },
      },
    });
  }

  const allDesigners = await prisma.user.findMany({
    where: {
      isDesigner: true,
      designerProfile: { isVerified: true },
      ...(currentUser ? { id: { not: currentUser.id } } : {}),
    },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });

  return (
    <AppShell
      role={currentUser?.activeRole as "CUSTOMER" | "DESIGNER" || "CUSTOMER"}
      displayName={currentUser?.displayName || "Pengguna"}
    >
      <div className="max-w-form mx-auto space-y-6">
        <Link
          href="/market"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
            {targetDesigner
              ? `Pesan Desain Langsung ke ${targetDesigner.displayName}`
              : "Posting Kebutuhan Desain Baru"}
          </h1>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">
            {targetDesigner
              ? "Brief ini akan dikirim khusus ke desainer pilihanmu untuk mendapatkan penawaran harga resmi."
              : "Posting brief ke pasar terbuka agar beberapa desainer dapat mengirimkan penawaran harga dan durasi."}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 sm:p-8">
          <BriefForm
            initialDesignerId={targetDesigner?.id}
            designers={allDesigners}
          />
        </div>
      </div>
    </AppShell>
  );
}
