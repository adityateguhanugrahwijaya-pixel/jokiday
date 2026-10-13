import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      return NextResponse.json({ unreadCount: 0 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { activeRole: true },
    });
    const activeRole = user?.activeRole || session.activeRole || "CUSTOMER";

    // Filter thread berdasarkan peran pengguna yang sedang aktif
    const threads = await prisma.chatThread.findMany({
      where:
        activeRole === "DESIGNER"
          ? { designerId: session.userId }
          : { customerId: session.userId },
      select: { id: true },
    });

    const threadIds = threads.map((t) => t.id);

    if (threadIds.length === 0) {
      return NextResponse.json({ unreadCount: 0, latestUnreadMessage: null });
    }

    // Hitung total pesan belum dibaca yang dikirim lawan bicara
    const unreadCount = await prisma.message.count({
      where: {
        threadId: { in: threadIds },
        senderId: { not: session.userId },
        readAt: null,
      },
    });

    let latestUnreadMessage: any = null;
    if (unreadCount > 0) {
      const latestMsg = await prisma.message.findFirst({
        where: {
          threadId: { in: threadIds },
          senderId: { not: session.userId },
          readAt: null,
        },
        orderBy: { createdAt: "desc" },
      });

      if (latestMsg) {
        const sender = await prisma.user.findUnique({
          where: { id: latestMsg.senderId },
          select: { displayName: true },
        });

        latestUnreadMessage = {
          id: latestMsg.id,
          threadId: latestMsg.threadId,
          senderName: sender?.displayName || "Pengguna",
          body: latestMsg.body,
          createdAt: latestMsg.createdAt.toISOString(),
        };
      }
    }

    return NextResponse.json({
      success: true,
      unreadCount,
      latestUnreadMessage,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
