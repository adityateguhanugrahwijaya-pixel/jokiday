import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { getAppUrl } from "@/lib/app-url";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", "/profile");
      return NextResponse.redirect(loginUrl);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      const profileUrl = new URL("/profile", req.url);
      profileUrl.searchParams.set("error", "GOOGLE_CONFIG_MISSING");
      return NextResponse.redirect(profileUrl);
    }

    const appUrl = getAppUrl();
    const origin = req.nextUrl.origin || appUrl;
    let redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!redirectUri || (redirectUri.includes("localhost") && !origin.includes("localhost"))) {
      redirectUri = `${origin}/api/auth/google/callback`;
    }

    // Buat token state acak untuk proteksi CSRF
    const state = crypto.randomBytes(24).toString("hex");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/drive.file email profile"
    );
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());

    // Simpan state di cookie httpOnly
    const isHttps = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production";
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 10 * 60, // 10 menit
      path: "/",
    });

    return response;
  } catch {
    const profileUrl = new URL("/profile", req.url);
    profileUrl.searchParams.set("error", "OAUTH_INIT_FAILED");
    return NextResponse.redirect(profileUrl);
  }
}
