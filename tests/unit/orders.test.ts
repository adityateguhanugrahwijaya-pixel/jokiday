import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../../src/lib/db";
import { OfferService } from "../../src/server/offers/offer.service";
import { OrderStateMachine } from "../../src/server/orders/order.state-machine";
import { LedgerService } from "../../src/server/ledger/ledger.service";

describe("Offer & Order State Machine", () => {
  let customerId: string;
  let designer1Id: string;
  let designer2Id: string;

  beforeEach(async () => {
    await prisma.ledgerEntry.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.offer.deleteMany({});
    await prisma.brief.deleteMany({});
    await prisma.designerProfile.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ["cust@test.com", "des1@test.com", "des2@test.com"] } },
    });

    // Buat customer & 2 desainer
    const customer = await prisma.user.create({
      data: {
        email: "cust@test.com",
        passwordHash: "hash",
        displayName: "Customer Test",
        activeRole: "CUSTOMER",
      },
    });
    customerId = customer.id;

    const designer1 = await prisma.user.create({
      data: {
        email: "des1@test.com",
        passwordHash: "hash",
        displayName: "Designer One",
        isDesigner: true,
        activeRole: "DESIGNER",
        designerProfile: { create: { bio: "Bio 1" } },
      },
    });
    designer1Id = designer1.id;

    const designer2 = await prisma.user.create({
      data: {
        email: "des2@test.com",
        passwordHash: "hash",
        displayName: "Designer Two",
        isDesigner: true,
        activeRole: "DESIGNER",
        designerProfile: { create: { bio: "Bio 2" } },
      },
    });
    designer2Id = designer2.id;
  });

  it("creates a brief and allows designers to submit offers with auto-incrementing versions", async () => {
    const brief = await OfferService.createBrief({
      customerId,
      mode: "MARKET",
      title: "Desain Logo Kedai Kopi",
      description: "Logo minimalis modern untuk coffee shop",
      category: "logo",
    });

    const offer1 = await OfferService.createOffer({
      briefId: brief.id,
      designerId: designer1Id,
      price: 150000,
      durationDays: 3,
      revisionQuota: 2,
      deliverables: ["logo.png", "logo.svg"],
    });

    expect(offer1.version).toBe(1);
    expect(offer1.status).toBe("PENDING");

    // Revisi offer oleh desainer 1 (tawar menawar)
    const offer1Rev = await OfferService.createOffer({
      briefId: brief.id,
      designerId: designer1Id,
      price: 130000,
      durationDays: 3,
      revisionQuota: 2,
      deliverables: ["logo.png", "logo.svg"],
      note: "Harga khusus diskon",
    });

    expect(offer1Rev.version).toBe(2);

    const oldOffer = await prisma.offer.findUnique({ where: { id: offer1.id } });
    expect(oldOffer?.status).toBe("SUPERSEDED");
  });

  it("accepts an offer, locks contract snapshot, and declines competing offers", async () => {
    const brief = await OfferService.createBrief({
      customerId,
      mode: "MARKET",
      title: "Desain Banner Promosi",
      description: "Banner untuk feed Instagram",
      category: "poster",
    });

    const offer1 = await OfferService.createOffer({
      briefId: brief.id,
      designerId: designer1Id,
      price: 100000,
      durationDays: 2,
      revisionQuota: 2,
      deliverables: ["banner.jpg"],
    });

    const offer2 = await OfferService.createOffer({
      briefId: brief.id,
      designerId: designer2Id,
      price: 90000,
      durationDays: 2,
      revisionQuota: 1,
      deliverables: ["banner.png"],
    });

    // Customer terima offer 1
    const order = await OfferService.acceptOffer(offer1.id, customerId);

    expect(order.status).toBe("AWAITING_PAYMENT");
    expect(order.price).toBe(100000);
    expect(order.fee).toBe(5000); // 5%
    expect(order.designerNet).toBe(95000);

    const acceptedOffer = await prisma.offer.findUnique({ where: { id: offer1.id } });
    expect(acceptedOffer?.status).toBe("ACCEPTED");

    const declinedOffer = await prisma.offer.findUnique({ where: { id: offer2.id } });
    expect(declinedOffer?.status).toBe("DECLINED");

    const updatedBrief = await prisma.brief.findUnique({ where: { id: brief.id } });
    expect(updatedBrief?.status).toBe("CLAIMED");
  });

  it("walks through complete order lifecycle from payment to approval with ledger credit", async () => {
    const brief = await OfferService.createBrief({
      customerId,
      mode: "DIRECT",
      targetDesignerId: designer1Id,
      title: "Desain Maskot",
      description: "Maskot kucing lucu",
      category: "ilustrasi",
    });

    const offer = await OfferService.createOffer({
      briefId: brief.id,
      designerId: designer1Id,
      price: 50000,
      durationDays: 2,
      revisionQuota: 1,
      deliverables: ["maskot.png"],
    });

    const order = await OfferService.acceptOffer(offer.id, customerId);

    // 1. Bayar via payment gateway
    await LedgerService.recordCustomerPayment(order.id, 50000, "pay-" + order.id);
    const inProgressOrder = await OrderStateMachine.transitionOrder(
      order.id,
      "PAYMENT_RECEIVED",
      { userId: customerId, role: "CUSTOMER" }
    );
    expect(inProgressOrder.status).toBe("IN_PROGRESS");
    expect(inProgressOrder.deadlineAt).not.toBeNull();

    // 2. Designer Deliver
    const awaitingApprovalOrder = await OrderStateMachine.transitionOrder(
      order.id,
      "DELIVER_WORK",
      { userId: designer1Id, role: "DESIGNER" }
    );
    expect(awaitingApprovalOrder.status).toBe("AWAITING_APPROVAL");

    // 3. Customer minta revisi
    const revisionOrder = await OrderStateMachine.transitionOrder(
      order.id,
      "REQUEST_REVISION",
      { userId: customerId, role: "CUSTOMER" }
    );
    expect(revisionOrder.status).toBe("REVISION");
    expect(revisionOrder.revisionsUsed).toBe(1);

    // 4. Designer kirim deliver ulang
    const reDeliveredOrder = await OrderStateMachine.transitionOrder(
      order.id,
      "DELIVER_WORK",
      { userId: designer1Id, role: "DESIGNER" }
    );
    expect(reDeliveredOrder.status).toBe("AWAITING_APPROVAL");

    // 5. Customer setujui (APPROVE_DELIVERY) -> COMPLETED & rilis dana 47.500 ke designer
    const completedOrder = await OrderStateMachine.transitionOrder(
      order.id,
      "APPROVE_DELIVERY",
      { userId: customerId, role: "CUSTOMER" }
    );
    expect(completedOrder.status).toBe("COMPLETED");

    // Verifikasi saldo designer
    const designerBalance = await LedgerService.getAvailableBalance(designer1Id);
    expect(designerBalance).toBe(47500);
  });

  afterAll(async () => {
    await prisma.ledgerEntry.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.offer.deleteMany({});
    await prisma.brief.deleteMany({});
    await prisma.designerProfile.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ["cust@test.com", "des1@test.com", "des2@test.com"] } },
    });
  });
});
