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
 * Format tanggal Indonesia sesuai DESIGN.md: "12 Okt 2026"
 */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === "object" ? date : new Date(date);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format waktu 24 jam sesuai DESIGN.md: "14.30"
 */
export function formatTime(date: Date | string | number): string {
  const d = typeof date === "object" ? date : new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}.${minutes}`;
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
