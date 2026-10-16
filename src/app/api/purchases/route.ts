import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const purchases = await prisma.productPurchase.findMany({
      where: {
        buyerId: session.userId,
      },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    const items = purchases.map((p) => {
      const prod = p.product;
      return {
        id: p.id,
        productId: prod.id,
        priceSnapshot: p.priceSnapshot,
        paymentMethod: p.paymentMethod,
        paymentRef: p.paymentRef,
        purchasedAt: p.createdAt.toISOString(),
        product: {
          id: prod.id,
          title: prod.title,
          description: prod.description,
          category: prod.category,
          sourceType: prod.sourceType,
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
            username: prod.designer.user.username,
            avatarUrl: prod.designer.user.avatarUrl,
          },
        },
      };
    });

    return NextResponse.json({
      success: true,
      purchases: items,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
