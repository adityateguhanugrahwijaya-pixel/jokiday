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

  // Ambil postingan karya desain riil dari database
  const posts = await prisma.post.findMany({
    include: {
      designer: { include: { user: true } },
      previewAsset: true,
    },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  // Ambil profil desainer terverifikasi di JokiDay
  const designers = await prisma.user.findMany({
    where: {
      isDesigner: true,
      designerProfile: { isVerified: true },
    },
    include: { designerProfile: true },
    take: 6,
  });

  const defaultCategoryPrices: Record<string, number> = {
    logo: 150000,
    kemasan: 200000,
    poster: 100000,
    branding: 250000,
    media: 75000,
    ilustrasi: 125000,
  };

  const mappedPosts: DiscoverPost[] = posts.map((p) => {
    const cat = p.category.toLowerCase();
    const price = defaultCategoryPrices[cat] || 100000;
    return {
      id: p.id,
      caption: p.caption,
      category: p.category,
      previewUrl: p.previewAsset.driveFileId,
      createdAt: p.createdAt.toISOString(),
      startingPrice: price,
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
      ratingAvg: d.designerProfile?.ratingAvg || 5.0,
      completedCount: d.designerProfile?.completedCount || 0,
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
      <DiscoverExperience initialPosts={mappedPosts} topDesigners={mappedDesigners} />
    </AppShell>
  );
}
