import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { ReviewService } from "@/server/reviews/review.service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; reviewId: string } }
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

    const updated = await ReviewService.updateReview(
      {
        reviewId: params.reviewId,
        rating,
        comment,
      },
      session.userId
    );

    return NextResponse.json({
      success: true,
      message: "Penilaian berhasil diperbarui",
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || "Gagal memperbarui penilaian" } },
      { status: 400 }
    );
  }
}
