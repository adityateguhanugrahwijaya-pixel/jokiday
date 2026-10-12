import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const thread = await prisma.chatThread.findUnique({
      where: { id: params.id },
    });

    if (!thread) {
      throw new NotFoundError("Percakapan tidak ditemukan");
    }

    // Validasi peran aktif: pengguna tidak boleh mengakses chat dari peran yang tidak aktif
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { activeRole: true },
    });
    const activeRole = user?.activeRole || session.activeRole || "CUSTOMER";
    if (activeRole === "CUSTOMER" && thread.customerId !== session.userId && !session.isAdmin) {
      throw new ForbiddenError("Kamu sedang berada dalam Mode Pelanggan dan tidak dapat mengakses obrolan desainer ini");
    }
    if (activeRole === "DESIGNER" && thread.designerId !== session.userId && !session.isAdmin) {
      throw new ForbiddenError("Kamu sedang berada dalam Mode Desainer dan tidak dapat mengakses obrolan pelanggan ini");
    }

    // Tandai pesan dari lawan bicara sebagai telah dibaca (Centang Dua)
    await prisma.message.updateMany({
      where: {
        threadId: params.id,
        senderId: { not: session.userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    const messages = await prisma.message.findMany({
      where: { threadId: params.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        isMe: m.senderId === session.userId,
        type: m.type,
        body: m.body,
        readAt: m.readAt ? m.readAt.toISOString() : null,
        isRead: Boolean(m.readAt),
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const thread = await prisma.chatThread.findUnique({
      where: { id: params.id },
    });

    if (!thread) {
      throw new NotFoundError("Percakapan tidak ditemukan");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { activeRole: true },
    });
    const activeRole = user?.activeRole || session.activeRole || "CUSTOMER";
    if (activeRole === "CUSTOMER" && thread.customerId !== session.userId && !session.isAdmin) {
      throw new ForbiddenError("Kamu sedang dalam Mode Pelanggan dan tidak dapat mengirim pesan sebagai desainer");
    }
    if (activeRole === "DESIGNER" && thread.designerId !== session.userId && !session.isAdmin) {
      throw new ForbiddenError("Kamu sedang dalam Mode Desainer dan tidak dapat mengirim pesan sebagai pelanggan");
    }

    const body = await req.json();
    const cleanText = sanitizeInput(body.text || body.body || "");

    if (!cleanText) {
      throw new ValidationError("Pesan tidak boleh kosong atau berisi skrip yang tidak diizinkan");
    }
    if (cleanText.length > 5000) {
      throw new ValidationError("Pesan maksimal 5.000 karakter");
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId: session.userId,
        body: cleanText,
        type: "TEXT",
        readAt: null,
      },
    });

    await prisma.chatThread.update({
      where: { id: thread.id },
      data: {
        lastMessage: cleanText,
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        senderId: message.senderId,
        isMe: true,
        type: message.type,
        body: message.body,
        readAt: null,
        isRead: false,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
