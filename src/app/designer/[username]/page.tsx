import React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { generateUniqueUsername } from "@/lib/user";
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

  // Cari desainer berdasarkan username (case-insensitive), id, atau nama tampilan (case-insensitive)
  let designerUser = await prisma.user.findFirst({
    where: {
      isDesigner: true,
      OR: [
        { username: { equals: rawParam, mode: "insensitive" } },
        { id: rawParam },
        { displayName: { equals: nameWithSpaces, mode: "insensitive" } },
        { displayName: { equals: rawParam, mode: "insensitive" } },
      ],
    },
    include: {
      driveConnection: true,
      designerProfile: {
        include: {
          posts: {
            where: {
              status: "PUBLISHED",
              deletedAt: null,
            },
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

  if (!designerUser) {
    notFound();
  }

  // Jika akun desainer belum memiliki username slug, simpan otomatis
  if (!designerUser.username) {
    const generatedUsername = await generateUniqueUsername(
      designerUser.displayName,
      designerUser.id
    );
    await prisma.user.update({
      where: { id: designerUser.id },
      data: { username: generatedUsername },
    });
    designerUser.username = generatedUsername;
  }

  // Jika profil desainer belum ada, siapkan otomatis secara instan
  if (!designerUser.designerProfile) {
    const createdProfile = await prisma.designerProfile.create({
      data: {
        userId: designerUser.id,
        bio: "Desainer grafis profesional siap membantu kebutuhan visual Anda.",
        categories: JSON.stringify(["logo"]),
        isVerified: true,
        isAvailable: true,
        ratingAvg: 0.0,
        ratingCount: 0,
        completedCount: 0,
      },
      include: {
        posts: {
          where: {
            status: "PUBLISHED",
            deletedAt: null,
          },
          include: { previewAsset: true },
          orderBy: { createdAt: "desc" },
        },
        packages: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
      },
    });
    designerUser.designerProfile = createdProfile;
  }

  // Hitung statistik REAL 100% dari database (tanpa angka mock/dummy)
  const realCompletedCount = await prisma.order.count({
    where: {
      designerId: designerUser.id,
      status: "COMPLETED",
    },
  });

  const reviews = await prisma.review.findMany({
    where: { revieweeId: designerUser.id },
    select: { rating: true },
  });

  const realRatingCount = reviews.length;
  const realRatingAvg =
    realRatingCount > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / realRatingCount
      : 0;

  // Sinkronkan data ke designerProfile jika ada pembaruan
  if (
    designerUser.designerProfile.completedCount !== realCompletedCount ||
    designerUser.designerProfile.ratingCount !== realRatingCount ||
    designerUser.designerProfile.ratingAvg !== realRatingAvg
  ) {
    await prisma.designerProfile
      .update({
        where: { userId: designerUser.id },
        data: {
          completedCount: realCompletedCount,
          ratingCount: realRatingCount,
          ratingAvg: realRatingAvg,
        },
      })
      .catch(() => {});
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
    username: designerUser.username,
    avatarUrl: designerUser.avatarUrl,
    bio: designerUser.designerProfile.bio,
    categories,
    ratingAvg: realRatingAvg,
    ratingCount: realRatingCount,
    completedCount: realCompletedCount,
    isVerified: designerUser.designerProfile.isVerified,
    createdAt: designerUser.createdAt.toISOString(),
  };

  const isOwner =
    session?.userId === designerUser.id && currentUser?.activeRole === "DESIGNER";
  const isAdmin = Boolean(session?.isAdmin);

  const mappedPosts: ProfilePost[] = designerUser.designerProfile.posts.map((p) => ({
    id: p.id,
    caption: p.caption,
    category: p.category,
    previewUrl: p.previewAsset.id
      ? `/api/previews/${p.previewAsset.id}`
      : p.previewAsset.driveFileId,
    createdAt: p.createdAt.toISOString(),
    archivedAt: p.archivedAt?.toISOString() || null,
    status: p.status,
  }));

  let archivedPosts: ProfilePost[] = [];
  if (isOwner || isAdmin) {
    const rawArchived = await prisma.post.findMany({
      where: {
        designerId: designerUser.id,
        status: "ARCHIVED",
        deletedAt: null,
      },
      include: { previewAsset: true },
      orderBy: { createdAt: "desc" },
    });

    archivedPosts = rawArchived.map((p) => ({
      id: p.id,
      caption: p.caption,
      category: p.category,
      previewUrl: p.previewAsset?.id
        ? `/api/previews/${p.previewAsset.id}`
        : p.previewAsset?.driveFileId,
      createdAt: p.createdAt.toISOString(),
      archivedAt: p.archivedAt?.toISOString() || null,
      status: p.status,
    }));
  }

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

  // Query Produk Premade (Aset Digital)
  const rawProducts = await prisma.product.findMany({
    where: {
      designerId: designerUser.id,
      deletedAt: null,
      ...(isOwner || isAdmin ? {} : { status: "PUBLISHED" }),
    },
    include: { previewAsset: true },
    orderBy: { createdAt: "desc" },
  });

  let purchasedProductIds = new Set<string>();
  if (session?.userId) {
    const myPurchases = await prisma.productPurchase.findMany({
      where: { buyerId: session.userId },
      select: { productId: true },
    });
    purchasedProductIds = new Set(myPurchases.map((p) => p.productId));
  }

  const mappedProducts = rawProducts.map((p) => ({
    id: p.id,
    designerId: p.designerId,
    title: p.title,
    description: p.description,
    category: p.category,
    price: p.price,
    status: p.status as "PUBLISHED" | "ARCHIVED" | "HIDDEN",
    sourceType: p.sourceType as "DRIVE_FILE" | "EXTERNAL_LINK",
    fileExtension: p.fileExtension,
    fileSizeBytes: p.fileSizeBytes,
    downloadCount: p.downloadCount,
    hasAccess: isOwner || isAdmin || purchasedProductIds.has(p.id),
    isOwner,
    hasPurchased: purchasedProductIds.has(p.id),
    previewUrl: p.previewAsset?.id
      ? `/api/previews/${p.previewAsset.id}`
      : p.previewAsset?.driveFileId,
    designer: {
      id: designerUser.id,
      displayName: designerUser.displayName,
      username: designerUser.username || "",
      avatarUrl: designerUser.avatarUrl,
      isVerified: Boolean(designerUser.designerProfile?.isVerified),
    },
    createdAt: p.createdAt.toISOString(),
  }));

  const isDriveConnected = Boolean(
    designerUser.driveConnection && designerUser.driveConnection.status === "ACTIVE"
  );

  return (
    <AppShell
      role={currentUser?.activeRole as "CUSTOMER" | "DESIGNER" || "CUSTOMER"}
      displayName={currentUser?.displayName || "Pengguna"}
      hideSidebar={true}
    >
      <DesignerProfileClient
        designer={designerData}
        posts={mappedPosts}
        archivedPosts={archivedPosts}
        packages={mappedPackages}
        products={mappedProducts}
        isDriveConnected={isDriveConnected}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isLoggedIn={Boolean(session)}
      />
    </AppShell>
  );
}
