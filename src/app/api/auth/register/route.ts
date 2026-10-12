import { NextRequest, NextResponse } from "next/server";
import { AuthService, COOKIE_NAME } from "@/server/auth/auth.service";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
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
