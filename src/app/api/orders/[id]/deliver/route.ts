import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { DriveService } from "@/server/drive/drive.service";
import { WatermarkService } from "@/server/media/watermark.service";
import { OrderStateMachine } from "@/server/orders/order.state-machine";
import { EmailService } from "@/server/email/email.service";
import { PushNotificationService } from "@/server/push/push.service";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        designer: {
          include: { driveConnection: true },
        },
        deliveries: {
          orderBy: { round: "desc" },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundError("Pesanan tidak ditemukan");
    }

    if (order.designerId !== session.userId && !session.isAdmin) {
      throw new ForbiddenError("Hanya desainer pesanan ini yang dapat mengirimkan hasil kerja");
    }

    if (order.status !== "IN_PROGRESS" && order.status !== "REVISION") {
      throw new ValidationError(
        `Hasil kerja hanya dapat dikirim saat pesanan dalam status pengerjaan atau revisi (status saat ini: ${order.status})`
      );
    }

    const formData = await req.formData();
    const rawNote = formData.get("note") as string | null;
    const cleanNote = sanitizeInput(rawNote || "").slice(0, 1000);

    const file = formData.get("file") as File | null;
    if (!cleanNote && !file) {
      throw new ValidationError("Catatan pengiriman atau file hasil kerja wajib disertakan");
    }

    const driveConn = order.designer.driveConnection;
    let uploadedFileId: string | null = null;
    let previewAssetId: string | null = null;
    let uploadedFileName = "";
    let uploadedMimeType = "application/octet-stream";
    let fileSize = 0;
    let fileHash = "";

    if (file) {
      if (!driveConn || driveConn.status !== "ACTIVE") {
        throw new ValidationError(
          "Sambungkan Google Drive di halaman Profil Anda terlebih dahulu sebelum menyerahkan file master pesanan."
        );
      }

      uploadedFileName = sanitizeInput(file.name).slice(0, 150);
      uploadedMimeType = file.type || "application/octet-stream";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fileSize = buffer.length;

      fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

      // 1. Upload file asli ke Google Drive milik desainer
      const driveUpload = await DriveService.uploadFile({
        refreshTokenEnc: driveConn.refreshTokenEnc,
        fileName: uploadedFileName,
        mimeType: uploadedMimeType,
        streamOrBuffer: buffer,
        folderId: driveConn.rootFolderId,
      });

      uploadedFileId = driveUpload.fileId;

      // 2. Jika file gambar, buat preview ber-watermark untuk pelanggan
      const isImage =
        uploadedMimeType.startsWith("image/") &&
        !uploadedMimeType.includes("svg");

      if (isImage) {
        try {
          const usernameSlug = order.designer.displayName
            .toLowerCase()
            .replace(/\s+/g, "_");

          const { buffer: wmBuffer, width, height } =
            await WatermarkService.applyWatermark(buffer, {
              username: usernameSlug,
              maxPx: 1200,
            });

          const wmFileId = crypto.randomUUID();
          const wmFileName = `wm_order_${wmFileId}.jpg`;
          const uploadsDir = path.join(
            process.cwd(),
            "public",
            "uploads",
            "previews"
          );
          await fs.mkdir(uploadsDir, { recursive: true });
          await fs.writeFile(path.join(uploadsDir, wmFileName), wmBuffer);

          const wmUrl = `/uploads/previews/${wmFileName}`;

          const previewAsset = await prisma.previewAsset.create({
            data: {
              id: wmFileId,
              driveFileId: wmUrl,
              width,
              height,
            },
          });

          previewAssetId = previewAsset.id;
        } catch (wmErr) {
          console.warn("[Watermark] Gagal membuat watermark otomatis:", wmErr);
        }
      }
    }

    const nextRound = (order.deliveries[0]?.round || 0) + 1;

    // Simpan delivery dan delivery file dalam transaksi
    const delivery = await prisma.$transaction(async (tx) => {
      const deliv = await tx.delivery.create({
        data: {
          orderId: order.id,
          round: nextRound,
          note: cleanNote,
        },
      });

      if (uploadedFileId) {
        await tx.deliveryFile.create({
          data: {
            deliveryId: deliv.id,
            driveFileId: uploadedFileId,
            fileName: uploadedFileName,
            mimeType: uploadedMimeType,
            sizeBytes: BigInt(fileSize),
            sha256: fileHash,
            previewAssetId,
          },
        });
      }

      return deliv;
    });

    // Transisi status order ke AWAITING_APPROVAL
    await OrderStateMachine.transitionOrder(
      order.id,
      "DELIVER_WORK",
      { userId: session.userId, role: session.isAdmin ? "ADMIN" : "DESIGNER" },
      { note: cleanNote }
    );

    // Kirim notifikasi email ke pelanggan secara asynchronous tanpa memblokir respons
    (async () => {
      try {
        const orderWithCustomer = await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            customer: { select: { email: true, displayName: true } },
            designer: { select: { displayName: true } },
            brief: { select: { title: true } },
          },
        });
        if (orderWithCustomer?.customer?.email) {
          await EmailService.sendDeliveryNotification({
            customerEmail: orderWithCustomer.customer.email,
            customerName: orderWithCustomer.customer.displayName,
            designerName: orderWithCustomer.designer.displayName,
            orderId: orderWithCustomer.id,
            briefTitle: orderWithCustomer.brief.title,
            round: nextRound,
          });
        }

        // Kirim In-App dan Web Push Notification (VAPID)
        await PushNotificationService.notifyUser(order.customerId, {
          type: "WORK_DELIVERED",
          title: `Hasil Desain Putaran ${nextRound} Siap Ditinjau!`,
          body: `Desainer ${orderWithCustomer?.designer?.displayName || "Desainer"} telah mengunggah hasil desain pesanan "${orderWithCustomer?.brief?.title}". Pratinjau terlindungi watermark.`,
          url: `/orders/${order.id}`,
        });
      } catch (notifErr) {
        console.error("[Notification] Gagal kirim notifikasi pengiriman ke pelanggan:", notifErr);
      }
    })();

    return NextResponse.json({
      success: true,
      deliveryId: delivery.id,
      round: nextRound,
      message: "Hasil desain berhasil diunggah ke Google Drive dan dikirimkan ke pelanggan.",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
