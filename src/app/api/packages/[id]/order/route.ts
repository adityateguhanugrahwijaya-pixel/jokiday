import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { handleApiError, UnauthorizedError, NotFoundError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk memesan paket ini");
    }

    const pkg = await prisma.servicePackage.findUnique({
      where: { id: params.id },
      include: {
        designer: {
          include: { user: true },
        },
      },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundError("Paket jasa tidak ditemukan atau sudah tidak aktif");
    }

    if (pkg.designerId === session.userId) {
      throw new ValidationError("Kamu tidak dapat memesan paket jasamu sendiri");
    }

    const customer = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!customer) {
      throw new UnauthorizedError("Pengguna tidak ditemukan");
    }

    // Buat Brief langsung, Offer terkonfirmasi, dan Order dalam satu transaksi
    const order = await prisma.$transaction(async (tx) => {
      // 1. Buat brief direct
      const brief = await tx.brief.create({
        data: {
          customerId: customer.id,
          mode: "DIRECT",
          targetDesignerId: pkg.designerId,
          title: `[Paket] ${pkg.title}`,
          description: pkg.description,
          category: pkg.category,
          revisionQuota: pkg.revisionQuota,
          desiredDeadlineDays: pkg.durationDays,
          budgetHint: pkg.price,
          status: "CLAIMED",
        },
      });

      // 2. Buat penawaran resmi dari desainer untuk paket ini
      const offer = await tx.offer.create({
        data: {
          briefId: brief.id,
          designerId: pkg.designerId,
          price: pkg.price,
          durationDays: pkg.durationDays,
          revisionQuota: pkg.revisionQuota,
          deliverables: pkg.deliverables,
          note: `Pemesanan paket jasa: ${pkg.title}`,
          status: "ACCEPTED",
          version: 1,
        },
      });

      // 3. Hitung potongan platform fee 5%
      const { fee, designerNet } = LedgerService.calculatePlatformFee(pkg.price);

      // Snapshot kontrak
      const contractSnapshot = {
        packageId: pkg.id,
        packageTitle: pkg.title,
        briefTitle: brief.title,
        price: pkg.price,
        fee,
        designerNet,
        durationDays: pkg.durationDays,
        revisionQuota: pkg.revisionQuota,
        deliverables: JSON.parse(pkg.deliverables || "[]"),
        designerName: pkg.designer.user.displayName,
        customerName: customer.displayName,
        orderedAt: new Date().toISOString(),
      };

      // 4. Buat Order berstatus AWAITING_PAYMENT (24 jam batas bayar)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const createdOrder = await tx.order.create({
        data: {
          briefId: brief.id,
          offerId: offer.id,
          customerId: customer.id,
          designerId: pkg.designerId,
          status: "AWAITING_PAYMENT",
          price: pkg.price,
          fee,
          designerNet,
          durationDays: pkg.durationDays,
          revisionQuota: pkg.revisionQuota,
          deliverables: pkg.deliverables,
          contractSnapshot: JSON.stringify(contractSnapshot),
          paymentExpiresAt: expiresAt,
        },
      });

      // 5. Kirimkan pesan obrolan awal ke thread chat
      await tx.message.create({
        data: {
          threadId: `order_${createdOrder.id}`,
          senderId: customer.id,
          type: "TEXT",
          body: `Halo kak ${pkg.designer.user.displayName}! Saya memesan paket "${pkg.title}". Mohon konfirmasi jadwal dan arahannya.`,
        },
      });

      return createdOrder;
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      message: "Pesanan berhasil dibuat, silakan lanjutkan pembayaran dan koordinasi dengan desainer.",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
