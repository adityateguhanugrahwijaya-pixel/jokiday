import { formatRupiah } from "@/lib/format";

/**
 * Batas harga minimum untuk Paket Jasa Desainer di JokiDay.
 * Sesuai aturan platform: Minimal Rp10.000.
 */
export const MIN_SERVICE_PACKAGE_PRICE = 10_000;

export interface ServicePackagePriceInput {
  price: number;
  isActive?: boolean;
}

/**
 * Validasi harga paket jasa untuk memastikan nilai berupa angka bulat
 * dan memenuhi batas minimum platform (Rp10.000).
 */
export function validateServicePackagePrice(price: unknown): {
  isValid: boolean;
  error?: string;
  value?: number;
} {
  if (price === undefined || price === null || price === "") {
    return {
      isValid: false,
      error: "Harga paket jasa wajib diisi",
    };
  }

  const num = typeof price === "number" ? price : parseInt(String(price), 10);

  if (isNaN(num) || !Number.isInteger(num)) {
    return {
      isValid: false,
      error: "Harga paket harus berupa angka bulat",
    };
  }

  if (num < MIN_SERVICE_PACKAGE_PRICE) {
    return {
      isValid: false,
      error: `Harga paket minimal ${formatRupiah(MIN_SERVICE_PACKAGE_PRICE)}`,
    };
  }

  return {
    isValid: true,
    value: num,
  };
}

/**
 * Menghitung harga awal ("Mulai dari") dari paket jasa aktif milik desainer.
 * Mengembalikan harga terendah jika memiliki paket aktif, atau null jika tidak ada paket aktif.
 */
export function getLowestActivePackagePrice(
  packages?: Array<{ price: number; isActive?: boolean }> | null
): number | null {
  if (!packages || packages.length === 0) return null;

  const activePackages = packages.filter(
    (p) => p.isActive !== false && typeof p.price === "number" && p.price > 0
  );

  if (activePackages.length === 0) return null;

  return Math.min(...activePackages.map((p) => p.price));
}
