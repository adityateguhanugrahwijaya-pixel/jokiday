import { NextRequest, NextResponse } from "next/server";
import { PushNotificationService } from "@/server/push/push.service";
import { handleApiError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      throw new ValidationError("Endpoint wajib disertakan");
    }

    await PushNotificationService.unsubscribe(endpoint);

    return NextResponse.json({
      success: true,
      message: "Perangkat berhasil dihapus dari langganan notifikasi push",
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
