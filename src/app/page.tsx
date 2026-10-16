import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { DiscoverExperience, DiscoverPost, DiscoverDesigner } from "./DiscoverExperience";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await AuthService.getCurrentUser();
  let currentUser = null;
  if (session) {
    currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
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
    take: 24,
  });

  // Ambil profil desainer terverifikasi di JokiDay
  const designers = await prisma.user.findMany({
    where: {
      isDesigner: true,
      OR: [
        { designerProfile: { isVerified: true } },
        { designerProfile: null },
      ],
    },
    include: { designerProfile: true },
    take: 6,
  });

  const mappedPosts: DiscoverPost[] = posts.map((p) => {
    const lowestPackage = p.designer.packages?.[0];
    const startingPrice = lowestPackage ? lowestPackage.price : null;

    return {
      id: p.id,
      caption: p.caption,
      category: p.category,
      previewUrl: p.previewAsset.id
        ? `/api/previews/${p.previewAsset.id}`
        : p.previewAsset.driveFileId,
      createdAt: p.createdAt.toISOString(),
      startingPrice,
      designer: {
        id: p.designer.user.id,
        displayName: p.designer.user.displayName,
        username: p.designer.user.username || p.designer.user.displayName.toLowerCase().replace(/\s+/g, "_"),
        ratingAvg: p.designer.ratingAvg,
        completedCount: p.designer.completedCount,
        bio: p.designer.bio,
        isVerified: p.designer.isVerified,
      },
    };
  });

  const mappedDesigners: DiscoverDesigner[] = designers.map((d) => {
    let cats: string[] = [];
    try {
      if (d.designerProfile?.categories) {
        cats = JSON.parse(d.designerProfile.categories);
      }
    } catch {
      cats = [];
    }
    return {
      id: d.id,
      displayName: d.displayName,
      username: d.username || d.displayName.toLowerCase().replace(/\s+/g, "_"),
      ratingAvg: d.designerProfile?.ratingAvg ?? 0,
      completedCount: d.designerProfile?.completedCount ?? 0,
      bio: d.designerProfile?.bio || "Desainer grafis profesional siap membantu kebutuhan visual usahamu.",
      isVerified: d.designerProfile?.isVerified || false,
      categories: cats,
    };
  });

  return (
    <AppShell
      role={currentUser?.activeRole as "CUSTOMER" | "DESIGNER" || "CUSTOMER"}
      displayName={currentUser?.displayName || "Pengguna"}
      hideSidebar={true}
    >
      <DiscoverExperience
        initialPosts={mappedPosts}
        topDesigners={mappedDesigners}
        currentUserId={currentUser?.id}
        isCurrentUserAdmin={Boolean(session?.isAdmin)}
      />
    </AppShell>
  );
}
