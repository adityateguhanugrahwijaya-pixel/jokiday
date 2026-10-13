import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { formatRupiah, formatDate } from "@/lib/format";
import { PlusCircle, Clock, FileText, ChevronRight, Sparkles } from "lucide-react";
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

  // Ambil brief mode MARKET (pasar terbuka) DAN brief mode DIRECT yang ditujukan ke desainer ini atau dibuat oleh customer ini
  const whereCondition: any = {
    OR: [
      { mode: "MARKET" },
      ...(currentUser
        ? [
            { mode: "DIRECT", targetDesignerId: currentUser.id },
            { mode: "DIRECT", customerId: currentUser.id },
          ]
        : []),
    ],
  };

  const briefs = await prisma.brief.findMany({
    where: whereCondition,
    include: {
      customer: true,
      offers: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Ambil info nama desainer yang dituju untuk brief DIRECT
  const targetDesignerIds = Array.from(
    new Set(
      briefs
        .map((b) => b.targetDesignerId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const targetDesigners = targetDesignerIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: targetDesignerIds } },
        select: { id: true, displayName: true, username: true },
      })
    : [];

  const targetDesignerMap = new Map(targetDesigners.map((d) => [d.id, d]));

  // Prioritaskan brief direct khusus desainer ini di urutan paling atas
  const sortedBriefs = [...briefs].sort((a, b) => {
    const aIsMyDirect = a.mode === "DIRECT" && a.targetDesignerId === currentUser?.id;
    const bIsMyDirect = b.mode === "DIRECT" && b.targetDesignerId === currentUser?.id;
    if (aIsMyDirect && !bIsMyDirect) return -1;
    if (!aIsMyDirect && bIsMyDirect) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const myDirectBriefsCount = sortedBriefs.filter(
    (b) => b.mode === "DIRECT" && b.targetDesignerId === currentUser?.id && b.status === "OPEN"
  ).length;

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
              Daftar kebutuhan desain terbuka dan pesanan langsung. Desainer dapat mengirim penawaran harga dan durasi pengerjaan.
            </p>
          </div>

          {currentUser?.activeRole !== "DESIGNER" && (
            <Link
              href="/briefs/new"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-secondary text-on-secondary font-bold text-sm hover:bg-secondary-hover transition-colors shrink-0 touch-target"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Posting Brief Baru</span>
            </Link>
          )}
        </div>

        {/* Banner Pesanan Langsung jika desainer menerima brief khusus */}
        {myDirectBriefsCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text">
                  Anda Memiliki {myDirectBriefsCount} Pesanan Brief Langsung!
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Pelanggan menunjuk akun Anda secara langsung untuk memberikan penawaran harga resmi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Daftar Brief */}
        {sortedBriefs.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text">Belum ada brief di pasar</h3>
              <p className="text-sm text-text-muted mt-1">
                {currentUser?.activeRole === "DESIGNER"
                  ? "Saat ini belum ada brief terbuka dari pelanggan. Silakan periksa kembali nanti untuk menemukan peluang proyek baru."
                  : "Jadilah yang pertama membuat permintaan desain terbuka agar para desainer dapat mengirim penawaran."}
              </p>
            </div>
            {currentUser?.activeRole !== "DESIGNER" && (
              <Link
                href="/briefs/new"
                className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-secondary text-on-secondary font-bold text-sm hover:bg-secondary-hover transition-colors"
              >
                Buat Brief Sekarang
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedBriefs.map((b) => {
              const isMyDirect = b.mode === "DIRECT" && b.targetDesignerId === currentUser?.id;
              const isMyCustomerBrief = b.customerId === currentUser?.id;
              const targetDesigner = b.targetDesignerId ? targetDesignerMap.get(b.targetDesignerId) : null;

              return (
                <div
                  key={b.id}
                  className={`bg-surface border rounded-xl p-6 flex flex-col justify-between transition-all ${
                    isMyDirect
                      ? "border-secondary/60 bg-secondary/5 ring-1 ring-secondary/20 shadow-sm"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-soft text-text-muted capitalize">
                          {b.category}
                        </span>

                        {isMyDirect && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary text-on-secondary shadow-2xs flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Pesanan Langsung</span>
                          </span>
                        )}

                        {!isMyDirect && b.mode === "DIRECT" && isMyCustomerBrief && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-soft text-primary">
                            Direct ke {targetDesigner?.displayName || "Desainer"}
                          </span>
                        )}
                      </div>

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

                    <div className="pt-2 text-xs text-text-muted flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{b.desiredDeadlineDays ? `${b.desiredDeadlineDays} hari` : "Fleksibel"}</span>
                      </span>
                      <span>{b.offers.length} penawaran masuk</span>
                    </div>

                    {b.budgetHint && (
                      <div className="text-xs text-text-muted">
                        Estimasi Anggaran: <span className="font-bold text-primary font-mono">{formatRupiah(b.budgetHint)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-text-muted truncate max-w-[140px]">
                      Oleh {b.customer.displayName}
                    </span>

                    {isMyDirect ? (
                      <Link
                        href={`/briefs/${b.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-secondary-hover transition-colors shadow-2xs"
                      >
                        <span>Kirim Penawaran</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href={`/briefs/${b.id}`}
                        className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                      >
                        <span>Lihat Detail</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
