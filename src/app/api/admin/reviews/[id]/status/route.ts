import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { ReviewService } from "@/server/reviews/review.service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { error: { message: "Akses ditolak: Hanya admin yang diizinkan" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const status = body.status;
    const reason = typeof body.reason === "string" ? body.reason : undefined;

    if (status !== "VISIBLE" && status !== "HIDDEN") {
      return NextResponse.json(
        { error: { message: "Status harus bernilai VISIBLE atau HIDDEN" } },
        { status: 400 }
      );
    }

    const updated = await ReviewService.setReviewStatusByAdmin(
      params.id,
      status,
      session.userId,
      reason
    );

    return NextResponse.json({
      success: true,
      message: `Status ulasan berhasil diubah menjadi ${status}`,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || "Gagal mengubah status ulasan" } },
      { status: 400 }
    );
  }
}
