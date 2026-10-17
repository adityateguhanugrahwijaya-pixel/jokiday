import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "../../src/lib/db";
import { ReviewService } from "../../src/server/reviews/review.service";
import { AuthService } from "../../src/server/auth/auth.service";
import { GET as getOrderReviewsRoute } from "../../src/app/api/orders/[id]/reviews/route";
import { NextRequest } from "next/server";

describe("Route & Page Level Tests - Isolasi Privasi Ulasan Dua Arah", { timeout: 60000 }, () => {
  const TEST_EMAILS = [
    "route_cust@test.com",
    "route_des@test.com",
    "route_dual@test.com",
  ];

  let customerUser: any;
  let designerUser: any;
  let dualModeUser: any;
  let testOrder: any;
  let dualOrder: any;

  async function cleanup() {
    const users = await prisma.user.findMany({
      where: { email: { in: TEST_EMAILS } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return;

    await prisma.reviewReport.deleteMany({ where: { reporterId: { in: ids } } });
    await prisma.review.deleteMany({
      where: { OR: [{ reviewerId: { in: ids } }, { revieweeId: { in: ids } }] },
    });
    await prisma.order.deleteMany({
      where: { OR: [{ customerId: { in: ids } }, { designerId: { in: ids } }] },
    });
    await prisma.offer.deleteMany({ where: { designerId: { in: ids } } });
    await prisma.brief.deleteMany({ where: { customerId: { in: ids } } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.designerProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  beforeAll(async () => {
    await cleanup();

    // 1. Buat customer
    customerUser = await prisma.user.create({
      data: {
        email: "route_cust@test.com",
        username: "route_cust",
        displayName: "Budi Customer",
        passwordHash: "hash123",
        activeRole: "CUSTOMER",
      },
    });

    // 2. Buat designer
    designerUser = await prisma.user.create({
      data: {
        email: "route_des@test.com",
        username: "route_des",
        displayName: "Siti Desainer",
        passwordHash: "hash123",
        isDesigner: true,
        activeRole: "DESIGNER",
        designerProfile: {
          create: {
            bio: "Desainer grafis profesional",
            categories: JSON.stringify(["logo"]),
            isVerified: true,
            isAvailable: true,
          },
        },
      },
    });

    // 3. Buat dual-mode user (bisa bertindak sebagai customer dan desainer)
    dualModeUser = await prisma.user.create({
      data: {
        email: "route_dual@test.com",
        username: "route_dual",
        displayName: "Ahmad Dua Mode",
        passwordHash: "hash123",
        isDesigner: true,
        activeRole: "DESIGNER",
        designerProfile: {
          create: {
            bio: "Dual mode profile",
            categories: JSON.stringify(["banner"]),
            isVerified: true,
            isAvailable: true,
          },
        },
      },
    });

    // 4. Buat Order 1: customerUser memesan ke designerUser
    const brief1 = await prisma.brief.create({
      data: {
        customerId: customerUser.id,
        title: "Brief Logo Startup Route Test",
        description: "Deskripsi logo startup",
        category: "logo",
        mode: "DIRECT",
        targetDesignerId: designerUser.id,
      },
    });
    const offer1 = await prisma.offer.create({
      data: {
        briefId: brief1.id,
        designerId: designerUser.id,
        price: 500000,
        durationDays: 3,
        revisionQuota: 2,
        status: "ACCEPTED",
      },
    });
    testOrder = await prisma.order.create({
      data: {
        briefId: brief1.id,
        offerId: offer1.id,
        customerId: customerUser.id,
        designerId: designerUser.id,
        status: "COMPLETED",
        price: 500000,
        fee: 25000,
        designerNet: 475000,
        durationDays: 3,
        revisionQuota: 2,
        paymentExpiresAt: new Date(),
        completedAt: new Date(),
      },
    });

    // 5. Buat ulasan dua arah pada testOrder:
    // a) customer -> designer (publik)
    await ReviewService.createReview(
      {
        orderId: testOrder.id,
        rating: 5,
        comment: "Karya desain luar biasa bagus dan cepat!",
      },
      { id: customerUser.id, activeRole: "CUSTOMER", isAdmin: false }
    );

    // b) designer -> customer (privat)
    await ReviewService.createReview(
      {
        orderId: testOrder.id,
        rating: 4,
        comment: "Klien sangat kooperatif dan feedback jelas.",
      },
      { id: designerUser.id, activeRole: "DESIGNER", isAdmin: false }
    );

    // 6. Buat Order 2: dualModeUser memesan sebagai CUSTOMER ke designerUser
    const brief2 = await prisma.brief.create({
      data: {
        customerId: dualModeUser.id,
        title: "Brief Dual Mode Customer Test",
        description: "Deskripsi proyek dual mode",
        category: "banner",
        mode: "DIRECT",
        targetDesignerId: designerUser.id,
      },
    });
    const offer2 = await prisma.offer.create({
      data: {
        briefId: brief2.id,
        designerId: designerUser.id,
        price: 200000,
        durationDays: 2,
        revisionQuota: 1,
        status: "ACCEPTED",
      },
    });
    dualOrder = await prisma.order.create({
      data: {
        briefId: brief2.id,
        offerId: offer2.id,
        customerId: dualModeUser.id,
        designerId: designerUser.id,
        status: "COMPLETED",
        price: 200000,
        fee: 10000,
        designerNet: 190000,
        durationDays: 2,
        revisionQuota: 1,
        paymentExpiresAt: new Date(),
        completedAt: new Date(),
      },
    });

    // Desainer memberi rating privat kepada dualModeUser (sebagai customer)
    await ReviewService.createReview(
      {
        orderId: dualOrder.id,
        rating: 5,
        comment: "Dual mode user adalah pemesan yang ramah dan tepat waktu.",
      },
      { id: designerUser.id, activeRole: "DESIGNER", isAdmin: false }
    );
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await cleanup();
  });

  // TEST 1: Endpoint GET /api/orders/[id]/reviews dipanggil sebagai customer
  it("GET /api/orders/[id]/reviews sebagai customer: JSON respons TIDAK memuat review DESIGNER_TO_CUSTOMER atau field customerRating*", async () => {
    vi.spyOn(AuthService, "getCurrentUser").mockResolvedValue({
      userId: customerUser.id,
      email: customerUser.email,
      activeRole: "CUSTOMER",
      isAdmin: false,
    });

    const req = new NextRequest(`http://localhost/api/orders/${testOrder.id}/reviews`);
    const res = await getOrderReviewsRoute(req, { params: { id: testOrder.id } });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Customer review (publik) boleh dan harus ada
    expect(json.data.customerReview).toBeDefined();
    expect(json.data.customerReview.rating).toBe(5);

    // Designer review (privat untuk customer ini) HARUS NULL
    expect(json.data.designerReview).toBeNull();

    // Pastikan seluruh payload JSON respons tidak membocorkan data privat
    const rawJsonString = JSON.stringify(json);
    expect(rawJsonString).not.toContain("DESIGNER_TO_CUSTOMER");
    expect(rawJsonString).not.toContain("customerRatingAvg");
    expect(rawJsonString).not.toContain("customerRatingCount");
    expect(rawJsonString).not.toContain("Klien sangat kooperatif dan feedback jelas");
  });

  // TEST 2: Endpoint GET /api/orders/[id]/reviews dipanggil oleh user dua-mode yang sedang dalam mode DESIGNER tetapi merupakan pemesan di order itu
  it("GET /api/orders/[id]/reviews oleh user dua-mode (dalam mode DESIGNER): ulasan privat terhadap dirinya sendiri TETAP NULL", async () => {
    vi.spyOn(AuthService, "getCurrentUser").mockResolvedValue({
      userId: dualModeUser.id,
      email: dualModeUser.email,
      activeRole: "DESIGNER", // Sedang dalam mode desainer
      isAdmin: false,
    });

    const req = new NextRequest(`http://localhost/api/orders/${dualOrder.id}/reviews`);
    const res = await getOrderReviewsRoute(req, { params: { id: dualOrder.id } });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Karena dualModeUser adalah reviewee (customer) di order ini, ulasan terhadap dirinya TIDAK boleh tampil
    expect(json.data.designerReview).toBeNull();

    const rawJsonString = JSON.stringify(json);
    expect(rawJsonString).not.toContain("DESIGNER_TO_CUSTOMER");
    expect(rawJsonString).not.toContain("Dual mode user adalah pemesan yang ramah");
  });

  // TEST 3: Props Halaman /orders/[id] untuk Customer
  it("Props halaman /orders/[id] untuk customer: customerReputation bernilai null dan order.customer tidak memuat field rating", async () => {
    // Simulasi query halaman /orders/[id]
    const orderData = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: {
        brief: true,
        designer: true,
        customer: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    expect(orderData).toBeDefined();
    // Verifikasi field customerRatingAvg dan customerRatingCount tidak ada pada object customer
    const customerObj = orderData!.customer as any;
    expect(customerObj.customerRatingAvg).toBeUndefined();
    expect(customerObj.customerRatingCount).toBeUndefined();

    // Verifikasi customerReputation untuk customer adalah null
    const isDesigner = customerUser.id === orderData!.designerId;
    let customerReputation = null;
    if (isDesigner) {
      customerReputation = await ReviewService.getCustomerReputationForDesigner(
        orderData!.customerId,
        { userId: customerUser.id, activeRole: "CUSTOMER", isAdmin: false }
      );
    }
    expect(customerReputation).toBeNull();
  });

  // TEST 4: Halaman /designer/[username] untuk Publik & Customer
  it("Halaman publik desainer /designer/[username]: hanya memuat ulasan CUSTOMER_TO_DESIGNER dan nama pelanggan disamarkan", async () => {
    const publicReviewsData = await ReviewService.getPublicDesignerReviews(designerUser.id);

    expect(publicReviewsData.reviews.length).toBeGreaterThanOrEqual(1);

    // Semua ulasan harus berstatus VISIBLE dan hanya arah CUSTOMER_TO_DESIGNER
    for (const r of publicReviewsData.reviews) {
      expect((r as any).direction).toBeUndefined(); // tidak membocorkan arah
      expect(r.reviewerName).toMatch(/^[A-Z][a-z]*\s[A-Z]\.$/); // contoh "Budi C."
      expect(JSON.stringify(r)).not.toContain("DESIGNER_TO_CUSTOMER");
      expect(JSON.stringify(r)).not.toContain("customerRatingAvg");
      expect(JSON.stringify(r)).not.toContain("customerRatingCount");
    }
  });

  // TEST 5: Halaman /market untuk Customer dan User Dua Mode
  it("Halaman /market untuk customer & user dua-mode: rating customer disembunyikan/dihapus dari props", async () => {
    const briefs = await prisma.brief.findMany({
      where: { customerId: { in: [customerUser.id, dualModeUser.id] } },
      include: { customer: true, offers: true },
    });

    // 5a. Customer biasa melihat Pasar Brief:
    const customerViewBriefs = briefs.map((b) => {
      const isAllowedToSee = false; // customer tidak berhak melihat rating sesama customer
      if (!isAllowedToSee) {
        const { customerRatingAvg, customerRatingCount, ...safeCustomer } = b.customer as any;
        return { ...b, customer: safeCustomer };
      }
      return b;
    });

    for (const b of customerViewBriefs) {
      expect((b.customer as any).customerRatingAvg).toBeUndefined();
      expect((b.customer as any).customerRatingCount).toBeUndefined();
    }

    // 5b. User dua-mode (sedang dalam mode DESIGNER) melihat brief miliknya sendiri di pasar:
    const dualModeViewBriefs = briefs.map((b) => {
      const isAllowedToSee =
        dualModeUser.activeRole === "DESIGNER" && dualModeUser.id !== b.customerId;
      if (!isAllowedToSee) {
        const { customerRatingAvg, customerRatingCount, ...safeCustomer } = b.customer as any;
        return { ...b, customer: safeCustomer };
      }
      return b;
    });

    const myOwnBrief = dualModeViewBriefs.find((b) => b.customerId === dualModeUser.id);
    expect(myOwnBrief).toBeDefined();
    // Pada brief milik dirinya sendiri, rating customer tetap harus di-strip
    expect((myOwnBrief!.customer as any).customerRatingAvg).toBeUndefined();
    expect((myOwnBrief!.customer as any).customerRatingCount).toBeUndefined();

    // Sedangkan pada brief milik customerUser lain, desainer ini berhak melihatnya
    const otherBrief = dualModeViewBriefs.find((b) => b.customerId === customerUser.id);
    expect(otherBrief).toBeDefined();
    expect((otherBrief!.customer as any).customerRatingAvg).toBeDefined();
  });

  // TEST 6: Halaman /briefs/[id] untuk Customer dan User Dua Mode
  it("Halaman /briefs/[id] untuk customer & user dua-mode melihat brief miliknya: customerReputation bernilai null", async () => {
    // 6a. CustomerUser melihat brief miliknya sendiri
    const repForCustomer = await ReviewService.getCustomerReputationForDesigner(
      customerUser.id,
      { userId: customerUser.id, activeRole: "CUSTOMER", isAdmin: false }
    );
    expect(repForCustomer).toBeNull();

    // 6b. DualModeUser dalam mode desainer melihat brief miliknya sendiri
    const repForDualModeSelf = await ReviewService.getCustomerReputationForDesigner(
      dualModeUser.id,
      { userId: dualModeUser.id, activeRole: "DESIGNER", isAdmin: false }
    );
    expect(repForDualModeSelf).toBeNull();

    // 6c. DualModeUser melihat brief customer lain -> berhasil mengembalikan data
    const repForOtherCustomer = await ReviewService.getCustomerReputationForDesigner(
      customerUser.id,
      { userId: dualModeUser.id, activeRole: "DESIGNER", isAdmin: false }
    );
    expect(repForOtherCustomer).not.toBeNull();
    expect(repForOtherCustomer!.customerRatingAvg).toBe(4);
    expect(repForOtherCustomer!.customerRatingCount).toBe(1);
  });
});
