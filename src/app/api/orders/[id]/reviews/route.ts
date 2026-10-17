import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { ReviewService } from "@/server/reviews/review.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    const viewer = {
      userId: session?.userId || null,
      activeRole: session?.activeRole || null,
      isAdmin: Boolean(session?.isAdmin),
    };

    const data = await ReviewService.getOrderReviewsForViewer(params.id, viewer);
    if (!data) {
      return NextResponse.json(
        { error: { message: "Pesanan tidak ditemukan" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || "Gagal memuat ulasan" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: { message: "Harap masuk terlebih dahulu" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment : null;

    const caller = {
      id: session.userId,
      activeRole: session.activeRole,
      isAdmin: session.isAdmin,
    };

    const review = await ReviewService.createReview(
      {
        orderId: params.id,
        rating,
        comment,
      },
      caller
    );

    return NextResponse.json({
      success: true,
      message: "Penilaian berhasil dikirim",
      data: review,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || "Gagal mengirim penilaian" } },
      { status: 400 }
    );
  }
}
