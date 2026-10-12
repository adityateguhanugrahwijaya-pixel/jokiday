import { NextResponse } from "next/server";
import { PushNotificationService } from "@/server/push/push.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = PushNotificationService.getPublicKey();
  return NextResponse.json({
    publicKey,
    enabled: Boolean(publicKey),
  });
}
