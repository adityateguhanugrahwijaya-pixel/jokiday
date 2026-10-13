import { prisma } from "@/lib/db";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { LedgerService } from "../ledger/ledger.service";
import { sanitizeInput } from "@/lib/security";

export interface CreateBriefInput {
  customerId: string;
  mode: "DIRECT" | "MARKET";
  targetDesignerId?: string;
  sourcePostId?: string;
  title: string;
  description: string;
  category: string;
  references?: Array<{ url?: string; note?: string }>;
  outputFormat?: string[];
  revisionQuota?: number;
  desiredDeadlineDays?: number;
  budgetHint?: number;
}

export interface CreateOfferInput {
  briefId: string;
  designerId: string;
  price: number;
  durationDays: number;
  revisionQuota: number;
  deliverables: string[];
  note?: string;
}

export class OfferService {
  /**
   * Buat brief baru (Direct atau Pasar)
   */
  static async createBrief(data: CreateBriefInput) {
    const cleanTitle = sanitizeInput(data.title).slice(0, 150);
    const cleanDesc = sanitizeInput(data.description).slice(0, 3000);
    const cleanCat = sanitizeInput(data.category).slice(0, 50);

    if (!cleanTitle || !cleanDesc || !cleanCat) {
      throw new ValidationError("Judul, deskripsi, dan kategori brief wajib diisi");
    }

    if (data.mode === "DIRECT" && !data.targetDesignerId) {
      throw new ValidationError("Brief mode DIRECT wajib menentukan target desainer");
    }

    const brief = await prisma.brief.create({
      data: {
        customerId: data.customerId,
        mode: data.mode,
        targetDesignerId: data.targetDesignerId || null,
        sourcePostId: data.sourcePostId || null,
        title: cleanTitle,
        description: cleanDesc,
        category: cleanCat,
        referencesJson: JSON.stringify(data.references || []),
        outputFormat: JSON.stringify(data.outputFormat || ["png", "jpg"]),
        revisionQuota: data.revisionQuota || 2,
        desiredDeadlineDays: data.desiredDeadlineDays || null,
        budgetHint: data.budgetHint || null,
        status: "OPEN",
      },
    });

    return brief;
  }

  /**
   * Buat penawaran harga oleh designer.
   * ATURAN: Angka harga HANYA boleh diisi oleh designer.
   */
  static async createOffer(data: CreateOfferInput) {
    if (data.price <= 0 || !Number.isInteger(data.price)) {
      throw new ValidationError("Harga penawaran harus bilangan bulat positif dalam rupiah");
    }
    if (data.durationDays <= 0) {
      throw new ValidationError("Durasi pengerjaan minimal 1 hari");
    }

    const brief = await prisma.brief.findUnique({
      where: { id: data.briefId },
    });
    if (!brief) throw new NotFoundError("Brief tidak ditemukan");
    if (brief.status !== "OPEN") {
      throw new ConflictError("Brief sudah tidak menerima penawaran baru");
    }

    if (brief.customerId === data.designerId) {
      throw new ForbiddenError("Kamu tidak dapat mengirim penawaran pada brief milikmu sendiri");
    }

    // Jika DIRECT, pastikan hanya desainer tujuan yang bisa memberi offer
    if (brief.mode === "DIRECT" && brief.targetDesignerId !== data.designerId) {
      throw new ForbiddenError("Hanya desainer yang dituju yang dapat mengirim penawaran pada brief direct ini");
    }

    // Cek versi penawaran sebelumnya untuk desainer ini pada brief ini
    const existingOffers = await prisma.offer.findMany({
      where: { briefId: data.briefId, designerId: data.designerId },
      orderBy: { version: "desc" },
    });

    const nextVersion = existingOffers.length > 0 ? existingOffers[0].version + 1 : 1;

    // Tandai penawaran sebelumnya sebagai SUPERSEDED
    if (existingOffers.length > 0) {
      await prisma.offer.updateMany({
        where: {
          briefId: data.briefId,
          designerId: data.designerId,
          status: "PENDING",
        },
        data: { status: "SUPERSEDED" },
      });
    }

    const cleanNote = data.note ? sanitizeInput(data.note).slice(0, 2000) : "";
    const cleanDeliverables = (data.deliverables || [])
      .map((d) => (typeof d === "string" ? sanitizeInput(d).slice(0, 200) : ""))
      .filter(Boolean);

    const offer = await prisma.offer.create({
      data: {
        briefId: data.briefId,
        designerId: data.designerId,
        price: data.price,
        durationDays: data.durationDays,
        revisionQuota: data.revisionQuota,
        deliverables: JSON.stringify(cleanDeliverables),
        note: cleanNote,
        version: nextVersion,
        status: "PENDING",
      },
    });

    return offer;
  }

  /**
   * Customer menerima penawaran -> buat kontrak dan Order berstatus AWAITING_PAYMENT
   */
  static async acceptOffer(offerId: string, customerId: string) {
    return await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        include: { brief: true, designer: true },
      });

      if (!offer) throw new NotFoundError("Penawaran tidak ditemukan");
      if (offer.status !== "PENDING") {
        throw new ConflictError("Hanya penawaran dengan status PENDING yang dapat diterima");
      }
      if (offer.brief.customerId !== customerId) {
        throw new ForbiddenError("Hanya pemilik brief yang berhak menerima penawaran");
      }

      // Hitung fee platform 5%
      const { fee, designerNet } = LedgerService.calculatePlatformFee(offer.price);

      // Snapshot kontrak saat deal
      const contractSnapshot = {
        briefTitle: offer.brief.title,
        briefDescription: offer.brief.description,
        price: offer.price,
        fee,
        designerNet,
        durationDays: offer.durationDays,
        revisionQuota: offer.revisionQuota,
        deliverables: JSON.parse(offer.deliverables || "[]"),
        designerName: offer.designer.displayName,
        dealAt: new Date().toISOString(),
      };

      // Batas waktu pembayaran: 24 jam dari sekarang
      const paymentExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Buat order
      const order = await tx.order.create({
        data: {
          briefId: offer.briefId,
          offerId: offer.id,
          customerId,
          designerId: offer.designerId,
          status: "AWAITING_PAYMENT",
          price: offer.price,
          fee,
          designerNet,
          durationDays: offer.durationDays,
          revisionQuota: offer.revisionQuota,
          deliverables: offer.deliverables,
          contractSnapshot: JSON.stringify(contractSnapshot),
          paymentExpiresAt,
        },
      });

      // Update status offer menjadi ACCEPTED
      await tx.offer.update({
        where: { id: offer.id },
        data: { status: "ACCEPTED" },
      });

      // Update brief menjadi CLAIMED jika mode pasar
      await tx.brief.update({
        where: { id: offer.briefId },
        data: { status: "CLAIMED" },
      });

      // Tolak (DECLINED) penawaran lain yang masih PENDING pada brief ini
      await tx.offer.updateMany({
        where: {
          briefId: offer.briefId,
          id: { not: offer.id },
          status: "PENDING",
        },
        data: { status: "DECLINED" },
      });

      // Hubungkan chat thread antara pelanggan dan desainer terpilih dengan order baru
      // Catatan: orderId di ChatThread memiliki unique constraint (1-to-1).
      // Pilih 1 thread aktif yang belum terikat order lain (orderId: null), atau buat thread baru jika belum ada.
      let threadToLink = await tx.chatThread.findFirst({
        where: {
          customerId,
          designerId: offer.designerId,
          orderId: null,
        },
        orderBy: { lastMessageAt: "desc" },
      });

      if (!threadToLink) {
        // Cek jika sudah ada thread yang khusus untuk order ini
        threadToLink = await tx.chatThread.findUnique({
          where: { orderId: order.id },
        });
      }

      if (threadToLink) {
        await tx.chatThread.update({
          where: { id: threadToLink.id },
          data: {
            orderId: order.id,
            lastMessage: `[Kesepakatan Disetujui: Order #${order.id.slice(0, 8)}]`,
            lastMessageAt: new Date(),
          },
        });

        await tx.message.create({
          data: {
            threadId: threadToLink.id,
            senderId: customerId,
            type: "SYSTEM",
            body: `Pelanggan telah menyetujui tawaran sebesar Rp ${offer.price.toLocaleString("id-ID")} untuk proyek "${offer.brief.title}". Order resmi #${order.id.slice(0, 8)} telah dibuat. Kesepakatan terkunci.`,
          },
        });
      } else {
        const newTh = await tx.chatThread.create({
          data: {
            customerId,
            designerId: offer.designerId,
            orderId: order.id,
            title: `Diskusi Order #${order.id.slice(0, 8)}`,
            lastMessage: `[Kesepakatan Disetujui: Order #${order.id.slice(0, 8)}]`,
            lastMessageAt: new Date(),
          },
        });

        await tx.message.create({
          data: {
            threadId: newTh.id,
            senderId: customerId,
            type: "SYSTEM",
            body: `Pelanggan telah menyetujui tawaran sebesar Rp ${offer.price.toLocaleString("id-ID")} untuk proyek "${offer.brief.title}". Order resmi #${order.id.slice(0, 8)} telah dibuat. Kesepakatan terkunci.`,
          },
        });
      }

      // Beritahu desainer lain yang menawar pada brief ini bahwa penawaran ditutup
      const otherOffers = await tx.offer.findMany({
        where: {
          briefId: offer.briefId,
          id: { not: offer.id },
        },
        select: { designerId: true },
      });

      const otherDesignerIds = Array.from(new Set(otherOffers.map((o) => o.designerId)));
      for (const otherDesignerId of otherDesignerIds) {
        const otherThreads = await tx.chatThread.findMany({
          where: {
            customerId,
            designerId: otherDesignerId,
          },
        });

        for (const oth of otherThreads) {
          await tx.chatThread.update({
            where: { id: oth.id },
            data: {
              lastMessage: `[Tawaran Ditutup: Proyek disepakati dengan desainer lain]`,
              lastMessageAt: new Date(),
            },
          });

          await tx.message.create({
            data: {
              threadId: oth.id,
              senderId: customerId,
              type: "SYSTEM",
              body: `Pemberitahuan: Proyek "${offer.brief.title}" telah disepakati oleh pelanggan dengan desainer lain. Penawaran untuk proyek ini telah ditutup.`,
            },
          });
        }
      }

      return order;
    }, { maxWait: 15000, timeout: 30000 });
  }
}
