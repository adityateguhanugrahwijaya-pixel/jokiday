/**
 * Konstanta dan aturan resmi penarikan saldo freelancer (desainer) di JokiDay.
 */

export const MIN_WITHDRAWAL_AMOUNT = 10_000; // Minimal penarikan Rp10.000

export const BI_FAST_TRANSFER_FEE = 4_000; // Rp4.000 untuk bank / e-wallet selain BCA & DANA

export const FREE_TRANSFER_CHANNELS = ["BCA", "DANA"] as const;

/**
 * Teks notice wajib di form penarikan & pengaturan rekening pencairan.
 * Teks PERSIS sesuai instruksi sistem tanpa diparafrase.
 */
export const WITHDRAWAL_NOTICE_TEXT =
  "Penarikan dikirim manual oleh admin ke rekening pencairanmu, biasanya di hari yang sama. Minimal Rp10.000. Ke BCA & DANA gratis; ke bank/e-wallet lain biaya transfer BI-FAST Rp4.000";

/**
 * Memeriksa apakah kanal/tujuan penarikan bebas biaya transfer (BCA & DANA).
 */
export function isFreeTransferChannel(channelCodeOrName?: string | null): boolean {
  if (!channelCodeOrName) return false;
  const normalized = channelCodeOrName.trim().toUpperCase();

  return (
    normalized === "BCA" ||
    normalized === "DANA" ||
    normalized.includes("BANK CENTRAL ASIA") ||
    normalized.includes("(BCA)") ||
    normalized.startsWith("BCA ") ||
    normalized.includes("(DANA)") ||
    normalized.startsWith("DANA ") ||
    normalized === "DANA (UANG ELEKTRONIK)"
  );
}

/**
 * Menghitung biaya transfer penarikan dana berdasarkan bank/kanal tujuan.
 * - BCA & DANA: Rp0 (Gratis)
 * - Bank / E-Wallet lain: Rp4.000 (BI-FAST)
 */
export function calculateWithdrawalFee(channelCodeOrName?: string | null): number {
  return isFreeTransferChannel(channelCodeOrName) ? 0 : BI_FAST_TRANSFER_FEE;
}

/**
 * Menghitung estimasi nominal bersih yang diterima desainer (nominal dikurangi biaya).
 */
export function calculateNetAmount(amount: number, channelCodeOrName?: string | null): number {
  const fee = calculateWithdrawalFee(channelCodeOrName);
  return amount - fee;
}
