import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk melihat pesan");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { activeRole: true },
    });
    const role = user?.activeRole || session.activeRole || "CUSTOMER";

    if (role === "DESIGNER") {
      // Ambil thread obrolan di mana pengguna bertindak sebagai Desainer
      const threads = await prisma.chatThread.findMany({
        where: { designerId: session.userId },
        include: {
          customer: {
            select: { id: true, displayName: true, username: true, avatarUrl: true },
          },
          order: {
            select: {
              id: true,
              status: true,
              price: true,
              durationDays: true,
              revisionQuota: true,
              deadlineAt: true,
            },
          },
        },
        orderBy: { lastMessageAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        role: "DESIGNER",
        threads: threads.map((t) => ({
          id: t.id,
          title: t.title,
          lastMessage: t.lastMessage || "Mulai obrolan",
          lastMessageAt: t.lastMessageAt.toISOString(),
          otherUser: {
            id: t.customer.id,
            displayName: t.customer.displayName,
            username: t.customer.username || t.customer.displayName.toLowerCase().replace(/\s+/g, "_"),
            avatarUrl: t.customer.avatarUrl,
            roleLabel: "Pelanggan",
          },
          order: t.order,
        })),
      });
    } else {
      // Ambil thread obrolan di mana pengguna bertindak sebagai Pelanggan (Customer)
      const threads = await prisma.chatThread.findMany({
        where: { customerId: session.userId },
        include: {
          designer: {
            select: { id: true, displayName: true, username: true, avatarUrl: true },
          },
          order: {
            select: {
              id: true,
              status: true,
              price: true,
              durationDays: true,
              revisionQuota: true,
              deadlineAt: true,
            },
          },
        },
        orderBy: { lastMessageAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        role: "CUSTOMER",
        threads: threads.map((t) => ({
          id: t.id,
          title: t.title,
          lastMessage: t.lastMessage || "Mulai obrolan",
          lastMessageAt: t.lastMessageAt.toISOString(),
          otherUser: {
            id: t.designer.id,
            displayName: t.designer.displayName,
            username: t.designer.username || t.designer.displayName.toLowerCase().replace(/\s+/g, "_"),
            avatarUrl: t.designer.avatarUrl,
            roleLabel: "Desainer",
          },
          order: t.order,
        })),
      });
    }
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
