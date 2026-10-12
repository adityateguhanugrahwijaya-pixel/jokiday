import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/crypto";
import { DriveService } from "@/server/drive/drive.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const profileUrl = new URL("/profile", req.url);

  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      profileUrl.searchParams.set("error", "UNAUTHORIZED");
      return NextResponse.redirect(profileUrl);
    }

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      profileUrl.searchParams.set("error", `GOOGLE_${error.toUpperCase()}`);
      return NextResponse.redirect(profileUrl);
    }

    if (!code) {
      profileUrl.searchParams.set("error", "MISSING_AUTH_CODE");
      return NextResponse.redirect(profileUrl);
    }

    // Validasi state CSRF
    const savedState = req.cookies.get("google_oauth_state")?.value;
    if (!savedState || savedState !== state) {
      profileUrl.searchParams.set("error", "INVALID_CSRF_STATE");
      return NextResponse.redirect(profileUrl);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const origin = req.nextUrl.origin;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    // 1. Tukar authorization code dengan token Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[Google OAuth] Token exchange error:", errText);
      profileUrl.searchParams.set("error", "TOKEN_EXCHANGE_FAILED");
      return NextResponse.redirect(profileUrl);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // 2. Ambil informasi akun Google (email)
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let googleEmail = "unknown@gmail.com";
    if (userRes.ok) {
      const userData = await userRes.json();
      googleEmail = userData.email || googleEmail;
    }

    // 3. Simpan token & siapkan struktur folder
    let refreshTokenEnc = "";
    if (refreshToken) {
      refreshTokenEnc = encryptToken(refreshToken);
    } else {
      // Jika refresh token tidak dikirim ulang, gunakan yang tersimpan sebelumnya jika ada
      const existingConn = await prisma.driveConnection.findUnique({
        where: { userId: session.userId },
      });
      if (existingConn) {
        refreshTokenEnc = existingConn.refreshTokenEnc;
      } else {
        profileUrl.searchParams.set("error", "MISSING_REFRESH_TOKEN");
        return NextResponse.redirect(profileUrl);
      }
    }

    // 4. Siapkan folder JokiDay di Drive desainer
    let rootFolderId = "root";
    try {
      const folders = await DriveService.setupDesignerFolders(refreshTokenEnc);
      rootFolderId = folders.rootFolderId;
    } catch (folderErr) {
      console.warn("[Google Drive] Folder setup warning:", folderErr);
    }

    // 5. Simpan record koneksi di database
    await prisma.driveConnection.upsert({
      where: { userId: session.userId },
      update: {
        googleEmail,
        refreshTokenEnc,
        rootFolderId,
        status: "ACTIVE",
        connectedAt: new Date(),
      },
      create: {
        userId: session.userId,
        googleEmail,
        refreshTokenEnc,
        rootFolderId,
        status: "ACTIVE",
      },
    });

    profileUrl.searchParams.set("drive", "connected");
    const response = NextResponse.redirect(profileUrl);
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (err: any) {
    console.error("[Google OAuth] Callback error:", err);
    profileUrl.searchParams.set("error", "CALLBACK_INTERNAL_ERROR");
    return NextResponse.redirect(profileUrl);
  }
}
