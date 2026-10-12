import crypto from "node:crypto";
import { getAppUrl } from "@/lib/app-url";

const getSecret = (): string => {
  return (
    process.env.SIGNED_URL_SECRET ||
    process.env.SESSION_SECRET ||
    "fallback-signed-url-secret-32-chars-minimum"
  );
};

export interface SignedUrlOptions {
  expiresInSeconds?: number;
  params?: Record<string, string | number>;
}

/**
 * Membuat HMAC signature untuk URL yang aman dan berbatas waktu
 */
export function createSignedUrl(
  path: string,
  options: SignedUrlOptions = {}
): string {
  const secret = getSecret();
  const expiresInSeconds = options.expiresInSeconds || 3600; // Default 1 jam
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const urlParams = new URLSearchParams();
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      urlParams.set(key, String(value));
    }
  }
  urlParams.set("expires", String(expiresAt));

  // Sort query params untuk konsistensi hash
  urlParams.sort();
  const queryString = urlParams.toString();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const payloadToSign = `${cleanPath}?${queryString}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign)
    .digest("hex");

  urlParams.set("sig", signature);

  const base = getAppUrl();
  return `${base}${cleanPath}?${urlParams.toString()}`;
}

/**
 * Memverifikasi validitas signature URL berbatas waktu
 */
export function verifySignedUrl(
  path: string,
  searchParams: URLSearchParams
): boolean {
  const secret = getSecret();
  const signature = searchParams.get("sig");
  const expiresStr = searchParams.get("expires");

  if (!signature || !expiresStr) {
    return false;
  }

  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires)) {
    return false;
  }

  // Cek apakah URL sudah kedaluwarsa
  const now = Math.floor(Date.now() / 1000);
  if (now > expires) {
    return false;
  }

  // Rekonstruksi parameter tanpa 'sig' untuk mencocokkan signature asli
  const verificationParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== "sig") {
      verificationParams.set(key, value);
    }
  });

  verificationParams.sort();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const payloadToSign = `${cleanPath}?${verificationParams.toString()}`;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign)
    .digest("hex");

  try {
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
