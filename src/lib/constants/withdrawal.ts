import { formatRupiah } from "@/lib/format";

export interface DestinationFeeOverride {
  destination: string;
  fee: number;
}

export interface WithdrawalSettings {
  minWithdrawal: number;
  defaultFee: number;
  freeDestinations: string[];
  feeOverrides: DestinationFeeOverride[];
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export const DEFAULT_WITHDRAWAL_SETTINGS: WithdrawalSettings = {
  minWithdrawal: 10_000,
  defaultFee: 4_000,
  freeDestinations: ["BCA", "DANA"],
  feeOverrides: [
    { destination: "BCA", fee: 0 },
    { destination: "DANA", fee: 0 },
  ],
  updatedBy: "System",
  updatedAt: new Date("2026-10-15T00:00:00.000Z").toISOString(),
};

export const MIN_WITHDRAWAL_AMOUNT = DEFAULT_WITHDRAWAL_SETTINGS.minWithdrawal;
export const BI_FAST_TRANSFER_FEE = DEFAULT_WITHDRAWAL_SETTINGS.defaultFee;
export const FREE_TRANSFER_CHANNELS = DEFAULT_WITHDRAWAL_SETTINGS.freeDestinations;

/**
 * Teks notice default statis (fallback backward-compatibility).
 */
export const WITHDRAWAL_NOTICE_TEXT =
  "Penarikan dikirim manual oleh admin ke rekening pencairanmu, biasanya di hari yang sama. Minimal Rp10.000. Ke BCA & DANA gratis; ke bank/e-wallet lain biaya transfer BI-FAST Rp4.000";

/**
 * Menghasilkan teks notice secara dinamis berdasarkan objek pengaturan yang aktif.
 * Dengan nilai default, hasilnya PERSIS:
 * "Penarikan dikirim manual oleh admin ke rekening pencairanmu, biasanya di hari yang sama. Minimal Rp10.000. Ke BCA & DANA gratis; ke bank/e-wallet lain biaya transfer BI-FAST Rp4.000"
 */
export function generateWithdrawalNoticeText(settings?: Partial<WithdrawalSettings> | null): string {
  const current = { ...DEFAULT_WITHDRAWAL_SETTINGS, ...settings };
  const minText = `Minimal ${formatRupiah(current.minWithdrawal)}.`;

  const freeSet = new Set<string>();
  (current.freeDestinations || []).forEach((d) => {
    if (d && d.trim()) freeSet.add(d.trim());
  });
  (current.feeOverrides || []).forEach((o) => {
    if (o.fee === 0 && o.destination && o.destination.trim()) {
      freeSet.add(o.destination.trim());
    }
  });

  const freeList = Array.from(freeSet);

  let feeClause = "";
  if (freeList.length > 0) {
    const formattedFree =
      freeList.length === 1
        ? freeList[0]
        : freeList.slice(0, -1).join(", ") + " & " + freeList[freeList.length - 1];

    if (current.defaultFee > 0) {
      feeClause = `Ke ${formattedFree} gratis; ke bank/e-wallet lain biaya transfer BI-FAST ${formatRupiah(current.defaultFee)}`;
    } else {
      feeClause = `Ke semua bank/e-wallet gratis biaya transfer`;
    }
  } else {
    if (current.defaultFee > 0) {
      feeClause = `Biaya transfer BI-FAST ke semua bank/e-wallet ${formatRupiah(current.defaultFee)}`;
    } else {
      feeClause = `Ke semua bank/e-wallet gratis biaya transfer`;
    }
  }

  return `Penarikan dikirim manual oleh admin ke rekening pencairanmu, biasanya di hari yang sama. ${minText} ${feeClause}`;
}

/**
 * Memeriksa kecocokan antara nama tujuan di settings dan kanal penarikan yang dipilih.
 */
export function isMatchingDestination(target: string, channelNameOrCode: string): boolean {
  if (!target || !channelNameOrCode) return false;
  const t = target.trim().toUpperCase();
  const c = channelNameOrCode.trim().toUpperCase();

  if (t === c) return true;
  if (c.includes(`(${t})`) || c.startsWith(`${t} `) || c.endsWith(` ${t}`)) return true;
  if (t.includes(`(${c})`) || t.startsWith(`${c} `) || t.endsWith(` ${c}`)) return true;

  // Normalisasi bank / e-wallet populer
  if (t === "BCA" && (c.includes("BANK CENTRAL ASIA") || c.includes("BCA"))) return true;
  if (t === "DANA" && c.includes("DANA")) return true;
  if (t === "BRI" && (c.includes("BANK RAKYAT INDONESIA") || c.includes("BRI"))) return true;
  if (t === "BNI" && (c.includes("BANK NEGARA INDONESIA") || c.includes("BNI"))) return true;
  if (t === "MANDIRI" && (c.includes("BANK MANDIRI") || c.includes("MANDIRI"))) return true;
  if (t === "GOPAY" && (c.includes("GOPAY") || c.includes("GO-PAY"))) return true;
  if (t === "OVO" && c.includes("OVO")) return true;
  if (t === "SHOPEEPAY" && (c.includes("SHOPEEPAY") || c.includes("SHOPEE PAY"))) return true;

  return c.includes(t) || t.includes(c);
}

/**
 * Memeriksa apakah kanal/tujuan penarikan bebas biaya transfer.
 */
export function isFreeTransferChannel(
  channelCodeOrName?: string | null,
  settings?: WithdrawalSettings | null
): boolean {
  return calculateWithdrawalFee(channelCodeOrName, settings) === 0;
}

/**
 * Menghitung biaya transfer penarikan dana berdasarkan settings yang aktif.
 */
export function calculateWithdrawalFee(
  channelCodeOrName?: string | null,
  settings?: WithdrawalSettings | null
): number {
  const current = settings || DEFAULT_WITHDRAWAL_SETTINGS;
  if (!channelCodeOrName) return current.defaultFee;

  // 1. Cek apakah ada di feeOverrides
  if (current.feeOverrides && current.feeOverrides.length > 0) {
    const override = current.feeOverrides.find((o) =>
      isMatchingDestination(o.destination, channelCodeOrName)
    );
    if (override !== undefined) {
      return Math.max(0, override.fee);
    }
  }

  // 2. Cek apakah ada di freeDestinations
  if (current.freeDestinations && current.freeDestinations.length > 0) {
    const isFree = current.freeDestinations.some((d) =>
      isMatchingDestination(d, channelCodeOrName)
    );
    if (isFree) {
      return 0;
    }
  }

  // 3. Fallback default fee
  return current.defaultFee;
}

/**
 * Menghitung estimasi nominal bersih yang diterima desainer.
 */
export function calculateNetAmount(
  amount: number,
  channelCodeOrName?: string | null,
  settings?: WithdrawalSettings | null
): number {
  const fee = calculateWithdrawalFee(channelCodeOrName, settings);
  return amount - fee;
}
