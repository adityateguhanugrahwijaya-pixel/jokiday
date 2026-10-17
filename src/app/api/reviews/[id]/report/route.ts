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
    const reason = typeof body.reason === "string" ? body.reason : "";

    const report = await ReviewService.reportReview(
      params.id,
      session.userId,
      reason
    );

    return NextResponse.json({
      success: true,
      message: "Laporan ulasan telah diterima dan akan ditinjau oleh moderator",
      data: report,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || "Gagal melaporkan ulasan" } },
      { status: 400 }
    );
  }
}
