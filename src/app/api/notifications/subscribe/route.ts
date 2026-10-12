import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { PushNotificationService } from "@/server/push/push.service";
import { handleApiError, UnauthorizedError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Masuk terlebih dahulu untuk mengaktifkan notifikasi");
    }

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new ValidationError("Payload push subscription tidak lengkap");
    }

    await PushNotificationService.subscribe(session.userId, { endpoint, keys });

    return NextResponse.json({
      success: true,
      message: "Perangkat berhasil didaftarkan untuk menerima notifikasi web push",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
