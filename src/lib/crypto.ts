import crypto from "node:crypto";

/**
 * Password hashing menggunakan node:crypto scrypt (standar aman industri, bebas masalah native binary)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("scrypt$")) {
    const [, salt, originalKey] = hash.split("$");
    if (!salt || !originalKey) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(derivedKey.toString("hex")), Buffer.from(originalKey));
  }
  return false;
}

const rawEncryptionKey = process.env.ENCRYPTION_KEY || "";
const ENCRYPTION_KEY = Buffer.from(
  (rawEncryptionKey || "01234567890123456789012345678901").slice(0, 32),
  "utf8"
);

/**
 * AES-256-GCM encryption untuk token Google Drive
 */
export function encryptToken(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(cipherText: string): string {
  const [ivHex, tagHex, encryptedHex] = cipherText.split(":");
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Invalid cipher text format");

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Verifikasi signature webhook WaroengPay sesuai Waroengpay.txt:
 * X-WaroengPay-Timestamp dan X-Signature: HMAC-SHA256(webhook_secret, "<timestamp>.<raw body>")
 */
export function verifyWaroengPaySignature(
  timestamp: string,
  rawBody: string,
  signature: string,
  webhookSecret = process.env.WAROENGPAY_WEBHOOK_SECRET || ""
): boolean {
  if (!timestamp || !signature || !webhookSecret) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  const tsNum = Number(timestamp);
  // Toleransi 5 menit (300 detik)
  if (Number.isNaN(tsNum) || Math.abs(nowSec - tsNum) > 300) {
    return false;
  }

  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  if (signature.length !== expectedSignature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
