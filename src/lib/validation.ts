export interface NIKValidationResult {
  valid: boolean;
  reason: string;
}

/**
 * Validasi Nomor Induk Kependudukan (NIK/KTP) sesuai standar Dukcapil:
 * Format: 16 digit angka (PPKKCCDDMMYYSSSS)
 * Tanggal lahir: Wanita ditambah 40 (dayCode > 40 -> dayCode - 40)
 */
export function validateNIK(nik: string): NIKValidationResult {
  if (!/^\d{16}$/.test(nik)) {
    return {
      valid: false,
      reason: "NIK harus terdiri dari 16 digit angka",
    };
  }

  const dayCode = Number(nik.slice(6, 8));
  const month = Number(nik.slice(8, 10));
  const yearCode = Number(nik.slice(10, 12));

  const day = dayCode > 40
    ? dayCode - 40
    : dayCode;

  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return {
      valid: false,
      reason: "Bagian tanggal lahir tidak valid",
    };
  }

  return {
    valid: true,
    reason: "Format dasar NIK lolos pemeriksaan",
  };
}
