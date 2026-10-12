import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, ValidationError } from "@/lib/errors";
import { RedisService } from "@/server/redis/redis.service";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token") || "";
    const result = await AuthService.verifyResetToken(token);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = await RedisService.rateLimit(`reset-password:${ip}`, 5, 60);
    if (!rate.allowed) {
      throw new ValidationError("Terlalu banyak percobaan reset kata sandi. Silakan tunggu 1 menit.");
    }

    const body = await req.json();
    const { token, password } = body;

    const result = await AuthService.resetPassword(token, password);
    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
