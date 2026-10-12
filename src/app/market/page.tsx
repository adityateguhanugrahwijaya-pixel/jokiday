import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { formatRupiah, formatDate } from "@/lib/format";
import { PlusCircle, Clock, FileText, ChevronRight } from "lucide-react";

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect("/login?redirect=/market");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  const briefs = await prisma.brief.findMany({
    where: { mode: "MARKET" },
    include: {
      customer: true,
      offers: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell
      role={currentUser?.activeRole as "CUSTOMER" | "DESIGNER" || "CUSTOMER"}
      displayName={currentUser?.displayName || "Pengguna"}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text">
              Pasar Brief Desain
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Daftar kebutuhan desain terbuka. Desainer dapat mengirim penawaran harga dan durasi pengerjaan.
            </p>
          </div>

          <Link
            href="/briefs/new"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-secondary text-on-secondary font-bold text-sm hover:bg-secondary-hover transition-colors shrink-0 touch-target"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Posting Brief Baru</span>
          </Link>
        </div>

        {/* Daftar Brief */}
        {briefs.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text">Belum ada brief di pasar</h3>
              <p className="text-sm text-text-muted mt-1">
                Jadilah yang pertama membuat permintaan desain terbuka agar para desainer dapat mengirim penawaran.
              </p>
            </div>
            <Link
              href="/briefs/new"
              className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-secondary text-on-secondary font-bold text-sm hover:bg-secondary-hover transition-colors"
            >
              Buat Brief Sekarang
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {briefs.map((b) => (
              <div
                key={b.id}
                className="bg-surface border border-border rounded-lg p-6 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-soft text-text-muted capitalize">
                      {b.category}
                    </span>
                    <Badge variant={b.status === "OPEN" ? "info" : "neutral"}>
                      {b.status === "OPEN" ? "Terbuka" : b.status}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-lg text-text line-clamp-1">
                    {b.title}
                  </h3>

                  <p className="text-sm text-text-muted line-clamp-2 leading-relaxed">
                    {b.description}
                  </p>

                  <div className="pt-2 text-xs text-text-muted flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{b.desiredDeadlineDays ? `${b.desiredDeadlineDays} hari` : "Fleksibel"}</span>
                    </span>
                    <span>{b.offers.length} penawaran masuk</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    Oleh {b.customer.displayName}
                  </span>
                  <Link
                    href={`/briefs/${b.id}`}
                    className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                  >
                    <span>Lihat Detail</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
