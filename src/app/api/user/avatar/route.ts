import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";
import { ImageKitService } from "@/server/storage/imagekit.service";
import { handleApiError, UnauthorizedError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Sesi Anda telah berakhir. Silakan login kembali.");
    }

    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      throw new ValidationError("File foto profil belum dipilih.");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      throw new ValidationError("Format file tidak didukung. Harap unggah file JPG, PNG, atau WebP.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError("Ukuran file terlalu besar. Maksimal ukuran foto adalah 5 MB.");
    }

    // Konversi arrayBuffer ke Buffer Node.js
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload & optimasi ke ImageKit CDN
    const uploadResult = await ImageKitService.uploadAvatar(
      session.userId,
      buffer,
      file.name
    );

    // Simpan URL CDN resmi ke database pengguna Neon
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: uploadResult.url },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Foto profil berhasil diperbarui.",
      avatarUrl: updatedUser.avatarUrl,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
