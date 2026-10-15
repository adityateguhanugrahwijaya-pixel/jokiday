import { prisma } from "@/lib/db";
import {
  WithdrawalSettings,
  DestinationFeeOverride,
  DEFAULT_WITHDRAWAL_SETTINGS,
} from "@/lib/constants/withdrawal";
import { sanitizeInput } from "@/lib/security";
import { ValidationError } from "@/lib/errors";

const CONFIG_KEY_MIN = "min_withdrawal";
const CONFIG_KEY_DEFAULT_FEE = "withdrawal_default_fee";
const CONFIG_KEY_FREE_DESTINATIONS = "withdrawal_free_destinations";
const CONFIG_KEY_FEE_OVERRIDES = "withdrawal_fee_overrides";
const CONFIG_KEY_UPDATED_BY = "withdrawal_settings_updated_by";
const CONFIG_KEY_UPDATED_AT = "withdrawal_settings_updated_at";

export class WithdrawalSettingsService {
  /**
   * Mengambil pengaturan penarikan dana aktif dari database (tabel app_configs).
   * Jika belum ada di database, menggunakan nilai default awal.
   */
  static async getSettings(): Promise<WithdrawalSettings> {
    try {
      const configs = await prisma.appConfig.findMany({
        where: {
          key: {
            in: [
              CONFIG_KEY_MIN,
              CONFIG_KEY_DEFAULT_FEE,
              CONFIG_KEY_FREE_DESTINATIONS,
              CONFIG_KEY_FEE_OVERRIDES,
              CONFIG_KEY_UPDATED_BY,
              CONFIG_KEY_UPDATED_AT,
            ],
          },
        },
      });

      const configMap = new Map<string, string>();
      for (const c of configs) {
        configMap.set(c.key, c.value);
      }

      const rawMin = configMap.get(CONFIG_KEY_MIN);
      const rawDefaultFee = configMap.get(CONFIG_KEY_DEFAULT_FEE);
      const rawFreeDest = configMap.get(CONFIG_KEY_FREE_DESTINATIONS);
      const rawOverrides = configMap.get(CONFIG_KEY_FEE_OVERRIDES);
      const rawUpdatedBy = configMap.get(CONFIG_KEY_UPDATED_BY);
      const rawUpdatedAt = configMap.get(CONFIG_KEY_UPDATED_AT);

      const minWithdrawal = rawMin ? parseInt(rawMin, 10) : DEFAULT_WITHDRAWAL_SETTINGS.minWithdrawal;
      const defaultFee = rawDefaultFee ? parseInt(rawDefaultFee, 10) : DEFAULT_WITHDRAWAL_SETTINGS.defaultFee;

      let freeDestinations = DEFAULT_WITHDRAWAL_SETTINGS.freeDestinations;
      if (rawFreeDest) {
        try {
          const parsed = JSON.parse(rawFreeDest);
          if (Array.isArray(parsed)) {
            freeDestinations = parsed.map((item) => String(item).trim()).filter(Boolean);
          }
        } catch {
          // ignore error and fallback
        }
      }

      let feeOverrides: DestinationFeeOverride[] = DEFAULT_WITHDRAWAL_SETTINGS.feeOverrides;
      if (rawOverrides) {
        try {
          const parsed = JSON.parse(rawOverrides);
          if (Array.isArray(parsed)) {
            feeOverrides = parsed
              .map((item) => ({
                destination: String(item.destination || "").trim(),
                fee: Math.max(0, parseInt(String(item.fee), 10) || 0),
              }))
              .filter((item) => item.destination.length > 0);
          }
        } catch {
          // ignore error and fallback
        }
      }

      return {
        minWithdrawal: isNaN(minWithdrawal) || minWithdrawal <= 0 ? DEFAULT_WITHDRAWAL_SETTINGS.minWithdrawal : minWithdrawal,
        defaultFee: isNaN(defaultFee) || defaultFee < 0 ? DEFAULT_WITHDRAWAL_SETTINGS.defaultFee : defaultFee,
        freeDestinations,
        feeOverrides,
        updatedBy: rawUpdatedBy || DEFAULT_WITHDRAWAL_SETTINGS.updatedBy,
        updatedAt: rawUpdatedAt || DEFAULT_WITHDRAWAL_SETTINGS.updatedAt,
      };
    } catch {
      // Fallback jika database belum siap
      return { ...DEFAULT_WITHDRAWAL_SETTINGS };
    }
  }

  /**
   * Menyimpan pembaruan pengaturan penarikan dana ke database (app_configs) dengan audit.
   */
  static async updateSettings(
    input: {
      minWithdrawal: number;
      defaultFee: number;
      feeOverrides: DestinationFeeOverride[];
    },
    adminIdentifier: string,
    adminUserId?: string
  ): Promise<WithdrawalSettings> {
    const minWithdrawal = parseInt(String(input.minWithdrawal), 10);
    if (isNaN(minWithdrawal) || minWithdrawal <= 0) {
      throw new ValidationError("Batas minimal penarikan harus lebih besar dari 0.");
    }

    const defaultFee = parseInt(String(input.defaultFee), 10);
    if (isNaN(defaultFee) || defaultFee < 0) {
      throw new ValidationError("Biaya default transfer tidak boleh bernilai negatif.");
    }

    if (defaultFee >= minWithdrawal) {
      throw new ValidationError(
        `Biaya transfer default (Rp${defaultFee.toLocaleString("id-ID")}) tidak boleh sama dengan atau melebihi batas minimal penarikan (Rp${minWithdrawal.toLocaleString("id-ID")}).`
      );
    }

    if (!Array.isArray(input.feeOverrides)) {
      throw new ValidationError("Daftar pengecualian biaya transfer harus berupa array.");
    }

    // Validasi dan normalisasi fee overrides
    const seenDestinations = new Set<string>();
    const cleanOverrides: DestinationFeeOverride[] = [];
    const freeDestinations: string[] = [];

    for (const item of input.feeOverrides) {
      const destination = sanitizeInput(String(item.destination || "")).trim();
      if (!destination) {
        throw new ValidationError("Nama bank/e-wallet tujuan pada daftar biaya tidak boleh kosong.");
      }

      const upper = destination.toUpperCase();
      if (seenDestinations.has(upper)) {
        throw new ValidationError(
          `Tujuan transfer '${destination}' terdaftar lebih dari satu kali (duplikat).`
        );
      }
      seenDestinations.add(upper);

      const fee = parseInt(String(item.fee), 10);
      if (isNaN(fee) || fee < 0) {
        throw new ValidationError(
          `Biaya transfer untuk tujuan '${destination}' tidak boleh bernilai negatif.`
        );
      }

      if (fee >= minWithdrawal) {
        throw new ValidationError(
          `Biaya transfer untuk '${destination}' (Rp${fee.toLocaleString("id-ID")}) tidak boleh sama dengan atau melebihi minimal penarikan.`
        );
      }

      cleanOverrides.push({
        destination,
        fee,
      });

      if (fee === 0) {
        freeDestinations.push(destination);
      }
    }

    const nowIso = new Date().toISOString();
    const updatedBy = sanitizeInput(adminIdentifier || "Admin").slice(0, 100);

    const prevSettings = await this.getSettings();

    // Simpan ke database app_configs
    await prisma.$transaction(async (tx) => {
      await tx.appConfig.upsert({
        where: { key: CONFIG_KEY_MIN },
        update: { value: String(minWithdrawal), description: "Batas minimum penarikan saldo dompet dalam rupiah" },
        create: { key: CONFIG_KEY_MIN, value: String(minWithdrawal), description: "Batas minimum penarikan saldo dompet dalam rupiah" },
      });

      await tx.appConfig.upsert({
        where: { key: CONFIG_KEY_DEFAULT_FEE },
        update: { value: String(defaultFee), description: "Biaya transfer penarikan default BI-FAST (Rp)" },
        create: { key: CONFIG_KEY_DEFAULT_FEE, value: String(defaultFee), description: "Biaya transfer penarikan default BI-FAST (Rp)" },
      });

      await tx.appConfig.upsert({
        where: { key: CONFIG_KEY_FREE_DESTINATIONS },
        update: { value: JSON.stringify(freeDestinations), description: "Daftar kanal penarikan bebas biaya transfer (JSON array)" },
        create: { key: CONFIG_KEY_FREE_DESTINATIONS, value: JSON.stringify(freeDestinations), description: "Daftar kanal penarikan bebas biaya transfer (JSON array)" },
      });

      await tx.appConfig.upsert({
        where: { key: CONFIG_KEY_FEE_OVERRIDES },
        update: { value: JSON.stringify(cleanOverrides), description: "Daftar penyesuaian biaya penarikan per tujuan (JSON array)" },
        create: { key: CONFIG_KEY_FEE_OVERRIDES, value: JSON.stringify(cleanOverrides), description: "Daftar penyesuaian biaya penarikan per tujuan (JSON array)" },
      });

      await tx.appConfig.upsert({
        where: { key: CONFIG_KEY_UPDATED_BY },
        update: { value: updatedBy, description: "Admin terakhir yang mengubah pengaturan penarikan" },
        create: { key: CONFIG_KEY_UPDATED_BY, value: updatedBy, description: "Admin terakhir yang mengubah pengaturan penarikan" },
      });

      await tx.appConfig.upsert({
        where: { key: CONFIG_KEY_UPDATED_AT },
        update: { value: nowIso, description: "Waktu ISO terakhir pengaturan penarikan diperbarui" },
        create: { key: CONFIG_KEY_UPDATED_AT, value: nowIso, description: "Waktu ISO terakhir pengaturan penarikan diperbarui" },
      });

      if (adminUserId) {
        await tx.auditLog.create({
          data: {
            actorId: adminUserId,
            action: "UPDATE_WITHDRAWAL_SETTINGS",
            entity: "AppConfig",
            entityId: "withdrawal_settings",
            before: JSON.stringify(prevSettings),
            after: JSON.stringify({
              minWithdrawal,
              defaultFee,
              freeDestinations,
              feeOverrides: cleanOverrides,
              updatedBy,
              updatedAt: nowIso,
            }),
          },
        });
      }
    });

    return {
      minWithdrawal,
      defaultFee,
      freeDestinations,
      feeOverrides: cleanOverrides,
      updatedBy,
      updatedAt: nowIso,
    };
  }
}

export const getWithdrawalSettings = WithdrawalSettingsService.getSettings;
export const updateWithdrawalSettings = WithdrawalSettingsService.updateSettings;
