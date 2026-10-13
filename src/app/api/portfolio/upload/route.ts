import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { WatermarkService } from "@/server/media/watermark.service";
import { handleApiError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";
import { ImageKitService } from "@/server/storage/imagekit.service";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawCaption = formData.get("caption") as string | null;
    const rawCategory = (formData.get("category") as string | null) || "logo";
    let designerId = formData.get("designerId") as string | null;

    if (!file) {
      throw new ValidationError("File gambar desain wajib diunggah");
    }

    const caption = sanitizeInput(rawCaption || "").slice(0, 1000);
    const category = sanitizeInput(rawCategory).slice(0, 50);

    if (!caption) {
      throw new ValidationError("Judul atau deskripsi karya wajib diisi");
    }

    // Wajib autentikasi: periksa sesi akun
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Kamu harus masuk ke akun desainer terlebih dahulu untuk mengunggah karya");
    }

    const designer = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { designerProfile: true },
    });

    if (!designer || !designer.isDesigner || designer.activeRole !== "DESIGNER") {
      throw new ForbiddenError("Hanya akun dalam mode Desainer yang diizinkan mengunggah karya ke portofolio");
    }

    // Pastikan designer profile ada
    if (!designer.designerProfile) {
      await prisma.designerProfile.create({
        data: {
          userId: designer.id,
          bio: "Desainer kreatif di JokiDay",
          categories: JSON.stringify([category]),
        },
      });
    }

    // Baca bytes file yang diunggah
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Terapkan Watermark Server-Side (sharp)
    const usernameSlug = designer.displayName.toLowerCase().replace(/\s+/g, "_");
    const { buffer: watermarkedBuffer, width, height } = await WatermarkService.applyWatermark(
      inputBuffer,
      {
        username: usernameSlug,
        maxPx: 1200,
      }
    );

    // 1. Simpan salinan file lokal di public/uploads/previews secara pasti
    const fileId = crypto.randomUUID();
    const fileName = `wm_${fileId}.jpg`;
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "previews");
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(path.join(uploadsDir, fileName), watermarkedBuffer);
    } catch (fsErr) {
      console.warn("[FS] Gagal simpan preview portofolio lokal:", fsErr);
    }

    // Gunakan URL internal /api/previews/${fileId} agar kebal blokir ISP / Internet Positif
    const previewUrl = `/api/previews/${fileId}`;

    // 2. Upload file preview ber-watermark ke ImageKit CDN sebagai cadangan cloud
    try {
      await ImageKitService.uploadPortfolioPost(
        designer.id,
        watermarkedBuffer,
        fileName
      );
    } catch (ikErr) {
      console.warn("[ImageKit] Gagal upload preview portofolio ke CDN:", ikErr);
    }

    // Simpan record ke database
    const post = await prisma.$transaction(async (tx) => {
      const previewAsset = await tx.previewAsset.create({
        data: {
          id: fileId,
          driveFileId: previewUrl, // URL internal preview yang terlindungi
          width,
          height,
        },
      });

      return await tx.post.create({
        data: {
          designerId: designer.id,
          caption: caption.trim(),
          category,
          driveFileId: `orig_${fileId}`,
          previewAssetId: previewAsset.id,
        },
        include: {
          designer: {
            include: { user: true },
          },
          previewAsset: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      post,
      message: "Karya desain berhasil diunggah dengan proteksi watermark JokiDay.",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
