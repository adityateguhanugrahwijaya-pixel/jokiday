import { describe, it, expect } from "vitest";
import {
  formatDurationMs,
  formatDateTimeWIB,
  getOrderTimerInfo,
  OrderTimerData,
} from "../../src/lib/order-timer";

describe("Order Timer & Duration Calculation Helper", () => {
  describe("formatDurationMs", () => {
    it("handles zero, negative, or tiny ms as < 1 menit", () => {
      expect(formatDurationMs(0)).toBe("< 1 menit");
      expect(formatDurationMs(-5000)).toBe("< 1 menit");
      expect(formatDurationMs(30000)).toBe("< 1 menit");
    });

    it("formats minutes accurately", () => {
      expect(formatDurationMs(60 * 1000)).toBe("1 menit");
      expect(formatDurationMs(45 * 60 * 1000)).toBe("45 menit");
    });

    it("formats hours and minutes accurately", () => {
      expect(formatDurationMs(2 * 60 * 60 * 1000)).toBe("2 jam");
      expect(formatDurationMs((2 * 60 + 15) * 60 * 1000)).toBe("2 jam 15 menit");
    });

    it("formats days and hours accurately", () => {
      expect(formatDurationMs(24 * 60 * 60 * 1000)).toBe("1 hari");
      expect(formatDurationMs(27 * 60 * 60 * 1000)).toBe("1 hari 3 jam");
      expect(formatDurationMs(50 * 60 * 60 * 1000)).toBe("2 hari 2 jam");
    });
  });

  describe("formatDateTimeWIB", () => {
    it("returns '-' for missing or invalid dates", () => {
      expect(formatDateTimeWIB(null)).toBe("-");
      expect(formatDateTimeWIB(undefined)).toBe("-");
      expect(formatDateTimeWIB("invalid-date-string")).toBe("-");
    });

    it("formats UTC dates to WIB (UTC+7) consistently", () => {
      // 2026-10-13 10:16:00 UTC -> 2026-10-13 17:16:00 WIB
      const utcDate = new Date("2026-10-13T10:16:00.000Z");
      const formatted = formatDateTimeWIB(utcDate);
      expect(formatted).toContain("13 Okt 2026");
      expect(formatted).toContain("17.16 WIB");
    });
  });

  describe("getOrderTimerInfo - ACTIVE Status", () => {
    it("calculates remaining time for active order before deadline", () => {
      const now = new Date("2026-10-13T10:00:00.000Z").getTime();
      const order: OrderTimerData = {
        status: "IN_PROGRESS",
        createdAt: "2026-10-13T09:00:00.000Z",
        deadlineAt: "2026-10-13T12:00:00.000Z", // +2 jam dari now
      };

      const result = getOrderTimerInfo(order, now);
      expect(result.type).toBe("ACTIVE");
      expect(result.isOverdue).toBe(false);
      expect(result.badgeLabel).toBe("Sisa 2 jam");
      expect(result.badgeVariant).toBe("warning"); // <= 24 jam is urgent
    });

    it("calculates overdue time for active order past deadline", () => {
      const now = new Date("2026-10-13T13:30:00.000Z").getTime();
      const order: OrderTimerData = {
        status: "IN_PROGRESS",
        createdAt: "2026-10-13T09:00:00.000Z",
        deadlineAt: "2026-10-13T12:00:00.000Z", // 1 jam 30 menit lewat
      };

      const result = getOrderTimerInfo(order, now);
      expect(result.type).toBe("ACTIVE");
      expect(result.isOverdue).toBe(true);
      expect(result.badgeLabel).toBe("Lewat 1 jam 30 menit");
      expect(result.badgeVariant).toBe("danger");
    });
  });

  describe("getOrderTimerInfo - COMPLETED Status", () => {
    it("reports completed early with exact duration and positive difference", () => {
      const started = "2026-10-13T09:00:00.000Z";
      const ended = "2026-10-13T10:30:00.000Z"; // Durasi 1 jam 30 menit
      const deadline = "2026-10-13T13:30:00.000Z"; // Selesai 3 jam lebih cepat

      const order: OrderTimerData = {
        status: "COMPLETED",
        createdAt: started,
        startedAt: started,
        endedAt: ended,
        completedAt: ended,
        deadlineAt: deadline,
      };

      const result = getOrderTimerInfo(order);
      expect(result.type).toBe("COMPLETED");
      expect(result.isCompletedLate).toBe(false);
      expect(result.badgeVariant).toBe("success");
      expect(result.badgeLabel).toBe("Selesai 3 jam lebih cepat");
      expect(result.deadlineDiffText).toBe("Selesai 3 jam lebih cepat");
      expect(result.durationFormatted).toBe("1 jam 30 menit");
      expect(result.startTimeFormatted).toContain("WIB");
      expect(result.endTimeFormatted).toContain("WIB");
    });

    it("reports completed on-time if difference is less than 1 minute", () => {
      const started = "2026-10-13T09:00:00.000Z";
      const deadline = "2026-10-13T12:00:00.000Z";
      const ended = "2026-10-13T11:59:45.000Z"; // 15s before deadline

      const order: OrderTimerData = {
        status: "COMPLETED",
        createdAt: started,
        startedAt: started,
        endedAt: ended,
        completedAt: ended,
        deadlineAt: deadline,
      };

      const result = getOrderTimerInfo(order);
      expect(result.type).toBe("COMPLETED");
      expect(result.isCompletedLate).toBe(false);
      expect(result.badgeVariant).toBe("success");
      expect(result.badgeLabel).toBe("Selesai tepat waktu");
      expect(result.deadlineDiffText).toBe("Selesai tepat waktu");
    });

    it("reports completed late with exact overdue duration and red warning", () => {
      const started = "2026-10-13T09:00:00.000Z";
      const deadline = "2026-10-13T12:00:00.000Z";
      const ended = "2026-10-13T14:15:00.000Z"; // Telat 2 jam 15 menit

      const order: OrderTimerData = {
        status: "COMPLETED",
        createdAt: started,
        startedAt: started,
        endedAt: ended,
        completedAt: ended,
        deadlineAt: deadline,
      };

      const result = getOrderTimerInfo(order);
      expect(result.type).toBe("COMPLETED");
      expect(result.isCompletedLate).toBe(true);
      expect(result.badgeVariant).toBe("danger");
      expect(result.badgeLabel).toBe("Selesai telat 2 jam 15 menit");
      expect(result.deadlineDiffText).toBe("Selesai telat 2 jam 15 menit");
      expect(result.durationFormatted).toBe("5 jam 15 menit");
    });

    it("handles legacy completed order without crashing and returns '-' for missing dates", () => {
      const order: OrderTimerData = {
        status: "COMPLETED",
        createdAt: "2026-10-10T00:00:00.000Z",
        deadlineAt: null,
        startedAt: null,
        endedAt: null,
      };

      const result = getOrderTimerInfo(order);
      expect(result.type).toBe("COMPLETED");
      expect(result.endTimeFormatted).toBe("-");
      expect(result.durationFormatted).toBe("-");
      expect(result.deadlineDiffText).toBe("-");
    });
  });

  describe("getOrderTimerInfo - CANCELLED / REFUNDED / FAILED Status", () => {
    it("stops timer completely for cancelled order and shows stopped timestamp", () => {
      const stoppedAt = "2026-10-13T05:23:38.697Z";
      const order: OrderTimerData = {
        status: "CANCELLED",
        createdAt: "2026-10-13T04:17:59.993Z",
        endedAt: stoppedAt,
        endedReason: "CANCELLED",
      };

      const result = getOrderTimerInfo(order);
      expect(result.type).toBe("CANCELLED_OR_FAILED");
      expect(result.badgeVariant).toBe("neutral");
      expect(result.badgeLabel).toContain("Dibatalkan");
      expect(result.badgeLabel).toContain("12.23 WIB");
      expect(result.stoppedAtFormatted).toContain("12.23 WIB");
    });

    it("displays Refund label for refunded orders", () => {
      const stoppedAt = "2026-10-13T05:06:04.371Z";
      const order: OrderTimerData = {
        status: "REFUNDED",
        createdAt: "2026-10-13T04:06:04.371Z",
        endedAt: stoppedAt,
        endedReason: "REFUNDED",
      };

      const result = getOrderTimerInfo(order);
      expect(result.type).toBe("CANCELLED_OR_FAILED");
      expect(result.badgeLabel).toContain("Refund");
      expect(result.badgeLabel).toContain("12.06 WIB");
    });

    it("displays Gagal label when endedReason is FAILED", () => {
      const stoppedAt = "2026-10-13T05:00:00.000Z";
      const order: OrderTimerData = {
        status: "CANCELLED",
        createdAt: "2026-10-13T04:00:00.000Z",
        endedAt: stoppedAt,
        endedReason: "FAILED",
      };

      const result = getOrderTimerInfo(order);
      expect(result.type).toBe("CANCELLED_OR_FAILED");
      expect(result.badgeLabel).toContain("Gagal");
    });
  });
});
