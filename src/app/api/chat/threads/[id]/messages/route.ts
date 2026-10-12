import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";

import { OfferService } from "@/server/offers/offer.service";

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

    return NextResponse.json({
      success: true,
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

      if (offerId) {
        const existingOffer = await prisma.offer.findUnique({
          where: { id: offerId },
          include: { brief: true, designer: true },
        });

        if (!existingOffer) {
          throw new NotFoundError("Penawaran awal tidak ditemukan");
        }
        if (existingOffer.status !== "PENDING") {
          throw new ValidationError("Penawaran sudah tidak dalam status PENDING");
        }

        // Jika terdapat perubahan harga/durasi dari negosiasi di chat, buat versi penawaran baru
        if (
          numPrice !== existingOffer.price ||
          numDuration !== existingOffer.durationDays ||
          numRevisions !== existingOffer.revisionQuota
        ) {
          const newOffer = await OfferService.createOffer({
            briefId: existingOffer.briefId,
            designerId: session.userId,
            price: numPrice,
            durationDays: numDuration,
            revisionQuota: numRevisions,
            deliverables: [notes || "Hasil desain final sesuai kesepakatan obrolan"],
            note: notes || existingOffer.note,
          });
          activeOfferId = newOffer.id;
          finalOfferDetails = {
            offerId: newOffer.id,
            briefId: newOffer.briefId,
            title: existingOffer.brief.title,
            price: newOffer.price,
            durationDays: newOffer.durationDays,
            revisionQuota: newOffer.revisionQuota,
            note: newOffer.note,
            designerName: existingOffer.designer.displayName,
          };
        } else {
          finalOfferDetails = {
            offerId: existingOffer.id,
            briefId: existingOffer.briefId,
            title: existingOffer.brief.title,
            price: existingOffer.price,
            durationDays: existingOffer.durationDays,
            revisionQuota: existingOffer.revisionQuota,
            note: notes || existingOffer.note,
            designerName: existingOffer.designer.displayName,
          };
        }
      } else if (briefId) {
        const brief = await prisma.brief.findUnique({
          where: { id: briefId },
          include: { customer: true },
        });
        if (!brief) throw new NotFoundError("Brief tidak ditemukan");

        const designerUser = await prisma.user.findUnique({
          where: { id: session.userId },
        });

        const newOffer = await OfferService.createOffer({
          briefId: brief.id,
          designerId: session.userId,
          price: numPrice,
          durationDays: numDuration,
          revisionQuota: numRevisions,
          deliverables: [notes || "Hasil desain final sesuai kesepakatan obrolan"],
          note: notes || "Kesepakatan langsung melalui ruang obrolan",
        });

        activeOfferId = newOffer.id;
        finalOfferDetails = {
          offerId: newOffer.id,
          briefId: brief.id,
          title: brief.title,
          price: newOffer.price,
          durationDays: newOffer.durationDays,
          revisionQuota: newOffer.revisionQuota,
          note: newOffer.note,
          designerName: designerUser?.displayName || "Desainer",
        };
      } else {
        throw new ValidationError("ID penawaran atau ID brief wajib disertakan");
      }

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
