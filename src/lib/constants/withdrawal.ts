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
 * Menghasilkan daftar tujuan bebas biaya transfer (gratis) secara dinamis dari pengaturan.
 * Jika `feeOverrides` diberikan (misalnya saat admin mengedit daftar di panel admin),
 * tujuan bebas biaya murni diambil dari item yang fee-nya 0 tanpa menyisipkan default BCA/DANA yang sudah dihapus.
 */
export function getEffectiveFreeDestinations(
  settings?: Partial<WithdrawalSettings> | null
): string[] {
  if (!settings) {
    return [...DEFAULT_WITHDRAWAL_SETTINGS.freeDestinations];
  }

  // Jika feeOverrides diberikan secara eksplisit (mis. diedit admin)
  if (settings.feeOverrides !== undefined) {
    const list: string[] = [];
    const seen = new Set<string>();

    settings.feeOverrides.forEach((o) => {
      const dest = o.destination?.trim();
      if (Number(o.fee) === 0 && dest && !seen.has(dest.toUpperCase())) {
        seen.add(dest.toUpperCase());
        list.push(dest);
      }
    });

    if (Array.isArray(settings.freeDestinations)) {
      settings.freeDestinations.forEach((d) => {
        const dest = d?.trim();
        if (dest && !seen.has(dest.toUpperCase())) {
          seen.add(dest.toUpperCase());
          list.push(dest);
        }
      });
    }

    return list;
  }

  // Jika hanya freeDestinations yang diberikan
  if (Array.isArray(settings.freeDestinations)) {
    return settings.freeDestinations
      .map((d) => d?.trim())
      .filter((d): d is string => Boolean(d));
  }

  // Fallback default
  return [...DEFAULT_WITHDRAWAL_SETTINGS.freeDestinations];
}

/**
 * Memformat daftar tujuan bebas biaya menjadi string yang rapi dan konsisten (mis: 'BCA & DANA', 'BCA, BRI & DANA').
 */
export function formatFreeDestinationsList(freeList: string[]): string {
  if (!freeList || freeList.length === 0) return "";
  if (freeList.length === 1) return freeList[0];
  if (freeList.length === 2) return `${freeList[0]} & ${freeList[1]}`;
  return `${freeList.slice(0, -1).join(", ")} & ${freeList[freeList.length - 1]}`;
}

/**
 * Menghasilkan teks notice secara dinamis berdasarkan objek pengaturan yang aktif.
 * Dengan nilai default, hasilnya PERSIS:
 * "Penarikan dikirim manual oleh admin ke rekening pencairanmu, biasanya di hari yang sama. Minimal Rp10.000. Ke BCA & DANA gratis; ke bank/e-wallet lain biaya transfer BI-FAST Rp4.000"
 */
export function generateWithdrawalNoticeText(settings?: Partial<WithdrawalSettings> | null): string {
  const minWithdrawal =
    settings?.minWithdrawal ?? DEFAULT_WITHDRAWAL_SETTINGS.minWithdrawal;
  const defaultFee =
    settings?.defaultFee ?? DEFAULT_WITHDRAWAL_SETTINGS.defaultFee;

  const minText = `Minimal ${formatRupiah(minWithdrawal)}.`;
  const freeList = getEffectiveFreeDestinations(settings);

  let feeClause = "";
  if (freeList.length > 0) {
    const formattedFree = formatFreeDestinationsList(freeList);

    if (defaultFee > 0) {
      feeClause = `Ke ${formattedFree} gratis; ke bank/e-wallet lain biaya transfer BI-FAST ${formatRupiah(defaultFee)}`;
    } else {
      feeClause = `Ke semua bank/e-wallet gratis biaya transfer`;
    }
  } else {
    if (defaultFee > 0) {
      feeClause = `Biaya transfer BI-FAST ke semua bank/e-wallet ${formatRupiah(defaultFee)}`;
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
  settings?: Partial<WithdrawalSettings> | null
): boolean {
  return calculateWithdrawalFee(channelCodeOrName, settings) === 0;
}

/**
 * Menghitung biaya transfer penarikan dana berdasarkan settings yang aktif.
 */
export function calculateWithdrawalFee(
  channelCodeOrName?: string | null,
  settings?: Partial<WithdrawalSettings> | null
): number {
  const defaultFee =
    settings?.defaultFee ?? DEFAULT_WITHDRAWAL_SETTINGS.defaultFee;
  if (!channelCodeOrName) return defaultFee;

  // 1. Cek apakah ada di feeOverrides jika diberikan
  if (settings?.feeOverrides !== undefined) {
    const override = settings.feeOverrides.find((o) =>
      isMatchingDestination(o.destination, channelCodeOrName)
    );
    if (override !== undefined) {
      return Math.max(0, override.fee);
    }
    // Tujuan ini tidak terdaftar di feeOverrides, gunakan defaultFee
    return defaultFee;
  }

  // 2. Cek apakah ada di freeDestinations
  const freeDestinations =
    settings?.freeDestinations ?? DEFAULT_WITHDRAWAL_SETTINGS.freeDestinations;
  if (freeDestinations && freeDestinations.length > 0) {
    const isFree = freeDestinations.some((d) =>
      isMatchingDestination(d, channelCodeOrName)
    );
    if (isFree) {
      return 0;
    }
  }

  // 3. Fallback default fee
  return defaultFee;
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
