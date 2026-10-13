import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { DriveService } from "@/server/drive/drive.service";
import { decryptToken } from "@/lib/crypto";
import {
  handleApiError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";
import { PushNotificationService } from "@/server/push/push.service";

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
      throw new ForbiddenError("Hanya administrator yang dapat menyetujui penarikan saldo");
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });

    if (!withdrawal) throw new NotFoundError("Permintaan penarikan tidak ditemukan");
    if (withdrawal.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        message: "Penarikan sudah disetujui sebelumnya.",
      });
    }
    if (withdrawal.status !== "REQUESTED") {
      throw new ConflictError(`Penarikan tidak dapat disetujui karena berstatus ${withdrawal.status}`);
    }

    // Periksa koneksi Google Drive milik admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { driveConnection: true },
    });

    if (!adminUser?.driveConnection || adminUser.driveConnection.status !== "ACTIVE") {
      throw new ValidationError(
        "Google Drive admin belum tersambung. Harap hubungkan Google Drive admin terlebih dahulu untuk menyimpan bukti transfer pembayaran."
      );
    }

    // Ambil data bukti pembayaran dari form data
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      throw new ValidationError("Data formulir tidak valid");
    }

    const proofFile = (formData.get("proof") || formData.get("file")) as File | null;
    const rawRef = formData.get("refNumber") || formData.get("reference") || "";
    const cleanRef = sanitizeInput(String(rawRef)).slice(0, 100);

    if (!proofFile || !(proofFile instanceof File) || proofFile.size === 0) {
      throw new ValidationError("File bukti pembayaran transfer wajib diunggah.");
    }

    // Validasi ukuran file (maksimal 10MB)
    if (proofFile.size > 10 * 1024 * 1024) {
      throw new ValidationError("Ukuran file bukti pembayaran maksimal 10MB");
    }

    // Validasi tipe file
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(proofFile.type)) {
      throw new ValidationError("Format file bukti harus berupa gambar (JPG, PNG, WEBP) atau PDF");
    }

    // 1. Siapkan folder bukti penarikan di Google Drive admin
    const refreshToken = decryptToken(adminUser.driveConnection.refreshTokenEnc);
    const accessToken = await DriveService.getAccessToken(refreshToken);
    const rootFolderId = await DriveService.ensureFolder(accessToken, "JokiDay");
    const proofsFolderId = await DriveService.ensureFolder(accessToken, "bukti-penarikan", rootFolderId);

    // 2. Upload file ke Google Drive admin
    const arrayBuffer = await proofFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = proofFile.name.includes(".") ? proofFile.name.split(".").pop() : "jpg";
    const safeFileName = `bukti-transfer-${withdrawal.id.slice(0, 8)}-${Date.now()}.${fileExt}`;

    const uploadResult = await DriveService.uploadFile({
      refreshTokenEnc: adminUser.driveConnection.refreshTokenEnc,
      folderId: proofsFolderId,
      fileName: safeFileName,
      mimeType: proofFile.type,
      streamOrBuffer: buffer,
    });

    // Berikan izin view agar link bukti dapat dibuka
    if (uploadResult.fileId) {
      await DriveService.makeFilePublic(accessToken, uploadResult.fileId);
    }

    const proofUrl = uploadResult.webViewLink || `/api/withdrawals/${withdrawal.id}/proof`;
    const idempotencyKey = `admin-approve-withdrawal-${withdrawal.id}`;

    await prisma.$transaction(async (tx) => {
      // 3. Catat kas keluar di ledger: Debit WITHDRAWAL_PENDING -> Kredit GATEWAY_CLEARING
      await LedgerService.recordWithdrawalSuccess(
        withdrawal.userId,
        withdrawal.amount,
        idempotencyKey,
        tx as any
      );

      // 4. Update status withdrawal dan simpan info bukti transfer
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "SUCCESS",
          gatewayRef: cleanRef || null,
          proofUrl,
          proofDriveId: uploadResult.fileId,
          reviewedBy: "ADMIN_MANUAL",
          reviewedAt: new Date(),
        },
      });
    });

    // 5. Kirim notifikasi konfirmasi ke desainer
    try {
      await PushNotificationService.notifyUser(withdrawal.userId, {
        type: "ORDER_STATUS_CHANGED",
        title: "Penarikan Saldo Berhasil",
        body: `Dana penarikan sebesar Rp ${withdrawal.amount.toLocaleString("id-ID")} telah berhasil ditransfer. Bukti pembayaran telah diunggah.`,
        url: "/wallet",
        payload: {
          withdrawalId: withdrawal.id,
          proofUrl,
        },
      });
    } catch (notifErr) {
      console.warn("[Withdrawal] Warning sending notification to user:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "Penarikan berhasil disetujui, bukti transfer tersimpan di Google Drive admin.",
      proofUrl,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
