/**
 * Helper terpusat untuk menentukan alamat URL aplikasi (Base URL).
 * Bekerja fleksibel baik di lingkungan lokal, server mandiri, maupun serverless Vercel.
 */
export function getAppUrl(): string {
  const envUrl = process.env.APP_URL?.trim();

  // Jika di Vercel dan APP_URL masih berisi localhost atau kosong, gunakan VERCEL_URL
  if (process.env.VERCEL_URL && (!envUrl || envUrl.includes("localhost"))) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

/**
 * Menghasilkan URL absolut untuk path tertentu
 */
export function getAbsoluteUrl(path: string): string {
  const base = getAppUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
