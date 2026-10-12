import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Autentikasi administrator diperlukan");
    }
    if (!session.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang dapat mencabut undangan");
    }

    const invite = await prisma.designerInvite.findUnique({
      where: { id: params.id },
    });

    if (!invite) {
      throw new NotFoundError("Data undangan tidak ditemukan");
    }

    if (invite.status === "USED") {
      throw new ValidationError("Undangan yang sudah digunakan tidak dapat dicabut");
    }

    await prisma.designerInvite.update({
      where: { id: params.id },
      data: { status: "REVOKED" },
    });

    return NextResponse.json({
      success: true,
      message: "Undangan desainer berhasil dicabut",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
