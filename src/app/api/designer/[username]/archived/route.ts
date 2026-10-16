import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { PostService } from "@/server/feed/post.service";
import { handleApiError, UnauthorizedError, NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu.");
    }

    const rawParam = decodeURIComponent(params.username).trim();
    const nameWithSpaces = rawParam.replace(/_/g, " ");

    const designerUser = await prisma.user.findFirst({
      where: {
        isDesigner: true,
        OR: [
          { username: { equals: rawParam, mode: "insensitive" } },
          { id: rawParam },
          { displayName: { equals: nameWithSpaces, mode: "insensitive" } },
          { displayName: { equals: rawParam, mode: "insensitive" } },
        ],
      },
    });

    if (!designerUser) {
      throw new NotFoundError("Desainer tidak ditemukan.");
    }

    const actor = {
      userId: session.userId,
      isAdmin: session.isAdmin,
    };

    const archivedPosts = await PostService.getArchivedPosts(designerUser.id, actor);

    const mapped = archivedPosts.map((p) => ({
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

    return NextResponse.json({
      success: true,
      posts: mapped,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
