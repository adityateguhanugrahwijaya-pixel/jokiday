import { NextRequest, NextResponse } from "next/server";
import { OfferService } from "@/server/offers/offer.service";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk membuat brief");
    }

    if (session.activeRole === "DESIGNER") {
      throw new ValidationError("Untuk membuat brief, silakan ubah mode akun Anda ke Mode Pelanggan terlebih dahulu");
    }

    const body = await req.json();

    if (body.mode === "DIRECT") {
      if (!body.targetDesignerId) {
        throw new ValidationError("Pilih desainer tujuan untuk pesanan langsung");
      }

      if (body.targetDesignerId === session.userId) {
        throw new ValidationError("Kamu tidak dapat membuat pesanan langsung ke akunmu sendiri");
      }

      const targetDesigner = await prisma.user.findFirst({
        where: {
          id: body.targetDesignerId,
          isDesigner: true,
          designerProfile: { isVerified: true },
        },
      });

      if (!targetDesigner) {
        throw new ValidationError("Desainer yang dipilih tidak valid atau belum terverifikasi");
      }
    }

    const brief = await OfferService.createBrief({
      ...body,
      customerId: session.userId,
    });

    if (body.mode === "DIRECT" && body.targetDesignerId) {
      try {
        const customer = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { displayName: true },
        });
        const customerName = customer?.displayName || "Pelanggan";

        const { PushNotificationService } = await import("@/server/push/push.service");
        await PushNotificationService.notifyUser(body.targetDesignerId, {
          type: "DIRECT_BRIEF_RECEIVED",
          title: "Pesanan Brief Langsung Baru!",
          body: `${customerName} mengirimkan brief langsung khusus untuk Anda: "${brief.title}". Silakan kirim penawaran harga Anda.`,
          url: `/briefs/${brief.id}`,
          payload: { briefId: brief.id },
        });
      } catch (notifErr) {
        console.error("Gagal mengirim notifikasi brief langsung:", notifErr);
      }
    }

    return NextResponse.json({ success: true, brief });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
