/**
 * Helper terpusat untuk perhitungan durasi, timer, dan status akhir order.
 * Semua perhitungan waktu berbasis UTC di backend dan ditampilkan dalam zona waktu WIB (Asia/Jakarta).
 */

export type OrderTimerType = "ACTIVE" | "COMPLETED" | "CANCELLED_OR_FAILED" | "AWAITING_PAYMENT";

export interface OrderTimerData {
  status: string;
  startedAt?: Date | string | null;
  paidAt?: Date | string | null;
  deadlineAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  completedAt?: Date | string | null;
  endedAt?: Date | string | null;
  endedReason?: string | null;
  cancelledReason?: string | null;
  paymentExpiresAt?: Date | string | null;
  createdAt: Date | string;
}

export interface OrderTimerInfo {
  type: OrderTimerType;
  badgeLabel: string;
  badgeVariant: "info" | "warning" | "success" | "danger" | "neutral";
  
  // Status Aktif
  isOverdue?: boolean;
  isUrgent?: boolean;
  timeRemainingText?: string;

  // Status Selesai
  startTimeFormatted?: string;
  endTimeFormatted?: string;
  durationFormatted?: string;
  deadlineDiffText?: string;
  isCompletedLate?: boolean;

  // Status Batal / Gagal
  stoppedAtFormatted?: string;
  endedReasonText?: string;
}

/**
 * Format durasi konsisten dalam bahasa Indonesia:
 * - "25 menit"
 * - "2 jam 15 menit"
 * - "1 hari 3 jam"
 */
export function formatDurationMs(ms: number): string {
  if (isNaN(ms) || ms <= 0) return "< 1 menit";

  const totalMinutes = Math.floor(ms / (1000 * 60));
  if (totalMinutes === 0) return "< 1 menit";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    if (remainingHours > 0) {
      return `${days} hari ${remainingHours} jam`;
    }
    return `${days} hari`;
  }

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} jam ${minutes} menit`;
    }
    return `${hours} jam`;
  }

  return `${minutes} menit`;
}

/**
 * Format tanggal dan jam dalam zona waktu WIB (Asia/Jakarta):
 * Contoh: "13 Okt 2026, 17.16 WIB"
 */
export function formatDateTimeWIB(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  const datePart = d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const timePart = d.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(":", ".");

  return `${datePart}, ${timePart} WIB`;
}

/**
 * Perhitungan informasi timer dan durasi order secara deterministik.
 */
export function getOrderTimerInfo(order: OrderTimerData, nowMs = Date.now()): OrderTimerInfo {
  const status = order.status;

  // 1. STATUS SELESAI (COMPLETED)
  if (status === "COMPLETED") {
    const start = order.startedAt || order.paidAt || order.createdAt;
    const end = order.endedAt || order.completedAt;

    const startTimeFormatted = formatDateTimeWIB(start);
    const endTimeFormatted = formatDateTimeWIB(end);

    let durationFormatted = "-";
    if (start && end) {
      const startMs = new Date(start).getTime();
      const endMs = new Date(end).getTime();
      if (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs) {
        durationFormatted = formatDurationMs(endMs - startMs);
      }
    }

    let deadlineDiffText = "-";
    let isCompletedLate = false;

    if (order.deadlineAt && end) {
      const deadlineMs = new Date(order.deadlineAt).getTime();
      const endMs = new Date(end).getTime();

      if (!isNaN(deadlineMs) && !isNaN(endMs)) {
        const diffMs = deadlineMs - endMs;
        if (diffMs >= 0) {
          isCompletedLate = false;
          if (diffMs < 60000) {
            deadlineDiffText = "Selesai tepat waktu";
          } else {
            deadlineDiffText = `Selesai ${formatDurationMs(diffMs)} lebih cepat`;
          }
        } else {
          isCompletedLate = true;
          deadlineDiffText = `Selesai telat ${formatDurationMs(Math.abs(diffMs))}`;
        }
      }
    }

    return {
      type: "COMPLETED",
      badgeLabel: isCompletedLate ? (deadlineDiffText !== "-" ? deadlineDiffText : "Selesai (Telat)") : (deadlineDiffText !== "-" ? deadlineDiffText : "Selesai"),
      badgeVariant: isCompletedLate ? "danger" : "success",
      startTimeFormatted,
      endTimeFormatted,
      durationFormatted,
      deadlineDiffText,
      isCompletedLate,
    };
  }

  // 2. STATUS BATAL / GAGAL (CANCELLED / REFUNDED)
  if (status === "CANCELLED" || status === "REFUNDED") {
    const stoppedAt = order.endedAt || order.completedAt || order.createdAt;
    const stoppedAtFormatted = formatDateTimeWIB(stoppedAt);

    let label = "Dibatalkan";
    if (order.endedReason === "FAILED") {
      label = "Gagal";
    } else if (status === "REFUNDED") {
      label = "Refund";
    }

    const badgeLabel = stoppedAtFormatted !== "-" ? `${label} (${stoppedAtFormatted})` : label;

    return {
      type: "CANCELLED_OR_FAILED",
      badgeLabel,
      badgeVariant: "neutral",
      stoppedAtFormatted,
      endedReasonText: order.cancelledReason || undefined,
    };
  }

  // 3. STATUS MENUNGGU PEMBAYARAN (AWAITING_PAYMENT)
  if (status === "AWAITING_PAYMENT") {
    if (order.paymentExpiresAt) {
      const expireMs = new Date(order.paymentExpiresAt).getTime();
      const diffMs = expireMs - nowMs;

      if (!isNaN(expireMs) && diffMs > 0) {
        return {
          type: "AWAITING_PAYMENT",
          badgeLabel: `Batas bayar: ${formatDurationMs(diffMs)}`,
          badgeVariant: diffMs <= 3600000 ? "danger" : "warning",
          isUrgent: diffMs <= 3600000,
          timeRemainingText: `Sisa waktu bayar: ${formatDurationMs(diffMs)}`,
        };
      }
    }
    return {
      type: "AWAITING_PAYMENT",
      badgeLabel: "Menunggu Pembayaran",
      badgeVariant: "warning",
      timeRemainingText: "Menunggu pembayaran pelanggan",
    };
  }

  // 4. STATUS AKTIF (IN_PROGRESS, AWAITING_APPROVAL, REVISION, DISPUTED)
  if (order.deadlineAt) {
    const deadlineMs = new Date(order.deadlineAt).getTime();
    if (!isNaN(deadlineMs)) {
      const diffMs = deadlineMs - nowMs;
      const isOverdue = diffMs <= 0;
      const isUrgent = diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;

      let timeRemainingText = "";
      let badgeLabel = "";

      if (isOverdue) {
        const overdueText = formatDurationMs(Math.abs(diffMs));
        timeRemainingText = `Lewat ${overdueText}`;
        badgeLabel = `Lewat ${overdueText}`;
      } else {
        const remainingText = formatDurationMs(diffMs);
        timeRemainingText = `Sisa ${remainingText}`;
        badgeLabel = `Sisa ${remainingText}`;
      }

      return {
        type: "ACTIVE",
        badgeLabel,
        badgeVariant: isOverdue ? "danger" : isUrgent ? "warning" : "info",
        isOverdue,
        isUrgent,
        timeRemainingText,
      };
    }
  }

  return {
    type: "ACTIVE",
    badgeLabel: "Sedang Dikerjakan",
    badgeVariant: "info",
    timeRemainingText: "Sedang dikerjakan",
  };
}
