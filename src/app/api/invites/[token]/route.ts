import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invite = await prisma.designerInvite.findUnique({
      where: { token: params.token },
    });

    if (!invite) {
      throw new NotFoundError("Tautan undangan tidak valid atau tidak ditemukan");
    }

    if (invite.status === "USED") {
      throw new ValidationError("Tautan undangan ini sudah pernah digunakan");
    }

    if (invite.status === "REVOKED") {
      throw new ValidationError("Tautan undangan ini telah dibatalkan oleh administrator");
    }

    if (new Date() > invite.expiresAt) {
      throw new ValidationError("Tautan undangan ini telah kadaluarsa");
    }

    return NextResponse.json({
      valid: true,
      invite: {
        inviteeName: invite.inviteeName,
        note: invite.note,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
