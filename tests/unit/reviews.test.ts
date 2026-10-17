import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/db";
import { ReviewService, REVIEW_EDIT_WINDOW_HOURS } from "../../src/server/reviews/review.service";

describe("Sistem Rating Dua Arah (Two-Way Rating System)", { timeout: 60000 }, () => {
  const TEST_EMAILS = [
    "rev_cust@test.com",
    "rev_des@test.com",
    "rev_other@test.com",
    "rev_dual@test.com",
  ];

  let customerUser: any;
  let designerUser: any;
  let otherUser: any;
  let dualModeUser: any;

  async function cleanupTestData() {
    const users = await prisma.user.findMany({
      where: { email: { in: TEST_EMAILS } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) return;

    await prisma.reviewReport.deleteMany({
      where: { reporterId: { in: userIds } },
    });
    await prisma.review.deleteMany({
      where: {
        OR: [
          { reviewerId: { in: userIds } },
          { revieweeId: { in: userIds } },
        ],
      },
    });
    await prisma.order.deleteMany({
      where: {
        OR: [
          { customerId: { in: userIds } },
          { designerId: { in: userIds } },
        ],
      },
    });
    await prisma.offer.deleteMany({
      where: { designerId: { in: userIds } },
    });
    await prisma.brief.deleteMany({
      where: { customerId: { in: userIds } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.designerProfile.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  async function createTestOrder(status = "COMPLETED", cust = customerUser, des = designerUser) {
    const brief = await prisma.brief.create({
      data: {
        customerId: cust.id,
        title: `Brief ${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: "Deskripsi brief testing",
        category: "logo",
        mode: "DIRECT",
        targetDesignerId: des.id,
      },
    });
    const offer = await prisma.offer.create({
      data: {
        briefId: brief.id,
        designerId: des.id,
        price: 300000,
        durationDays: 2,
        revisionQuota: 2,
        status: "ACCEPTED",
      },
    });
    return prisma.order.create({
      data: {
        briefId: brief.id,
        offerId: offer.id,
        customerId: cust.id,
        designerId: des.id,
        status,
        price: 300000,
        fee: 15000,
        designerNet: 285000,
        durationDays: 2,
        revisionQuota: 2,
        paymentExpiresAt: new Date(),
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });
  }

  beforeAll(async () => {
    await cleanupTestData();

    customerUser = await prisma.user.create({
      data: {
        email: "rev_cust@test.com",
        displayName: "Budi Santoso",
        passwordHash: "dummy",
        isCustomer: true,
        isDesigner: false,
        activeRole: "CUSTOMER",
      },
    });

    designerUser = await prisma.user.create({
      data: {
        email: "rev_des@test.com",
        displayName: "Siti Designer",
        username: "sitidesign",
        passwordHash: "dummy",
        isCustomer: false,
        isDesigner: true,
        activeRole: "DESIGNER",
        designerProfile: {
          create: {
            bio: "Bio Desainer",
            ratingAvg: 0.0,
            ratingCount: 0,
            completedCount: 1,
          },
        },
      },
      include: { designerProfile: true },
    });

    otherUser = await prisma.user.create({
      data: {
        email: "rev_other@test.com",
        displayName: "Orang Lain",
        passwordHash: "dummy",
        isCustomer: true,
        activeRole: "CUSTOMER",
      },
    });

    dualModeUser = await prisma.user.create({
      data: {
        email: "rev_dual@test.com",
        displayName: "Andi DualMode",
        username: "andidual",
        passwordHash: "dummy",
        isCustomer: true,
        isDesigner: true,
        activeRole: "DESIGNER",
        designerProfile: {
          create: {
            bio: "Desainer sekaligus Pelanggan",
            ratingAvg: 0.0,
            ratingCount: 0,
            completedCount: 0,
          },
        },
      },
      include: { designerProfile: true },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("a) Customer berhasil menilai desainer pada order COMPLETED dan tampil di profil publik", async () => {
    const order = await createTestOrder("COMPLETED");

    const review = await ReviewService.createReview(
      {
        orderId: order.id,
        rating: 5,
        comment: "Desain sangat bagus, responsif dan cepat!",
      },
      { id: customerUser.id, activeRole: "CUSTOMER" }
    );

    expect(review).toBeDefined();
    expect(review.rating).toBe(5);
    expect(review.direction).toBe("CUSTOMER_TO_DESIGNER");
    expect(review.reviewerId).toBe(customerUser.id);
    expect(review.revieweeId).toBe(designerUser.id);
    expect(review.status).toBe("VISIBLE");

    // Periksa agregat pada DesignerProfile
    const updatedProfile = await prisma.designerProfile.findUnique({
      where: { userId: designerUser.id },
    });
    expect(updatedProfile?.ratingAvg).toBe(5.0);
    expect(updatedProfile?.ratingCount).toBe(1);

    // Periksa query publik
    const publicReviews = await ReviewService.getPublicDesignerReviews(designerUser.id);
    expect(publicReviews.totalCount).toBe(1);
    expect(publicReviews.reviews[0].reviewerName).toBe("Budi S."); // Masked!
    expect(publicReviews.reviews[0].rating).toBe(5);
    expect(publicReviews.reviews[0].comment).toContain("Desain sangat bagus");

    // Periksa bahwa notifikasi masuk ke desainer
    const notif = await prisma.notification.findFirst({
      where: { userId: designerUser.id, type: "REVIEW_RECEIVED" },
    });
    expect(notif).toBeDefined();
  });

  it("b) Validasi penolakan: double review, order belum selesai, dan order pihak lain", async () => {
    const orderInProgress = await createTestOrder("IN_PROGRESS");
    const orderCompleted = await createTestOrder("COMPLETED");

    // 1. Order belum selesai (IN_PROGRESS) harus ditolak
    await expect(
      ReviewService.createReview(
        { orderId: orderInProgress.id, rating: 5, comment: "Bagus" },
        { id: customerUser.id, activeRole: "CUSTOMER" }
      )
    ).rejects.toThrow("Penilaian hanya dapat diberikan untuk pesanan yang telah selesai");

    // 2. User pihak ketiga yang bukan peserta order harus ditolak
    await expect(
      ReviewService.createReview(
        { orderId: orderCompleted.id, rating: 4, comment: "Saya bukan peserta" },
        { id: otherUser.id, activeRole: "CUSTOMER" }
      )
    ).rejects.toThrow("Hanya peserta pesanan ini yang berhak memberikan penilaian");

    // 3. Customer menilai sekali
    await ReviewService.createReview(
      { orderId: orderCompleted.id, rating: 4, comment: "Mantap" },
      { id: customerUser.id, activeRole: "CUSTOMER" }
    );

    // 4. Customer mencoba menilai kedua kali untuk order yang sama harus ditolak
    await expect(
      ReviewService.createReview(
        { orderId: orderCompleted.id, rating: 5, comment: "Coba lagi" },
        { id: customerUser.id, activeRole: "CUSTOMER" }
      )
    ).rejects.toThrow("Anda sudah memberikan penilaian untuk pesanan ini");
  });

  it("c) Desainer menilai customer (privat): customer yang dinilai tidak boleh melihat ulasan tersebut", async () => {
    const order = await createTestOrder("COMPLETED");

    // Desainer menilai customer
    const desReview = await ReviewService.createReview(
      {
        orderId: order.id,
        rating: 4,
        comment: "Customer komunikatif dan instruksi sangat jelas.",
      },
      { id: designerUser.id, activeRole: "DESIGNER" }
    );

    expect(desReview.direction).toBe("DESIGNER_TO_CUSTOMER");
    expect(desReview.reviewerId).toBe(designerUser.id);
    expect(desReview.revieweeId).toBe(customerUser.id);

    // Periksa agregat customer pada tabel User
    const updatedCustomer = await prisma.user.findUnique({
      where: { id: customerUser.id },
    });
    expect(updatedCustomer?.customerRatingAvg).toBe(4.0);
    expect(updatedCustomer?.customerRatingCount).toBe(1);

    // Periksa: TIDAK ADA notifikasi ke customer (karena privat)
    const custNotif = await prisma.notification.findFirst({
      where: { userId: customerUser.id, type: "REVIEW_RECEIVED" },
    });
    expect(custNotif).toBeNull();

    // 1. Customer melihat order reviews -> designerReview HARUS NULL
    const customerView = await ReviewService.getOrderReviewsForViewer(
      order.id,
      { userId: customerUser.id, activeRole: "CUSTOMER" }
    );
    expect(customerView?.designerReview).toBeNull();

    // 2. Pengunjung publik belum login -> designerReview HARUS NULL
    const publicView = await ReviewService.getOrderReviewsForViewer(
      order.id,
      { userId: null, activeRole: null }
    );
    expect(publicView?.designerReview).toBeNull();

    // 3. Desainer lain yang sedang dalam mode desainer -> DAPAT MELIHAT
    const otherDesignerOrderView = await ReviewService.getOrderReviewsForViewer(
      order.id,
      { userId: dualModeUser.id, activeRole: "DESIGNER" }
    );
    expect(otherDesignerOrderView?.designerReview).toBeDefined();
    expect(otherDesignerOrderView?.designerReview?.rating).toBe(4);
  });

  it("d) User dua-mode: dinilai sebagai customer, lalu pindah ke mode desainer -> rating dirinya sebagai customer TIDAK terlihat", async () => {
    // Order di mana dualModeUser adalah CUSTOMER
    const orderDual = await createTestOrder("COMPLETED", dualModeUser, designerUser);

    // Desainer menilai dualModeUser sebagai customer
    await ReviewService.createReview(
      {
        orderId: orderDual.id,
        rating: 3,
        comment: "Pembayaran tepat waktu tapi revisi berulang-ulang.",
      },
      { id: designerUser.id, activeRole: "DESIGNER" }
    );

    // dualModeUser sekarang sedang dalam mode DESIGNER
    // 1. Jika ia mencoba melihat reputasi customer DIRINYA SENDIRI -> WAJIB NULL!
    const selfReputation = await ReviewService.getCustomerReputationForDesigner(
      dualModeUser.id,
      { userId: dualModeUser.id, activeRole: "DESIGNER" }
    );
    expect(selfReputation).toBeNull();

    // 2. Namun jika ia melihat reputasi customer LAIN (customerUser) -> BISA MELIHAT
    const otherReputation = await ReviewService.getCustomerReputationForDesigner(
      customerUser.id,
      { userId: dualModeUser.id, activeRole: "DESIGNER" }
    );
    expect(otherReputation).toBeDefined();
    expect(otherReputation?.customerRatingAvg).toBeGreaterThanOrEqual(1.0);
    expect(otherReputation?.maskedName).toBe("Budi S.");
  });

  it("e) Rating sebagai desainer dan customer pada user dua-mode tidak tercampur di agregat", async () => {
    // 1. dualModeUser bertindak sebagai DESAINER (customerUser memberi rating 5)
    const orderAsDes = await createTestOrder("COMPLETED", customerUser, dualModeUser);
    await ReviewService.createReview(
      { orderId: orderAsDes.id, rating: 5, comment: "Karya desainer istimewa" },
      { id: customerUser.id, activeRole: "CUSTOMER" }
    );

    // 2. Periksa bahwa agregat User.customerRatingAvg dan DesignerProfile.ratingAvg TERPISAH
    const userCheck = await prisma.user.findUnique({
      where: { id: dualModeUser.id },
      include: { designerProfile: true },
    });

    // Reputasi sebagai Desainer (5.0)
    expect(userCheck?.designerProfile?.ratingAvg).toBe(5.0);
    expect(userCheck?.designerProfile?.ratingCount).toBe(1);

    // Reputasi sebagai Customer (3.0 dari test d)
    expect(userCheck?.customerRatingAvg).toBe(3.0);
    expect(userCheck?.customerRatingCount).toBe(1);
  });

  it("f) Admin menyembunyikan ulasan (HIDDEN) dan agregat langsung dihitung ulang secara atomik", async () => {
    const order = await createTestOrder("COMPLETED", customerUser, designerUser);

    const rev = await ReviewService.createReview(
      { orderId: order.id, rating: 5, comment: "Mantap 5 bintang admin test" },
      { id: customerUser.id, activeRole: "CUSTOMER" }
    );

    // Admin menyembunyikan review
    await ReviewService.setReviewStatusByAdmin(
      rev.id,
      "HIDDEN",
      "admin-user-id",
      "Komentar melanggar pedoman komunitas"
    );

    const hiddenRev = await prisma.review.findUnique({
      where: { id: rev.id },
    });
    expect(hiddenRev?.status).toBe("HIDDEN");
    expect(hiddenRev?.hiddenReason).toContain("Komentar melanggar pedoman");

    // Admin memulihkan review
    await ReviewService.setReviewStatusByAdmin(
      rev.id,
      "VISIBLE",
      "admin-user-id"
    );

    const restoredRev = await prisma.review.findUnique({
      where: { id: rev.id },
    });
    expect(restoredRev?.status).toBe("VISIBLE");
  });

  it("g) Edit review dalam jendela edit (berhasil) dan di luar jendela edit (ditolak)", async () => {
    const order = await createTestOrder("COMPLETED", customerUser, designerUser);

    const rev = await ReviewService.createReview(
      { orderId: order.id, rating: 4, comment: "Bagus awal" },
      { id: customerUser.id, activeRole: "CUSTOMER" }
    );

    // 1. Edit dalam jendela 24 jam -> Berhasil
    const updated = await ReviewService.updateReview(
      {
        reviewId: rev.id,
        rating: 5,
        comment: "Revisi: Ternyata sangat memuaskan setelah dicek",
      },
      customerUser.id
    );
    expect(updated.rating).toBe(5);
    expect(updated.comment).toContain("Revisi: Ternyata");

    // 2. Simulasikan ulasan dibuat 25 jam yang lalu (di luar jendela 24 jam)
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await prisma.review.update({
      where: { id: rev.id },
      data: { createdAt: twentyFiveHoursAgo },
    });

    // 3. Mencoba edit sekarang -> Harus ditolak
    await expect(
      ReviewService.updateReview(
        {
          reviewId: rev.id,
          rating: 3,
          comment: "Ubah lagi setelah expired",
        },
        customerUser.id
      )
    ).rejects.toThrow(`Batas waktu pengubahan ulasan (${REVIEW_EDIT_WINDOW_HOURS} jam) telah berakhir`);
  });

  it("h) Sanitasi input komentar dan masking nama", () => {
    // Sanitasi HTML
    const sanitized = ReviewService.sanitizeComment("<script>alert('xss')</script>Bagus!");
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).toBe("scriptalert('xss')/scriptBagus!");

    // Masking nama
    expect(ReviewService.maskName("Budi Santoso")).toBe("Budi S.");
    expect(ReviewService.maskName("Siti Rahmawati Putri")).toBe("Siti P.");
    expect(ReviewService.maskName("John")).toBe("Jo***");
    expect(ReviewService.maskName("")).toBe("Pengguna");
  });
});
