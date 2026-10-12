import React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import {
  DesignerProfileClient,
  ProfilePost,
  ProfilePackage,
  DesignerProfileData,
} from "./DesignerProfileClient";

export const dynamic = "force-dynamic";

export default async function DesignerPage({
  params,
}: {
  params: { username: string };
}) {
  const session = await AuthService.getCurrentUser();
  let currentUser = null;
  if (session) {
    currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });
  }

  const rawParam = decodeURIComponent(params.username).trim();
  const nameWithSpaces = rawParam.replace(/_/g, " ");

  // Cari desainer berdasarkan username, id, atau nama tampilan
  const designerUser = await prisma.user.findFirst({
    where: {
      isDesigner: true,
      designerProfile: { isVerified: true },
      OR: [
        { username: rawParam },
        { id: rawParam },
        { displayName: { equals: nameWithSpaces } },
        { displayName: { equals: rawParam } },
      ],
    },
    include: {
      designerProfile: {
        include: {
          posts: {
            include: { previewAsset: true },
            orderBy: { createdAt: "desc" },
          },
          packages: {
            where: { isActive: true },
            orderBy: { price: "asc" },
          },
        },
      },
    },
  });

  if (!designerUser || !designerUser.designerProfile) {
    notFound();
  }

  let categories: string[] = [];
  try {
    categories = JSON.parse(designerUser.designerProfile.categories || "[]");
  } catch {
    categories = [];
  }

  const designerData: DesignerProfileData = {
    id: designerUser.id,
    displayName: designerUser.displayName,
    username: designerUser.username || designerUser.displayName.toLowerCase().replace(/\s+/g, "_"),
    avatarUrl: designerUser.avatarUrl,
    bio: designerUser.designerProfile.bio,
    categories,
    ratingAvg: designerUser.designerProfile.ratingAvg || 5.0,
    completedCount: designerUser.designerProfile.completedCount || 0,
    isVerified: designerUser.designerProfile.isVerified,
    createdAt: designerUser.createdAt.toISOString(),
  };

  const mappedPosts: ProfilePost[] = designerUser.designerProfile.posts.map((p) => ({
    id: p.id,
    caption: p.caption,
    category: p.category,
    previewUrl: p.previewAsset.driveFileId,
    createdAt: p.createdAt.toISOString(),
  }));

  const mappedPackages: ProfilePackage[] = designerUser.designerProfile.packages.map((pkg) => {
    let deliverables: string[] = [];
    try {
      deliverables = JSON.parse(pkg.deliverables || "[]");
    } catch {
      deliverables = [];
    }

    return {
      id: pkg.id,
      title: pkg.title,
      description: pkg.description,
      category: pkg.category,
      price: pkg.price,
      durationDays: pkg.durationDays,
      revisionQuota: pkg.revisionQuota,
      deliverables,
      isActive: pkg.isActive,
      createdAt: pkg.createdAt.toISOString(),
    };
  });

  const isOwner =
    session?.userId === designerUser.id && currentUser?.activeRole === "DESIGNER";

  return (
    <AppShell
      role={currentUser?.activeRole as "CUSTOMER" | "DESIGNER" || "CUSTOMER"}
      displayName={currentUser?.displayName || "Pengguna"}
      hideSidebar={true}
    >
      <DesignerProfileClient
        designer={designerData}
        posts={mappedPosts}
        packages={mappedPackages}
        isOwner={isOwner}
        isLoggedIn={Boolean(session)}
      />
    </AppShell>
  );
}
