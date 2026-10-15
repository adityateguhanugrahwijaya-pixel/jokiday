import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";
import { handleApiError, UnauthorizedError, ValidationError, ConflictError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";

export const dynamic = "force-dynamic";

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "auth",
  "login",
  "register",
  "chat",
  "orders",
  "profile",
  "market",
  "briefs",
  "terms",
  "privacy",
  "dashboard",
  "designer",
  "user",
  "help",
  "support",
  "jokiday",
  "agentkikir",
]);

export async function PATCH(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Sesi Anda telah berakhir. Silakan login kembali.");
    }

    const body = await req.json();
    const rawDisplayName = body.displayName !== undefined ? String(body.displayName) : undefined;
    const rawUsername = body.username !== undefined ? String(body.username) : undefined;

    const updateData: { displayName?: string; username?: string } = {};

    if (rawDisplayName !== undefined) {
      const cleanName = sanitizeInput(rawDisplayName).trim().slice(0, 50);
      if (cleanName.length < 2) {
        throw new ValidationError("Nama profil minimal terdiri dari 2 karakter.");
      }
      updateData.displayName = cleanName;
    }

    if (rawUsername !== undefined) {
      const cleanUsername = rawUsername
        .toLowerCase()
        .trim()
        .replace(/^@+/, ""); // Hapus tanda @ jika pengguna mengetik @username

      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        throw new ValidationError(
          "Username hanya boleh terdiri dari huruf kecil (a-z), angka (0-9), dan garis bawah (_), antara 3 hingga 30 karakter."
        );
      }

      if (RESERVED_USERNAMES.has(cleanUsername)) {
        throw new ValidationError("Username ini dicadangkan oleh sistem dan tidak dapat digunakan.");
      }

      // Periksa keunikan username di database (case-insensitive)
      const existingUser = await prisma.user.findFirst({
        where: {
          username: { equals: cleanUsername, mode: "insensitive" },
          NOT: { id: session.userId },
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new ConflictError(`Username @${cleanUsername} sudah digunakan oleh akun lain.`);
      }

      updateData.username = cleanUsername;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("Tidak ada data profil yang diperbarui.");
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profil dan username berhasil disimpan.",
      user: updatedUser,
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(req: NextRequest) {
  return PATCH(req);
}
