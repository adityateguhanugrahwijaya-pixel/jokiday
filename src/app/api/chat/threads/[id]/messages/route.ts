import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";

import { OfferService } from "@/server/offers/offer.service";
import { PushNotificationService } from "@/server/push/push.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const thread = await prisma.chatThread.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            price: true,
            durationDays: true,
            revisionQuota: true,
            deadlineAt: true,
          },
        },
      },
    });

    if (!thread) {
      throw new NotFoundError("Percakapan tidak ditemukan");
    }

    // Validasi peran aktif: pengguna tidak boleh mengakses chat dari peran yang tidak aktif
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { activeRole: true },
    });
    const activeRole = user?.activeRole || session.activeRole || "CUSTOMER";
    if (activeRole === "CUSTOMER" && thread.customerId !== session.userId && !session.isAdmin) {
      throw new ForbiddenError("Kamu sedang berada dalam Mode Pelanggan dan tidak dapat mengakses obrolan desainer ini");
    }
    if (activeRole === "DESIGNER" && thread.designerId !== session.userId && !session.isAdmin) {
      throw new ForbiddenError("Kamu sedang berada dalam Mode Desainer dan tidak dapat mengakses obrolan pelanggan ini");
    }

    // Tandai pesan dari lawan bicara sebagai telah dibaca (Centang Dua)
    await prisma.message.updateMany({
      where: {
        threadId: params.id,
        senderId: { not: session.userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    const messages = await prisma.message.findMany({
      where: { threadId: params.id },
      orderBy: { createdAt: "asc" },
    });

    // Ambil daftar penawaran aktif (PENDING) antara desainer dan pelanggan pada thread ini
    const pendingOffers = await prisma.offer.findMany({
      where: {
        designerId: thread.designerId,
        status: "PENDING",
        brief: {
          customerId: thread.customerId,
          status: "OPEN",
        },
      },
      include: {
        brief: {
          select: { id: true, title: true, description: true, category: true },
        },
        designer: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Cek status brief terkait obrolan ini untuk mendeteksi apakah kesepakatan sudah dikunci
    const latestBrief = await prisma.brief.findFirst({
      where: {
        customerId: thread.customerId,
        offers: {
          some: { designerId: thread.designerId },
        },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true },
    });

    const isBriefLocked = Boolean(thread.orderId || (latestBrief && latestBrief.status !== "OPEN"));

    return NextResponse.json({
      success: true,
      order: thread.order || null,
      isBriefLocked,
      briefStatus: latestBrief?.status || null,
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        isMe: m.senderId === session.userId,
        type: m.type,
        body: m.body,
        readAt: m.readAt ? m.readAt.toISOString() : null,
        isRead: Boolean(m.readAt),
        createdAt: m.createdAt.toISOString(),
      })),
      pendingOffers: pendingOffers.map((o) => ({
        id: o.id,
        briefId: o.briefId,
        briefTitle: o.brief.title,
        price: o.price,
        durationDays: o.durationDays,
        revisionQuota: o.revisionQuota,
        note: o.note,
        designerId: o.designerId,
        designerName: o.designer.displayName,
      })),
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const thread = await prisma.chatThread.findUnique({
      where: { id: params.id },
    });

    if (!thread) {
      throw new NotFoundError("Percakapan tidak ditemukan");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { activeRole: true },
    });
    const activeRole = user?.activeRole || session.activeRole || "CUSTOMER";
    if (activeRole === "CUSTOMER" && thread.customerId !== session.userId && !session.isAdmin) {
      throw new ForbiddenError("Kamu sedang dalam Mode Pelanggan dan tidak dapat mengirim pesan sebagai desainer");
    }
    if (activeRole === "DESIGNER" && thread.designerId !== session.userId && !session.isAdmin) {
      throw new ForbiddenError("Kamu sedang dalam Mode Desainer dan tidak dapat mengirim pesan sebagai pelanggan");
    }

    const body = await req.json();
    const messageType = body.type || "TEXT";

    // 1. Penanganan pesan tipe OFFER_CONFIRMATION (Pop up konfirmasi kesepakatan oleh Desainer)
    if (messageType === "OFFER_CONFIRMATION") {
      if (thread.designerId !== session.userId && !session.isAdmin) {
        throw new ForbiddenError("Hanya desainer yang dapat mengajukan konfirmasi tawaran");
      }

      // Cegah penawaran baru jika thread obrolan ini sudah memiliki pesanan resmi yang terkunci
      if (thread.orderId) {
        throw new ConflictError("Percakapan ini sudah memiliki pesanan resmi yang terkunci. Tidak dapat mengirim tawaran baru.");
      }

      const offerData = body.offerData || {};
      const { offerId, briefId, title, price, durationDays, revisionQuota, notes } = offerData;

      const numPrice = Number(price);
      const numDuration = Number(durationDays);
      const numRevisions = Number(revisionQuota ?? 2);

      if (!numPrice || numPrice <= 0 || !Number.isInteger(numPrice)) {
        throw new ValidationError("Harga kesepakatan harus bilangan bulat positif dalam rupiah");
      }
      if (!numDuration || numDuration <= 0) {
        throw new ValidationError("Estimasi durasi pengerjaan minimal 1 hari");
      }

      let activeOfferId = offerId;
      let finalOfferDetails: any = null;

      let targetBriefId = briefId;
      let briefTitle = title;
      let designerDisplayName = "Desainer";

      const designerUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { displayName: true },
      });
      if (designerUser?.displayName) {
        designerDisplayName = designerUser.displayName;
      }

      if (offerId) {
        const existingOffer = await prisma.offer.findUnique({
          where: { id: offerId },
          include: { brief: true, designer: true },
        });
        if (existingOffer) {
          targetBriefId = existingOffer.briefId;
          briefTitle = existingOffer.brief.title;
          designerDisplayName = existingOffer.designer.displayName;
        }
      }

      // Validasi status brief jika targetBriefId diketahui
      if (targetBriefId) {
        const brief = await prisma.brief.findUnique({
          where: { id: targetBriefId },
        });
        if (brief && brief.status !== "OPEN") {
          throw new ConflictError("Brief proyek ini telah dikonfirmasi dan ditutup untuk penawaran baru.");
        }
      }

      // Jika belum ada targetBriefId, cari brief OPEN antara pelanggan dan desainer pada thread ini
      if (!targetBriefId) {
        const existingBrief = await prisma.brief.findFirst({
          where: {
            customerId: thread.customerId,
            status: "OPEN",
          },
          orderBy: { createdAt: "desc" },
        });
        if (existingBrief) {
          targetBriefId = existingBrief.id;
          briefTitle = existingBrief.title;
        } else {
          // Jika ada brief yang sudah CLAIMED pada pelanggan ini, tolak pembuatan tawaran baru
          const claimedBrief = await prisma.brief.findFirst({
            where: {
              customerId: thread.customerId,
              status: "CLAIMED",
            },
            orderBy: { createdAt: "desc" },
          });
          if (claimedBrief) {
            throw new ConflictError("Proyek ini telah dikonfirmasi dan ditutup untuk penawaran baru.");
          }
        }
      }

      // Jika tetap belum ada brief, buat brief DIRECT otomatis untuk menampung penawaran desainer
      if (!targetBriefId) {
        const createdBrief = await OfferService.createBrief({
          customerId: thread.customerId,
          mode: "DIRECT",
          targetDesignerId: session.userId,
          title: title || `Proyek Desain ${designerDisplayName}`,
          description: notes || "Kesepakatan kustom langsung dari ruang obrolan.",
          category: "Lainnya",
          desiredDeadlineDays: numDuration,
        });
        targetBriefId = createdBrief.id;
        briefTitle = createdBrief.title;
      }

      // Buat penawaran baru (v1, v2, v3, dst.) agar proses tawar-menawar di chat tetap fleksibel
      const newOffer = await OfferService.createOffer({
        briefId: targetBriefId,
        designerId: session.userId,
        price: numPrice,
        durationDays: numDuration,
        revisionQuota: numRevisions,
        deliverables: [notes || "Hasil desain final sesuai kesepakatan obrolan"],
        note: notes || "Penawaran baru hasil diskusi di ruang obrolan",
      });

      activeOfferId = newOffer.id;
      finalOfferDetails = {
        offerId: newOffer.id,
        briefId: newOffer.briefId,
        title: briefTitle || "Kesepakatan Desain",
        price: newOffer.price,
        durationDays: newOffer.durationDays,
        revisionQuota: newOffer.revisionQuota,
        note: newOffer.note,
        designerName: designerDisplayName,
      };

      const confirmationPayload = JSON.stringify(finalOfferDetails);

      const message = await prisma.message.create({
        data: {
          threadId: thread.id,
          senderId: session.userId,
          body: confirmationPayload,
          type: "OFFER_CONFIRMATION",
          readAt: null,
        },
      });

      const summaryText = `[Konfirmasi Penawaran: Rp ${finalOfferDetails.price.toLocaleString("id-ID")}]`;
      await prisma.chatThread.update({
        where: { id: thread.id },
        data: {
          lastMessage: summaryText,
          lastMessageAt: new Date(),
        },
      });

      // Kirim notifikasi tawaran ke penerima via In-App dan Web Push (VAPID)
      const offerRecipientId = thread.customerId === session.userId ? thread.designerId : thread.customerId;
      await PushNotificationService.notifyUser(offerRecipientId, {
        type: "CHAT_OFFER",
        title: `Tawaran baru dari ${designerDisplayName}`,
        body: `Pengajuan tawaran proyek: ${finalOfferDetails.title} (Rp ${finalOfferDetails.price.toLocaleString("id-ID")})`,
        url: `/chat?chatid=${thread.id}`,
        payload: {
          threadId: thread.id,
        },
      }).catch((notifErr) => {
        console.warn("[Chat] Gagal mengirim notifikasi tawaran via web push:", notifErr);
      });

      return NextResponse.json({
        success: true,
        message: {
          id: message.id,
          senderId: message.senderId,
          isMe: true,
          type: message.type,
          body: message.body,
          readAt: null,
          isRead: false,
          createdAt: message.createdAt.toISOString(),
        },
      });
    }

    // 2. Penanganan pesan teks reguler (TEXT)
    const cleanText = sanitizeInput(body.text || body.body || "");

    if (!cleanText) {
      throw new ValidationError("Pesan tidak boleh kosong atau berisi skrip yang tidak diizinkan");
    }
    if (cleanText.length > 5000) {
      throw new ValidationError("Pesan maksimal 5.000 karakter");
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId: session.userId,
        body: cleanText,
        type: "TEXT",
        readAt: null,
      },
    });

    await prisma.chatThread.update({
      where: { id: thread.id },
      data: {
        lastMessage: cleanText,
        lastMessageAt: new Date(),
      },
    });

    // Kirim notifikasi pesan ke lawan bicara via In-App dan Web Push (VAPID)
    const recipientId = thread.customerId === session.userId ? thread.designerId : thread.customerId;
    const sender = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { displayName: true },
    });
    const senderName = sender?.displayName || "Pengguna";

    await PushNotificationService.notifyUser(recipientId, {
      type: "CHAT_MESSAGE",
      title: `Pesan baru dari ${senderName}`,
      body: cleanText.length > 80 ? cleanText.slice(0, 80) + "..." : cleanText,
      url: `/chat?chatid=${thread.id}`,
      payload: {
        threadId: thread.id,
      },
    }).catch((notifErr) => {
      console.warn("[Chat] Gagal mengirim notifikasi chat via web push:", notifErr);
    });

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        senderId: message.senderId,
        isMe: true,
        type: message.type,
        body: message.body,
        readAt: null,
        isRead: false,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
