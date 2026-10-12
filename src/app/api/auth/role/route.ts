import { NextRequest, NextResponse } from "next/server";
import { AuthService, COOKIE_NAME } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk mengganti peran");
    }

    const body = await req.json();
    const targetRole = body.targetRole || body.role;

    if (targetRole !== "CUSTOMER" && targetRole !== "DESIGNER") {
      throw new ValidationError("Peran harus bernilai CUSTOMER atau DESIGNER");
    }

    const result = await AuthService.switchRole(session.userId, targetRole);
    const response = NextResponse.json({ success: true, activeRole: result.activeRole });

    if (result.token) {
      const isHttps = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
      response.cookies.set(COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
