import { NextRequest, NextResponse } from "next/server";
import { AuthService, COOKIE_NAME } from "@/server/auth/auth.service";
import { handleApiError, ValidationError } from "@/lib/errors";
import { RedisService } from "@/server/redis/redis.service";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = await RedisService.rateLimit(`login:${ip}`, 10, 60);
    if (!rate.allowed) {
      throw new ValidationError("Terlalu banyak percobaan masuk. Silakan tunggu 1 menit.");
    }

    const body = await req.json();
    const { email, password } = body;

    const { token, user } = await AuthService.login(email, password);

    const isHttps = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production";
    const response = NextResponse.json({ success: true, user });
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 hari
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
