/**
 * Format nominal rupiah sesuai DESIGN.md:
 * Contoh: Rp47.500 (titik pemisah ribuan, tanpa desimal, tanpa spasi setelah Rp)
 */
export function formatRupiah(amount: number): string {
  const integerAmount = Math.floor(amount || 0);
  return `Rp${integerAmount.toLocaleString("id-ID")}`;
}

/**
 * Format rupiah ringkas untuk ruang sempit (contoh: 47,5rb / 1,2jt)
 */
export function formatRupiahCompact(amount: number): string {
  const val = Math.floor(amount || 0);
  if (val >= 1_000_000) {
    const formatted = (val / 1_000_000).toFixed(1).replace(".", ",");
    return `${formatted.endsWith(",0") ? formatted.slice(0, -2) : formatted}jt`;
  }
  if (val >= 1_000) {
    const formatted = (val / 1_000).toFixed(1).replace(".", ",");
    return `${formatted.endsWith(",0") ? formatted.slice(0, -2) : formatted}rb`;
  }
  return `Rp${val}`;
}

/**
 * Standar zona waktu tunggal seluruh platform JokiDay: Asia/Jayapura (WIT, UTC+9).
 * Semua waktu di database disimpan dalam UTC dan selalu dirender dengan zona waktu ini.
 */
export const APP_TIMEZONE = "Asia/Jayapura";
export const APP_TIMEZONE_LABEL = "WIT";

/**
 * Format tanggal Indonesia dalam zona waktu tunggal Asia/Jayapura (WIT): "12 Okt 2026"
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Format waktu 24 jam dalam zona waktu tunggal Asia/Jayapura (WIT): "14.30" atau "14.30 WIT"
 */
export function formatTime(
  date: Date | string | number | null | undefined,
  includeZone = false
): string {
  if (!date) return "-";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "-";
  const timeStr = new Intl.DateTimeFormat("id-ID", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(":", ".");
  return includeZone ? `${timeStr} ${APP_TIMEZONE_LABEL}` : timeStr;
}

/**
 * Format tanggal & waktu lengkap dalam zona waktu tunggal Asia/Jayapura (WIT): "12 Okt 2026 14.30 WIT"
 */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "-";
  return `${formatDate(d)} ${formatTime(d, true)}`;
}

/**
 * Format deadline relatif sesuai DESIGN.md: "Sisa 5 jam", "Lewat 2 jam"
 */
export function formatRelativeDeadline(deadline: Date | string | number): {
  text: string;
  isUrgent: boolean;
  isOverdue: boolean;
} {
  const target = new Date(deadline).getTime();
  const now = Date.now();
  const diffMs = target - now;

  if (diffMs <= 0) {
    const overdueHours = Math.max(1, Math.floor(Math.abs(diffMs) / (1000 * 60 * 60)));
    return {
      text: `Lewat ${overdueHours} jam`,
      isUrgent: true,
      isOverdue: true,
    };
  }

  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
  const daysRemaining = Math.floor(hoursRemaining / 24);

  if (hoursRemaining < 24) {
    return {
      text: `Sisa ${Math.max(1, hoursRemaining)} jam`,
      isUrgent: true,
      isOverdue: false,
    };
  }

  return {
    text: `Sisa ${daysRemaining} hari`,
    isUrgent: false,
    isOverdue: false,
  };
}
