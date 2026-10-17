import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { ReviewService } from "@/server/reviews/review.service";

export const dynamic = "force-dynamic";

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
    const replyText = typeof body.reply === "string" ? body.reply : "";

    const updated = await ReviewService.replyToReview(
      params.id,
      replyText,
      session.userId
    );

    return NextResponse.json({
      success: true,
      message: "Tanggapan berhasil dikirim",
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || "Gagal mengirim tanggapan" } },
      { status: 400 }
    );
  }
}
