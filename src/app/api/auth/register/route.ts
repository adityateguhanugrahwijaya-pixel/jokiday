import { NextRequest, NextResponse } from "next/server";
import { AuthService, COOKIE_NAME } from "@/server/auth/auth.service";
import { handleApiError, ValidationError } from "@/lib/errors";
import { RedisService } from "@/server/redis/redis.service";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = await RedisService.rateLimit(`register:${ip}`, 5, 60);
    if (!rate.allowed) {
      throw new ValidationError("Terlalu banyak percobaan pendaftaran akun. Silakan coba lagi nanti.");
    }

    const body = await req.json();
    const user = await AuthService.register(body);

    const { token } = await AuthService.login(body.email, body.password);

    const isHttps = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production";
    const response = NextResponse.json({ success: true, user });
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
