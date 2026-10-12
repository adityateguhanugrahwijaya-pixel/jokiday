import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";
import crypto from "node:crypto";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Autentikasi administrator diperlukan");
    }
    if (!session.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang dapat melihat daftar undangan desainer");
    }

    const invites = await prisma.designerInvite.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Ambil data user yang memakai invite jika ada
    const usedUserIds = invites.map((i) => i.usedBy).filter(Boolean) as string[];
    const usedUsers = await prisma.user.findMany({
      where: { id: { in: usedUserIds } },
      select: { id: true, displayName: true, email: true },
    });
    const userMap = new Map(usedUsers.map((u) => [u.id, u]));

    const mappedInvites = invites.map((inv) => {
      const isExpired = new Date() > inv.expiresAt && inv.status === "PENDING";
      const displayStatus = isExpired ? "EXPIRED" : inv.status;
      return {
        id: inv.id,
        token: inv.token,
        inviteeName: inv.inviteeName,
        note: inv.note,
        status: displayStatus,
        createdAt: inv.createdAt.toISOString(),
        expiresAt: inv.expiresAt.toISOString(),
        usedAt: inv.usedAt?.toISOString() || null,
        usedByUser: inv.usedBy ? userMap.get(inv.usedBy) || null : null,
      };
    });

    return NextResponse.json({ success: true, invites: mappedInvites });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Autentikasi administrator diperlukan");
    }
    if (!session.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang dapat membuat undangan desainer");
    }

    const body = await req.json();
    const { inviteeName, note = "", expiresInDays = 7 } = body;

    const cleanInvitee = sanitizeInput(inviteeName || "").slice(0, 100);
    const cleanNote = sanitizeInput(note || "").slice(0, 500);

    if (!cleanInvitee) {
      throw new ValidationError("Nama calon desainer wajib diisi");
    }

    // Generate token acak 32 karakter hexadecimal yang aman
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000);

    const invite = await prisma.designerInvite.create({
      data: {
        token,
        inviteeName: cleanInvitee,
        note: cleanNote,
        createdBy: session.userId,
        expiresAt,
        status: "PENDING",
      },
    });

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const inviteUrl = `${protocol}://${host}/register/invite/${token}`;

    return NextResponse.json({
      success: true,
      message: "Tautan undangan desainer berhasil dibuat",
      invite: {
        id: invite.id,
        token: invite.token,
        inviteeName: invite.inviteeName,
        inviteUrl,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
