import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_SECRET, SECURITY_HEADERS, checkRateLimit } from "@/lib/security";

const COOKIE_NAME = "jokiday_session";

interface SessionPayload {
  userId: string;
  email: string;
  activeRole: "CUSTOMER" | "DESIGNER";
  isAdmin: boolean;
}

// Rute khusus administrator
const ADMIN_PAGE_PREFIX = "/admin";
const ADMIN_API_PREFIX = "/api/admin";

// Rute khusus desainer (freelancer)
const DESIGNER_PAGES: string[] = [];
const DESIGNER_APIS = ["/api/wallet/withdraw", "/api/portfolio/upload", "/api/designer/packages"];

// Rute yang memerlukan autentikasi pengguna (customer atau desainer)
const AUTH_PAGES = ["/dashboard", "/wallet", "/market", "/briefs/new", "/orders", "/chat", "/profile"];

// Rute tamu (jika sudah login, redirect ke halaman utama)
const GUEST_PAGES = ["/login", "/register"];

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [headerKey, headerValue] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(headerKey, headerValue);
  }
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Rate Limiting pada Endpoint Sensitif (Brute-Force & Anti-Abuse Protection)
  const clientIp = req.ip || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const rate = checkRateLimit(`login:${clientIp}`, 10, 60);
    if (!rate.success) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: { message: `Terlalu banyak percobaan login. Silakan tunggu ${rate.resetSeconds} detik.` } },
          { status: 429, headers: { "Retry-After": String(rate.resetSeconds) } }
        )
      );
    }
  }

  if (pathname === "/api/auth/register" && req.method === "POST") {
    const rate = checkRateLimit(`register:${clientIp}`, 6, 60);
    if (!rate.success) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: { message: `Batas pendaftaran tercapai. Silakan tunggu ${rate.resetSeconds} detik.` } },
          { status: 429, headers: { "Retry-After": String(rate.resetSeconds) } }
        )
      );
    }
  }

  // 2. Ekstrak dan verifikasi token sesi JWT dari cookie httpOnly
  const token = req.cookies.get(COOKIE_NAME)?.value;
  let session: SessionPayload | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SESSION_SECRET);
      session = payload as unknown as SessionPayload;
    } catch {
      session = null;
    }
  }

  // 3. Proteksi Halaman Tamu (/login, /register standar)
  if (
    session &&
    GUEST_PAGES.some((p) => pathname.startsWith(p)) &&
    !pathname.startsWith("/register/invite")
  ) {
    const redirectUrl = new URL("/dashboard", req.url);
    return withSecurityHeaders(NextResponse.redirect(redirectUrl));
  }

  // 4. Proteksi Akses Administrator (/admin/* dan /api/admin/*)
  const isAdminRoute = pathname.startsWith(ADMIN_PAGE_PREFIX) || pathname.startsWith(ADMIN_API_PREFIX);
  if (isAdminRoute) {
    if (!session) {
      if (pathname.startsWith("/api/")) {
        return withSecurityHeaders(
          NextResponse.json(
            { error: { message: "Autentikasi administrator diperlukan" } },
            { status: 401 }
          )
        );
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    if (!session.isAdmin) {
      if (pathname.startsWith("/api/")) {
        return withSecurityHeaders(
          NextResponse.json(
            { error: { message: "Akses ditolak: Hanya akun administrator" } },
            { status: 403 }
          )
        );
      }
      return withSecurityHeaders(NextResponse.redirect(new URL("/", req.url)));
    }

    return withSecurityHeaders(NextResponse.next());
  }

  // 5. Proteksi Rute Khusus Desainer (/dashboard, /wallet, /api/portfolio/upload, dll)
  const isDesignerRoute =
    DESIGNER_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    DESIGNER_APIS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isDesignerRoute) {
    if (!session) {
      if (pathname.startsWith("/api/")) {
        return withSecurityHeaders(
          NextResponse.json(
            { error: { message: "Kamu harus login sebagai desainer untuk mengakses tindakan ini" } },
            { status: 401 }
          )
        );
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    if (session.activeRole !== "DESIGNER" && !session.isAdmin) {
      if (pathname.startsWith("/api/")) {
        return withSecurityHeaders(
          NextResponse.json(
            { error: { message: "Fitur ini khusus untuk akun desainer" } },
            { status: 403 }
          )
        );
      }
      return withSecurityHeaders(NextResponse.redirect(new URL("/profile", req.url)));
    }

    return withSecurityHeaders(NextResponse.next());
  }

  // 6. Proteksi Rute Umum yang Wajib Login (/briefs/new, /orders, /chat, /profile)
  const isAuthRequiredPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isAuthRequiredPage) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/).*)",
  ],
};
