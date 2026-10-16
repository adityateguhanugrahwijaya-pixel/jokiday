import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { ShieldCheck, Layers } from "lucide-react";
import { AuthService } from "@/server/auth/auth.service";
import { PortfolioFeedGrid, PortfolioGridPost } from "./PortfolioFeedGrid";
import { resolvePreviewUrl } from "@/lib/media";

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

  // Ambil postingan karya desain riil dari database (hanya yang PUBLISHED dan belum dihapus)
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
    include: {
      designer: {
        include: {
          user: true,
          packages: {
            where: { isActive: true },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
      previewAsset: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mappedPosts: PortfolioGridPost[] = posts.map((post) => {
    const lowestPackage = post.designer.packages?.[0];
    const startingPrice = lowestPackage ? lowestPackage.price : null;

    return {
      id: post.id,
      caption: post.caption,
      category: post.category,
      previewUrl: resolvePreviewUrl(post.previewAsset),
      createdAt: post.createdAt.toISOString(),
      startingPrice,
      designer: {
        id: post.designer.user.id,
        displayName: post.designer.user.displayName,
        username: post.designer.user.username || undefined,
        ratingAvg: post.designer.ratingAvg,
        completedCount: post.designer.completedCount,
        isVerified: post.designer.isVerified,
      },
    };
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
            <Link
              href={`/designer/${currentUser.username || currentUser.id}?action=upload`}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors touch-target shrink-0 shadow-sm"
            >
              <span>Unggah di Profil Desainer</span>
            </Link>
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

        <PortfolioFeedGrid
          initialPosts={mappedPosts}
          currentUserId={session?.userId}
          isCurrentUserAdmin={Boolean(session?.isAdmin)}
          isDesigner={currentUser?.activeRole === "DESIGNER"}
        />
      </div>
    </AppShell>
  );
}
