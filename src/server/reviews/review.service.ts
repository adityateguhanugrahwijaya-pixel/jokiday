import { prisma } from "@/lib/db";

export const REVIEW_EDIT_WINDOW_HOURS = 24;
export const MAX_REVIEW_COMMENT_LENGTH = 500;

export interface SubmitReviewInput {
  orderId: string;
  rating: number;
  comment?: string | null;
}

export interface UpdateReviewInput {
  reviewId: string;
  rating: number;
  comment?: string | null;
}

export interface ViewerContext {
  userId?: string | null;
  activeRole?: string | null; // "CUSTOMER" | "DESIGNER" | "ADMIN"
  isAdmin?: boolean;
}

export class ReviewService {
  /**
   * Mask nama untuk ulasan publik (contoh: "Budi Santoso" -> "Budi S.", "John" -> "J***")
   */
  static maskName(fullName: string | null | undefined): string {
    if (!fullName || !fullName.trim()) return "Pengguna";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[parts.length - 1];
      return `${first} ${last.charAt(0).toUpperCase()}.`;
    }
    const single = parts[0];
    if (single.length <= 2) return `${single}***`;
    return `${single.slice(0, 2)}***`;
  }

  /**
   * Sanitasi teks komentar ulasan
   */
  static sanitizeComment(raw?: string | null): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Potong sesuai batas maksimum karakter
    const limited = trimmed.slice(0, MAX_REVIEW_COMMENT_LENGTH);
    // Hapus karakter kontrol / tag HTML berbahaya
    return limited.replace(/[<>]/g, "");
  }

  /**
   * Hitung ulang agregat rating secara atomik dalam transaksi Prisma
   */
  static async recomputeAggregates(
    revieweeId: string,
    direction: "CUSTOMER_TO_DESIGNER" | "DESIGNER_TO_CUSTOMER",
    tx: any
  ) {
    const db = tx || prisma;

    if (direction === "CUSTOMER_TO_DESIGNER") {
      // Hitung rating publik desainer
      const visibleReviews = await db.review.findMany({
        where: {
          revieweeId,
          direction: "CUSTOMER_TO_DESIGNER",
          status: "VISIBLE",
        },
        select: { rating: true },
      });

      const count = visibleReviews.length;
      const sum = visibleReviews.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0);
      const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0.0;

      await db.designerProfile.updateMany({
        where: { userId: revieweeId },
        data: {
          ratingAvg: avg,
          ratingCount: count,
        },
      });

      return { ratingAvg: avg, ratingCount: count };
    } else {
      // Hitung rating privat customer
      const visibleReviews = await db.review.findMany({
        where: {
          revieweeId,
          direction: "DESIGNER_TO_CUSTOMER",
          status: "VISIBLE",
        },
        select: { rating: true },
      });

      const count = visibleReviews.length;
      const sum = visibleReviews.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0);
      const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0.0;

      await db.user.update({
        where: { id: revieweeId },
        data: {
          customerRatingAvg: avg,
          customerRatingCount: count,
        },
      });

      return { customerRatingAvg: avg, customerRatingCount: count };
    }
  }

  /**
   * Submit ulasan baru untuk sebuah order
   */
  static async createReview(
    input: SubmitReviewInput,
    caller: { id: string; activeRole?: string; isAdmin?: boolean }
  ) {
    const { orderId, rating, comment } = input;

    // 1. Validasi rating integer 1-5
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Rating harus berupa bilangan bulat antara 1 sampai 5 bintang");
    }

    // 2. Ambil data order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, displayName: true } },
        designer: { select: { id: true, displayName: true } },
      },
    });

    if (!order) {
      throw new Error("Pesanan tidak ditemukan");
    }

    // 3. Hanya order berstatus COMPLETED yang boleh dinilai
    if (order.status !== "COMPLETED") {
      throw new Error(
        "Penilaian hanya dapat diberikan untuk pesanan yang telah selesai (COMPLETED)"
      );
    }

    // 4. Tolak jika customerId === designerId (cegah rating diri sendiri)
    if (order.customerId === order.designerId) {
      throw new Error("Tidak dapat memberikan ulasan pada pesanan dengan pihak yang sama");
    }

    // 5. Tentukan arah dan verifikasi hak akses pemanggil
    let direction: "CUSTOMER_TO_DESIGNER" | "DESIGNER_TO_CUSTOMER";
    let reviewerId: string;
    let revieweeId: string;

    if (caller.id === order.customerId) {
      direction = "CUSTOMER_TO_DESIGNER";
      reviewerId = order.customerId;
      revieweeId = order.designerId;
    } else if (caller.id === order.designerId) {
      direction = "DESIGNER_TO_CUSTOMER";
      reviewerId = order.designerId;
      revieweeId = order.customerId;
    } else {
      throw new Error("Hanya peserta pesanan ini yang berhak memberikan penilaian");
    }

    // 6. Cek apakah ulasan untuk arah ini sudah pernah dibuat
    const existingReview = await prisma.review.findUnique({
      where: {
        orderId_direction: {
          orderId: order.id,
          direction,
        },
      },
    });

    if (existingReview) {
      throw new Error(
        "Anda sudah memberikan penilaian untuk pesanan ini. Gunakan opsi ubah ulasan jika masih dalam jendela edit."
      );
    }

    const sanitizedComment = this.sanitizeComment(comment);

    // 7. Simpan review & hitung ulang agregat dalam transaksi atomik
    const result = await prisma.$transaction(
      async (tx) => {
        const review = await tx.review.create({
          data: {
            orderId: order.id,
            reviewerId,
            revieweeId,
            direction,
            rating,
            comment: sanitizedComment,
            status: "VISIBLE",
          },
          include: {
            reviewer: { select: { id: true, displayName: true, username: true } },
          },
        });

        // Hitung ulang agregat reviewee
        await this.recomputeAggregates(revieweeId, direction, tx);

        return review;
      },
      { maxWait: 10000, timeout: 20000 }
    );

    // Kirim notifikasi HANYA jika CUSTOMER_TO_DESIGNER (desainer menerima ulasan baru)
    // Jangan kirim notifikasi ke customer saat dinilai desainer (penilaian customer bersifat privat)
    if (direction === "CUSTOMER_TO_DESIGNER") {
      try {
        await prisma.notification.create({
          data: {
            userId: revieweeId,
            type: "REVIEW_RECEIVED",
            payload: JSON.stringify({
              orderId: order.id,
              rating,
              comment: sanitizedComment,
              reviewerName: this.maskName(order.customer.displayName),
              orderTitle: order.id.slice(0, 8),
            }),
          },
        });
      } catch (notifErr) {
        console.error("Gagal mengirim notifikasi ulasan:", notifErr);
      }
    }

    return result;
  }

  /**
   * Edit ulasan (hanya jika masih dalam jendela edit 24 jam)
   */
  static async updateReview(
    input: UpdateReviewInput,
    callerId: string
  ) {
    const { reviewId, rating, comment } = input;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Rating harus berupa bilangan bulat antara 1 sampai 5 bintang");
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error("Ulasan tidak ditemukan");
    }

    if (review.reviewerId !== callerId) {
      throw new Error("Anda tidak memiliki izin untuk mengedit ulasan ini");
    }

    // Cek batas jendela edit (default 24 jam)
    const now = Date.now();
    const createdTime = new Date(review.createdAt).getTime();
    const diffHours = (now - createdTime) / (1000 * 60 * 60);

    if (diffHours > REVIEW_EDIT_WINDOW_HOURS) {
      throw new Error(
        `Batas waktu pengubahan ulasan (${REVIEW_EDIT_WINDOW_HOURS} jam) telah berakhir`
      );
    }

    const sanitizedComment = this.sanitizeComment(comment);

    // Update ulasan dan hitung ulang agregat dalam transaksi
    const updated = await prisma.$transaction(
      async (tx) => {
        const res = await tx.review.update({
          where: { id: reviewId },
          data: {
            rating,
            comment: sanitizedComment,
          },
          include: {
            reviewer: { select: { id: true, displayName: true, username: true } },
          },
        });

        await this.recomputeAggregates(
          review.revieweeId,
          review.direction as "CUSTOMER_TO_DESIGNER" | "DESIGNER_TO_CUSTOMER",
          tx
        );

        return res;
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return updated;
  }

  /**
   * Desainer membalas ulasan publik pelanggan (satu kali)
   */
  static async replyToReview(
    reviewId: string,
    replyText: string,
    callerId: string
  ) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error("Ulasan tidak ditemukan");
    }

    if (review.direction !== "CUSTOMER_TO_DESIGNER") {
      throw new Error("Hanya ulasan publik pelanggan yang dapat dibalas");
    }

    if (review.revieweeId !== callerId) {
      throw new Error("Hanya desainer penerima ulasan yang dapat membalas");
    }

    if (review.designerReply) {
      throw new Error("Anda sudah membalas ulasan ini sebelumnya");
    }

    const sanitizedReply = this.sanitizeComment(replyText);
    if (!sanitizedReply) {
      throw new Error("Balasan tidak boleh kosong");
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        designerReply: sanitizedReply,
        designerRepliedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Laporkan ulasan yang melanggar (untuk moderasi admin)
   */
  static async reportReview(
    reviewId: string,
    reporterId: string,
    reason: string
  ) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new Error("Alasan pelaporan wajib diisi");
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error("Ulasan tidak ditemukan");
    }

    const report = await prisma.reviewReport.create({
      data: {
        reviewId,
        reporterId,
        reason: trimmedReason.slice(0, 500),
      },
    });

    return report;
  }

  /**
   * Admin menyembunyikan / memulihkan ulasan
   */
  static async setReviewStatusByAdmin(
    reviewId: string,
    status: "VISIBLE" | "HIDDEN",
    adminId: string,
    reason?: string
  ) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error("Ulasan tidak ditemukan");
    }

    const updated = await prisma.$transaction(
      async (tx) => {
        const res = await tx.review.update({
          where: { id: reviewId },
          data: {
            status,
            hiddenReason: status === "HIDDEN" ? reason?.trim() || "Disembunyikan oleh moderator" : null,
            hiddenBy: status === "HIDDEN" ? adminId : null,
          },
        });

        // Hitung ulang agregat reviewee
        await this.recomputeAggregates(
          review.revieweeId,
          review.direction as "CUSTOMER_TO_DESIGNER" | "DESIGNER_TO_CUSTOMER",
          tx
        );

        // Jika ada laporan terkait, tandai RESOLVED
        if (status === "HIDDEN") {
          await tx.reviewReport.updateMany({
            where: { reviewId },
            data: { status: "RESOLVED", adminNote: reason?.trim() || "Ulasan telah disembunyikan" },
          });
        }

        return res;
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return updated;
  }

  /**
   * Ambil data review untuk sebuah order berdasarkan hak akses pemanggil
   */
  static async getOrderReviewsForViewer(
    orderId: string,
    viewer: ViewerContext
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        designerId: true,
        status: true,
      },
    });

    if (!order) return null;

    const allReviews = await prisma.review.findMany({
      where: { orderId },
      include: {
        reviewer: { select: { id: true, displayName: true, username: true } },
      },
    });

    const isCustomer = viewer.userId === order.customerId;
    const isDesigner = viewer.userId === order.designerId;
    const isAdmin = Boolean(viewer.isAdmin);
    const isDesignerMode = viewer.activeRole === "DESIGNER";

    // 1. Review Customer -> Designer (Publik)
    const customerReviewRaw = allReviews.find(
      (r) => r.direction === "CUSTOMER_TO_DESIGNER"
    );

    let customerReview = null;
    if (customerReviewRaw) {
      const canEdit =
        Boolean(viewer.userId === customerReviewRaw.reviewerId) &&
        (Date.now() - new Date(customerReviewRaw.createdAt).getTime()) <=
          REVIEW_EDIT_WINDOW_HOURS * 60 * 60 * 1000;

      // Sembunyikan jika HIDDEN dan bukan admin / bukan pembuatnya
      if (
        customerReviewRaw.status === "VISIBLE" ||
        isAdmin ||
        viewer.userId === customerReviewRaw.reviewerId
      ) {
        customerReview = {
          id: customerReviewRaw.id,
          rating: customerReviewRaw.rating,
          comment: customerReviewRaw.comment,
          direction: customerReviewRaw.direction,
          status: customerReviewRaw.status,
          createdAt: customerReviewRaw.createdAt.toISOString(),
          updatedAt: customerReviewRaw.updatedAt.toISOString(),
          canEdit,
          isOwnReview: viewer.userId === customerReviewRaw.reviewerId,
          reviewerName: this.maskName(customerReviewRaw.reviewer?.displayName),
          designerReply: customerReviewRaw.designerReply,
          designerRepliedAt: customerReviewRaw.designerRepliedAt?.toISOString() || null,
        };
      }
    }

    // 2. Review Designer -> Customer (Privat khusus desainer & BUKAN customer yang dinilai)
    const designerReviewRaw = allReviews.find(
      (r) => r.direction === "DESIGNER_TO_CUSTOMER"
    );

    let designerReview = null;
    if (designerReviewRaw) {
      const isRevieweeCustomer = viewer.userId === designerReviewRaw.revieweeId;
      // ATURAN KETAT VISIBILITAS:
      // Hanya boleh dikembalikan jika pemanggil adalah ADMIN atau (mode DESIGNER dan BUKAN user yang dinilai)
      const allowedToSee =
        isAdmin ||
        (isDesignerMode && !isRevieweeCustomer) ||
        (isDesigner && viewer.userId === designerReviewRaw.reviewerId);

      if (allowedToSee) {
        const canEdit =
          Boolean(viewer.userId === designerReviewRaw.reviewerId) &&
          (Date.now() - new Date(designerReviewRaw.createdAt).getTime()) <=
            REVIEW_EDIT_WINDOW_HOURS * 60 * 60 * 1000;

        if (
          designerReviewRaw.status === "VISIBLE" ||
          isAdmin ||
          viewer.userId === designerReviewRaw.reviewerId
        ) {
          designerReview = {
            id: designerReviewRaw.id,
            rating: designerReviewRaw.rating,
            comment: designerReviewRaw.comment,
            direction: designerReviewRaw.direction,
            status: designerReviewRaw.status,
            createdAt: designerReviewRaw.createdAt.toISOString(),
            updatedAt: designerReviewRaw.updatedAt.toISOString(),
            canEdit,
            isOwnReview: viewer.userId === designerReviewRaw.reviewerId,
            reviewerName: "Desainer Terverifikasi",
          };
        }
      }
    }

    return {
      orderId: order.id,
      orderStatus: order.status,
      isParticipant: isCustomer || isDesigner,
      isCustomer,
      isDesigner,
      customerReview,
      designerReview,
      editWindowHours: REVIEW_EDIT_WINDOW_HOURS,
    };
  }

  /**
   * Ambil reputasi customer untuk desainer (Brief Pasar & Detail Order)
   * Mengembalikan null jika pemanggil adalah customer itu sendiri atau bukan mode desainer
   */
  static async getCustomerReputationForDesigner(
    customerId: string,
    viewer: ViewerContext
  ) {
    // 1. Jika pemanggil adalah user yang dinilai itu sendiri -> SEMBUNYIKAN SEPENUHNYA
    if (viewer.userId === customerId) {
      return null;
    }

    // 2. Jika bukan admin dan bukan mode designer -> SEMBUNYIKAN SEPENUHNYA
    const isDesignerMode = viewer.activeRole === "DESIGNER";
    if (!viewer.isAdmin && !isDesignerMode) {
      return null;
    }

    // 3. Ambil data agregat customer & ulasan terbaru
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        displayName: true,
        customerRatingAvg: true,
        customerRatingCount: true,
      },
    });

    if (!customer) return null;

    // Ambil maksimal 3 ulasan terbaru dari desainer lain
    const recentReviews = await prisma.review.findMany({
      where: {
        revieweeId: customerId,
        direction: "DESIGNER_TO_CUSTOMER",
        status: "VISIBLE",
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    return {
      customerId: customer.id,
      maskedName: this.maskName(customer.displayName),
      customerRatingAvg: customer.customerRatingAvg,
      customerRatingCount: customer.customerRatingCount,
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Ambil daftar ulasan publik untuk halaman profil desainer
   */
  static async getPublicDesignerReviews(
    designerUserId: string,
    options?: { page?: number; limit?: number }
  ) {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(50, options?.limit || 10);
    const skip = (page - 1) * limit;

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: {
          revieweeId: designerUserId,
          direction: "CUSTOMER_TO_DESIGNER",
          status: "VISIBLE",
        },
        include: {
          reviewer: { select: { displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({
        where: {
          revieweeId: designerUserId,
          direction: "CUSTOMER_TO_DESIGNER",
          status: "VISIBLE",
        },
      }),
    ]);

    return {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        reviewerName: this.maskName(r.reviewer?.displayName),
        createdAt: r.createdAt.toISOString(),
        designerReply: r.designerReply,
        designerRepliedAt: r.designerRepliedAt?.toISOString() || null,
      })),
    };
  }
}
