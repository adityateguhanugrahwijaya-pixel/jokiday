import React from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";
import { PurchasesClient, PurchasedProductItem } from "./PurchasesClient";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect("/login?redirect=/purchases");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  const rawPurchases = await prisma.productPurchase.findMany({
    where: { buyerId: session.userId },
    include: {
      product: {
        include: {
          designer: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
          previewAsset: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const purchases: PurchasedProductItem[] = rawPurchases.map((p) => {
    const prod = p.product;
    return {
      id: p.id,
      productId: prod.id,
      priceSnapshot: p.priceSnapshot,
      feeSnapshot: p.feeSnapshot,
      paymentMethod: p.paymentMethod,
      purchasedAt: p.createdAt.toISOString(),
      product: {
        id: prod.id,
        title: prod.title,
        description: prod.description,
        category: prod.category,
        sourceType: prod.sourceType as "DRIVE_FILE" | "EXTERNAL_LINK",
        fileExtension: prod.fileExtension,
        fileSizeBytes: prod.fileSizeBytes,
        status: prod.status,
        isDeleted: Boolean(prod.deletedAt),
        previewUrl: prod.previewAsset?.id
          ? `/api/previews/${prod.previewAsset.id}`
          : prod.previewAsset?.driveFileId,
        downloadUrl: `/api/products/${prod.id}/download`,
        designer: {
          id: prod.designer.user.id,
          displayName: prod.designer.user.displayName,
          username: prod.designer.user.username || "",
          avatarUrl: prod.designer.user.avatarUrl,
        },
      },
    };
  });

  return (
    <AppShell
      role={user?.activeRole as "CUSTOMER" | "DESIGNER" || "CUSTOMER"}
      displayName={user?.displayName || "Pengguna"}
    >
      <PurchasesClient initialPurchases={purchases} />
    </AppShell>
  );
}
