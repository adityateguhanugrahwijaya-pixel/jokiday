import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { ShieldCheck, Layers } from "lucide-react";
import { AuthService } from "@/server/auth/auth.service";
import { UploadPortfolioModal } from "./UploadPortfolioModal";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const session = await AuthService.getCurrentUser();
  let currentUser = null;
  if (session) {
    currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { designerProfile: true },
    });
  }


  // Ambil postingan karya desain riil dari database
  const posts = await prisma.post.findMany({
    include: {
      designer: { include: { user: true } },
      previewAsset: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell
      role={currentUser?.activeRole as "CUSTOMER" | "DESIGNER" || "CUSTOMER"}
      displayName={currentUser?.displayName || "Pengguna"}
      hideSidebar={true}
    >
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text">
              Karya & Portofolio
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Koleksi karya orisinal desainer terverifikasi JokiDay.
            </p>
          </div>

          {currentUser?.activeRole === "DESIGNER" && currentUser?.isDesigner ? (
            <UploadPortfolioModal designerId={currentUser.id} />
          ) : currentUser?.activeRole === "CUSTOMER" ? (
            <Link
              href="/briefs/new"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors touch-target shrink-0 shadow-sm"
            >
              <span>Pesan Desain Kustom</span>
            </Link>
          ) : (
            <Link
              href="/market"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-colors touch-target shrink-0 shadow-sm"
            >
              <span>Jelajahi Pasar Brief</span>
            </Link>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary-soft text-primary mx-auto flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text">Belum ada karya diunggah</h3>
              <p className="text-sm text-text-muted mt-1">
                {currentUser?.activeRole === "DESIGNER"
                  ? "Gunakan tombol di atas untuk mengunggah karya pertamamu."
                  : "Karya desain terverifikasi akan segera tampil di sini."}
              </p>
            </div>
          </div>
        ) : (
          /* Grid Feed Karya Responsif: 2 kolom (xs), 3 kolom (sm), 4 kolom (md), 5 kolom (lg+) */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {posts.map((post) => {
              const designerUser = post.designer.user;
              const previewUrl = post.previewAsset.driveFileId;

              return (
                <div
                  key={post.id}
                  className="bg-surface border border-border rounded-md overflow-hidden flex flex-col group hover:border-primary/50 transition-colors"
                >
                  {/* Gambar Karya */}
                  <div className="relative aspect-square bg-background flex items-center justify-center select-none overflow-hidden group">
                    <img
                      src={previewUrl}
                      alt={post.caption}
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  </div>

                  <div className="p-3 space-y-1">
                    <span className="text-[10px] font-semibold text-text-muted uppercase">
                      {post.category}
                    </span>
                    <h3 className="font-bold text-xs sm:text-sm text-text line-clamp-1">
                      {post.caption}
                    </h3>
                    <div className="pt-2 flex items-center justify-between border-t border-border mt-2">
                      <span className="text-[11px] text-text-muted truncate">
                        {designerUser.displayName}
                      </span>
                      <Link
                        href={`/briefs/new?designerId=${designerUser.id}&sourcePostId=${post.id}`}
                        className="text-xs font-bold text-secondary-text hover:underline shrink-0"
                      >
                        Pesan Desain &rarr;
                      </Link>
                    </div>
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
