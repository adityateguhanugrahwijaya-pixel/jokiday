import { formatRupiah } from "@/lib/format";

/**
 * Batas minimal harga produk premade berbayar.
 * Default: Rp1.000 (sesuai aturan platform).
 * Jika produk gratis, harga adalah Rp0.
 */
export const MIN_PAID_PRODUCT_PRICE = 1_000;

/**
 * Daftar ekstensi file digital yang diperbolehkan untuk diunggah langsung ke Drive.
 */
export const PRODUCT_ALLOWED_EXTENSIONS = [
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "psd",
  "ai",
  "eps",
  "pdf",
  "svg",
  "png",
  "jpg",
  "jpeg",
  "fig",
  "xd",
  "cdr",
  "indd",
] as const;

/**
 * Batas ukuran file produk digital untuk direct upload (50 MB).
 */
export const PRODUCT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Domain layanan cloud / design tools yang diperbolehkan untuk opsi "Tempel Link".
 */
export const PRODUCT_ALLOWED_DOMAINS = [
  "drive.google.com",
  "docs.google.com",
  "mega.nz",
  "dropbox.com",
  "canva.com",
  "mediafire.com",
  "onedrive.live.com",
  "1drv.ms",
  "box.com",
  "we.tl",
  "wetransfer.com",
  "gumroad.com",
  "notion.so",
  "notion.site",
  "figma.com",
  "github.com",
] as const;

export const PRODUCT_CATEGORIES = [
  { id: "template", label: "Template & Mockup" },
  { id: "logo", label: "Logo & Badge Premade" },
  { id: "kemasan", label: "Pola & Dieline Kemasan" },
  { id: "poster", label: "Poster & Flyer Siap Pakai" },
  { id: "media", label: "Feed & Story Medsos" },
  { id: "ilustrasi", label: "Ilustrasi & Vektor Aset" },
  { id: "font", label: "Tipografi & Font" },
] as const;

export const PRODUCT_REFUND_POLICY_TEXT =
  "Kebijakan Pengembalian Dana: Produk digital siap pakai tidak dapat dikembalikan (non-refundable) setelah akses/file dibuka, kecuali file terbukti rusak total atau tautan tidak dapat diakses sama sekali.";

/**
 * Validasi harga produk premade.
 * - Jika isFree === true -> harga harus 0.
 * - Jika isFree === false -> harga harus bilangan bulat >= MIN_PAID_PRODUCT_PRICE (Rp1.000).
 * Nilai di antara Rp1 s/d Rp999 ditolak.
 */
export function validateProductPrice(
  price: unknown,
  isFree = false
): {
  isValid: boolean;
  error?: string;
  value?: number;
} {
  if (isFree) {
    return { isValid: true, value: 0 };
  }

  if (price === undefined || price === null || price === "") {
    return {
      isValid: false,
      error: "Harga produk wajib diisi",
    };
  }

  const num = typeof price === "number" ? price : parseInt(String(price), 10);

  if (isNaN(num) || !Number.isInteger(num)) {
    return {
      isValid: false,
      error: "Harga produk harus berupa angka bulat",
    };
  }

  if (num < 0) {
    return {
      isValid: false,
      error: "Harga produk tidak boleh bernilai negatif",
    };
  }

  if (num === 0) {
    return { isValid: true, value: 0 };
  }

  // Jika berbayar (num > 0), nilai di antara Rp1 s/d batas minimal ditolak
  if (num < MIN_PAID_PRODUCT_PRICE) {
    return {
      isValid: false,
      error: `Harga produk berbayar minimal ${formatRupiah(MIN_PAID_PRODUCT_PRICE)}`,
    };
  }

  return { isValid: true, value: num };
}

/**
 * Validasi format dan domain tautan eksternal (Google Drive, Mega, Dropbox, Canva, dll).
 */
export function validateProductExternalUrl(url: string): {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
} {
  if (!url || typeof url !== "string") {
    return { isValid: false, error: "Tautan unduhan file wajib diisi" };
  }

  const trimmed = url.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, error: "Format tautan tidak valid (harus diawali http:// atau https://)" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { isValid: false, error: "Tautan harus menggunakan protokol http atau https" };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isAllowed = PRODUCT_ALLOWED_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );

  if (!isAllowed) {
    return {
      isValid: false,
      error: `Domain tautan tidak didukung. Gunakan tautan dari: ${PRODUCT_ALLOWED_DOMAINS.slice(0, 5).join(", ")} atau penyedia cloud tepercaya lainnya`,
    };
  }

  return { isValid: true, normalizedUrl: trimmed };
}

/**
 * Memeriksa apakah ekstensi file termasuk dalam daftar yang diperbolehkan.
 */
export function isAllowedProductFileExtension(fileNameOrExt: string): boolean {
  if (!fileNameOrExt) return false;
  const ext = fileNameOrExt.split(".").pop()?.toLowerCase() || "";
  return PRODUCT_ALLOWED_EXTENSIONS.includes(ext as any);
}
