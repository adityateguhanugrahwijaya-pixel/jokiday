import { prisma } from "@/lib/db";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { LedgerService } from "../ledger/ledger.service";

export type OrderEvent =
  | "PAYMENT_RECEIVED"
  | "CANCEL_UNPAID"
  | "DELIVER_WORK"
  | "REQUEST_REVISION"
  | "APPROVE_DELIVERY"
  | "OPEN_DISPUTE"
  | "RESOLVE_DISPUTE_RELEASE"
  | "RESOLVE_DISPUTE_REFUND"
  | "AUTO_REFUND_OVERDUE";

export interface ActorContext {
  userId: string;
  role: "CUSTOMER" | "DESIGNER" | "ADMIN" | "SYSTEM";
}

export class OrderStateMachine {
  /**
   * Transisi status order terpusat.
   * Memvalidasi transisi yang diizinkan, memperbarui kolom terkait, menulis audit log,
   * dan mencatat jurnal uang jika transisi menyentuh status final uang.
   */
  static async transitionOrder(
    orderId: string,
    event: OrderEvent,
    actor: ActorContext,
    extraData?: {
      reason?: string;
      note?: string;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          designer: true,
        },
      });

      if (!order) {
        throw new NotFoundError(`Order ${orderId} tidak ditemukan`);
      }

      const currentStatus = order.status;
      let nextStatus = currentStatus;
      const now = new Date();
      const updatePayload: Record<string, unknown> = {};

      switch (event) {
        case "PAYMENT_RECEIVED": {
          if (currentStatus !== "AWAITING_PAYMENT") {
            throw new ConflictError(
              `Tidak dapat memproses pembayaran untuk order dalam status ${currentStatus}`
            );
          }
          nextStatus = "IN_PROGRESS";
          const deadlineDate = new Date(now.getTime() + order.durationDays * 24 * 60 * 60 * 1000);
          updatePayload.paidAt = now;
          updatePayload.deadlineAt = deadlineDate;
          break;
        }

        case "CANCEL_UNPAID": {
          if (currentStatus !== "AWAITING_PAYMENT") {
            throw new ConflictError(
              `Hanya order dalam status AWAITING_PAYMENT yang bisa dibatalkan`
            );
          }
          nextStatus = "CANCELLED";
          updatePayload.cancelledReason = extraData?.reason || "Dibatalkan oleh user atau kedaluwarsa";
          break;
        }

        case "DELIVER_WORK": {
          if (currentStatus !== "IN_PROGRESS" && currentStatus !== "REVISION") {
            throw new ConflictError(
              `Pengiriman hasil hanya bisa dilakukan saat order sedang dikerjakan atau dalam revisi`
            );
          }
          nextStatus = "AWAITING_APPROVAL";
          updatePayload.deliveredAt = now;
          // Auto approve setelah 3 hari jika customer tidak merespons
          updatePayload.autoApproveAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
          break;
        }

        case "REQUEST_REVISION": {
          if (currentStatus !== "AWAITING_APPROVAL") {
            throw new ConflictError(
              `Permintaan revisi hanya dapat diajukan saat order menunggu persetujuan`
            );
          }
          if (order.revisionsUsed >= order.revisionQuota) {
            throw new ConflictError(
              `Kuota revisi (${order.revisionQuota}x) telah habis`
            );
          }
          nextStatus = "REVISION";
          updatePayload.revisionsUsed = order.revisionsUsed + 1;
          updatePayload.autoApproveAt = null;
          break;
        }

        case "APPROVE_DELIVERY": {
          if (currentStatus !== "AWAITING_APPROVAL") {
            throw new ConflictError(
              `Hanya order dalam status AWAITING_APPROVAL yang dapat disetujui`
            );
          }
          nextStatus = "COMPLETED";
          updatePayload.completedAt = now;

          // Catat pelepasan dana escrow ke designer di Ledger Service
          await LedgerService.recordOrderCompleted(
            order.id,
            order.designerId,
            order.price,
            `complete-order-${order.id}`,
            tx as any
          );
          break;
        }

        case "OPEN_DISPUTE": {
          if (
            currentStatus !== "IN_PROGRESS" &&
            currentStatus !== "AWAITING_APPROVAL" &&
            currentStatus !== "REVISION"
          ) {
            throw new ConflictError(
              `Dispute hanya bisa dibuka pada order yang aktif`
            );
          }
          nextStatus = "DISPUTED";
          break;
        }

        case "RESOLVE_DISPUTE_RELEASE": {
          if (currentStatus !== "DISPUTED") {
            throw new ConflictError(
              `Hanya order dengan status DISPUTED yang dapat diselesaikan`
            );
          }
          nextStatus = "COMPLETED";
          updatePayload.completedAt = now;

          await LedgerService.recordOrderCompleted(
            order.id,
            order.designerId,
            order.price,
            `dispute-release-${order.id}`,
            tx as any
          );
          break;
        }

        case "RESOLVE_DISPUTE_REFUND": {
          if (currentStatus !== "DISPUTED") {
            throw new ConflictError(
              `Hanya order dengan status DISPUTED yang dapat diselesaikan`
            );
          }
          nextStatus = "REFUNDED";
          updatePayload.completedAt = now;

          await LedgerService.recordOrderRefundFull(
            order.id,
            order.customerId,
            order.price,
            `dispute-refund-${order.id}`,
            tx as any
          );
          break;
        }

        case "AUTO_REFUND_OVERDUE": {
          if (currentStatus !== "IN_PROGRESS" && currentStatus !== "REVISION") {
            throw new ConflictError(
              `Auto-refund overdue hanya berlaku untuk order yang belum dikirim`
            );
          }
          nextStatus = "REFUNDED";
          updatePayload.completedAt = now;
          updatePayload.cancelledReason = "Designer melewati batas waktu pengerjaan dan toleransi 24 jam";

          await LedgerService.recordOrderRefundFull(
            order.id,
            order.customerId,
            order.price,
            `auto-refund-overdue-${order.id}`,
            tx as any
          );
          break;
        }

        default:
          throw new AppError(`Event transisi tidak dikenali: ${event}`, "INVALID_EVENT", 400);
      }

      updatePayload.status = nextStatus;

      // Update Order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: updatePayload,
      });

      // Catat Audit Log
      await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: `ORDER_TRANSITION_${event}`,
          entity: "order",
          entityId: orderId,
          before: JSON.stringify({ status: currentStatus }),
          after: JSON.stringify({ status: nextStatus, ...updatePayload }),
        },
      });

      return updatedOrder;
    });
  }
}
