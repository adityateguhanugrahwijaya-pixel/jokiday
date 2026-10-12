import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.userId, readAt: null },
    });

    const mapped = notifications.map((n) => {
      let parsedPayload: any = {};
      try {
        parsedPayload = JSON.parse(n.payload);
      } catch {
        parsedPayload = {};
      }

      return {
        id: n.id,
        type: n.type,
        title: parsedPayload.title || "Notifikasi",
        body: parsedPayload.body || "",
        url: parsedPayload.url || null,
        readAt: n.readAt?.toISOString() || null,
        createdAt: n.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      notifications: mapped,
      unreadCount,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH() {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    await prisma.notification.updateMany({
      where: { userId: session.userId, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Semua notifikasi telah ditandai dibaca" });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
