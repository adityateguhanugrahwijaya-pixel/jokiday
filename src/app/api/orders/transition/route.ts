import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { OrderStateMachine, OrderEvent } from "@/server/orders/order.state-machine";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const body = await req.json();
    const { orderId, event, extraData } = body;

    if (!orderId || !event) {
      throw new ValidationError("Parameter orderId dan event wajib diisi");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundError("Pesanan tidak ditemukan");
    }

    const isCustomer = order.customerId === session.userId;
    const isDesigner = order.designerId === session.userId;
    const isAdmin = Boolean(session.isAdmin);

    if (!isCustomer && !isDesigner && !isAdmin) {
      throw new ForbiddenError("Kamu tidak memiliki hak akses pada pesanan ini");
    }

    // Validasi izin peran untuk event tertentu
    const typedEvent = event as OrderEvent;
    if (typedEvent === "DELIVER_WORK" && !isDesigner) {
      throw new ForbiddenError("Hanya desainer yang dapat mengunggah hasil pekerjaan");
    }
    if ((typedEvent === "REQUEST_REVISION" || typedEvent === "APPROVE_DELIVERY") && !isCustomer) {
      throw new ForbiddenError("Hanya customer yang dapat meminta revisi atau menyetujui hasil");
    }
    if (typedEvent === "CANCEL_UNPAID" && !isCustomer && !isAdmin) {
      throw new ForbiddenError("Hanya customer atau admin yang dapat membatalkan pesanan yang belum dibayar");
    }
    if (
      (typedEvent === "RESOLVE_DISPUTE_RELEASE" ||
        typedEvent === "RESOLVE_DISPUTE_REFUND" ||
        typedEvent === "AUTO_REFUND_OVERDUE" ||
        typedEvent === "PAYMENT_RECEIVED") &&
      !isAdmin
    ) {
      throw new ForbiddenError("Hanya administrator yang dapat memicu tindakan ini secara manual");
    }

    const cleanReason = extraData?.reason ? sanitizeInput(String(extraData.reason)).slice(0, 500) : undefined;
    const cleanNote = extraData?.note ? sanitizeInput(String(extraData.note)).slice(0, 1000) : undefined;

    const actorRole = isAdmin ? "ADMIN" : isCustomer ? "CUSTOMER" : "DESIGNER";

    const updated = await OrderStateMachine.transitionOrder(
      orderId,
      typedEvent,
      { userId: session.userId, role: actorRole },
      { reason: cleanReason, note: cleanNote }
    );

    // Jika customer mengajukan revisi, kirim pesan otomatis ke chat thread dan buat notifikasi
    if (typedEvent === "REQUEST_REVISION" && cleanNote) {
      try {
        let thread = await prisma.chatThread.findFirst({
          where: {
            OR: [
              { orderId: order.id },
              {
                customerId: order.customerId,
                designerId: order.designerId,
              },
            ],
          },
        });

        if (!thread) {
          thread = await prisma.chatThread.create({
            data: {
              customerId: order.customerId,
              designerId: order.designerId,
              orderId: order.id,
              title: `Diskusi Order #${order.id.slice(0, 8)}`,
              lastMessage: `Catatan Revisi: "${cleanNote.slice(0, 50)}"`,
              lastMessageAt: new Date(),
            },
          });
        }

        const revisionMsgText = `📝 CATATAN REVISI PELANGGAN (Revisi ke-${updated.revisionsUsed}):\n\n"${cleanNote}"\n\nSilakan periksa detail revisi dan unggah hasil penyesuaian melalui halaman pesanan.`;

        await prisma.message.create({
          data: {
            threadId: thread.id,
            senderId: session.userId,
            type: "TEXT",
            body: revisionMsgText,
          },
        });

        await prisma.chatThread.update({
          where: { id: thread.id },
          data: {
            lastMessage: `Catatan Revisi ke-${updated.revisionsUsed}: ${cleanNote.slice(0, 80)}`,
            lastMessageAt: new Date(),
          },
        });

        // Kirim in-app notifikasi ke desainer
        await prisma.notification.create({
          data: {
            userId: order.designerId,
            type: "ORDER_REVISION_REQUESTED",
            payload: JSON.stringify({
              orderId: order.id,
              round: updated.revisionsUsed,
              note: cleanNote,
            }),
          },
        });
      } catch (chatErr) {
        console.error("[Transition] Gagal mengirim pesan chat catatan revisi:", chatErr);
      }
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
