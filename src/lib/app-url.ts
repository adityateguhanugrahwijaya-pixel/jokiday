/**
 * Helper terpusat untuk menentukan alamat URL aplikasi (Base URL).
 * Bekerja fleksibel baik di lingkungan lokal, server mandiri, maupun serverless Vercel.
 */
export function getAppUrl(): string {
  const envUrl = process.env.APP_URL?.trim();

  // Jika diset explicitly ke custom domain (bukan localhost)
  if (envUrl && !envUrl.includes("localhost")) {
    return envUrl.replace(/\/$/, "");
  }

  // Jika di Vercel dengan production URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  if (process.env.NODE_ENV === "development") {
    return envUrl || "http://localhost:3000";
  }

  return "https://jokiday.agentkikir.cloud";
}

/**
 * Menghasilkan URL absolut untuk path tertentu
 */
export function getAbsoluteUrl(path: string): string {
  const base = getAppUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
