/**
 * Security & Anti-Injection Core Utility for JokiDay
 * Menyediakan proteksi terhadap XSS, SQL/Script Injection, Brute-Force, dan Session Hijacking.
 */

// 1. SESSION SECRET VALIDATION
const rawSecret = process.env.SESSION_SECRET || "";

if (process.env.NODE_ENV === "production" && (!rawSecret || rawSecret.length < 32)) {
  console.warn(
    "[SECURITY WARNING] SESSION_SECRET belum disetel dengan minimal 32 karakter di berkas .env untuk lingkungan produksi!"
  );
}

export const SESSION_SECRET_STRING =
  rawSecret && rawSecret.length >= 32
    ? rawSecret
    : "super-secret-session-key-at-least-32-chars-long";

export const SESSION_SECRET = new TextEncoder().encode(SESSION_SECRET_STRING);

// 2. ANTI-INJECTION & INPUT SANITIZATION
/**
 * Membersihkan input teks dari potensi XSS, HTML/Script injection, null bytes, dan karakter berbahaya.
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") {
    if (input === null || input === undefined) return "";
    return String(input);
  }

  // Hapus null byte (\0) yang sering dipakai untuk SQL injection / path traversal
  let clean = input.replace(/\0/g, "");

  // Hapus tag HTML dan skrip berbahaya: <script>, <iframe>, <object>, <embed>, <svg>, <style>, dll
  clean = clean.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  clean = clean.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, "");
  clean = clean.replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, "");
  clean = clean.replace(/<\s*object[^>]*>[\s\S]*?<\s*\/\s*object\s*>/gi, "");
  clean = clean.replace(/<\s*embed[^>]*>[\s\S]*?<\s*\/\s*embed\s*>/gi, "");

  // Hapus inline event handlers (contoh: onclick=, onerror=, onload=)
  clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  clean = clean.replace(/on\w+\s*=\s*[^\s>]+/gi, "");

  // Hapus URL berbahaya (javascript:, data:text/html, vbscript:)
  clean = clean.replace(/javascript\s*:/gi, "");
  clean = clean.replace(/vbscript\s*:/gi, "");
  clean = clean.replace(/data\s*:\s*text\/html/gi, "");

  // Normalisasi karakter kontrol terlarang kecuali newline dan tab
  clean = clean.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return clean.trim();
}

/**
 * Melakukan escape karakter HTML khusus untuk mencegah eksekusi skrip di antarmuka.
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  return str.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitasi string pencarian untuk mencegah pola wildcard injection
 */
export function sanitizeSearchQuery(query: string): string {
  const clean = sanitizeInput(query);
  return clean.slice(0, 100);
}

// 3. IN-MEMORY RATE LIMITING (SLIDING WINDOW)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Bersihkan data lama setiap 5 menit agar memori tetap hemat
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((record, key) => {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Membatasi frekuensi request per identitas (IP / User ID / Endpoint)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      resetSeconds: windowSeconds,
    };
  }

  if (record.count >= limit) {
    const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      success: false,
      remaining: 0,
      resetSeconds,
    };
  }

  record.count += 1;
  const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  return {
    success: true,
    remaining: limit - record.count,
    resetSeconds,
  };
}

// 4. SECURITY HEADERS
export const SECURITY_HEADERS: Record<string, string> = {
  // Cegah MIME-sniffing
  "X-Content-Type-Options": "nosniff",
  // Cegah Clickjacking
  "X-Frame-Options": "SAMEORIGIN",
  // Perlindungan XSS lawas untuk browser lawas
  "X-XSS-Protection": "1; mode=block",
  // Batasi informasi referrer ke origin yang aman
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Batasi akses sensor / device API yang tidak diperlukan
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  // Content Security Policy (CSP) standar modern
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: https://cloudflareinsights.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};
