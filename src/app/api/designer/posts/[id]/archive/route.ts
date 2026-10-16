import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { PostService } from "@/server/feed/post.service";
import { handleApiError, UnauthorizedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu.");
    }

    let action = "archive";
    try {
      const body = await req.json();
      if (body?.action === "restore") {
        action = "restore";
      }
    } catch {
      // Body kosong, default action = archive
    }

    const actor = {
      userId: session.userId,
      isAdmin: session.isAdmin,
    };

    if (action === "restore") {
      const result = await PostService.restorePost(params.id, actor);
      return NextResponse.json(result);
    }

    const result = await PostService.archivePost(params.id, actor);
    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return POST(req, { params });
}
