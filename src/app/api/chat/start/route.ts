import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ValidationError, NotFoundError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk memulai percakapan");
    }

    const body = await req.json();
    const { designerId, initialMessage } = body;

    if (!designerId) {
      throw new ValidationError("ID desainer wajib disertakan");
    }

    if (designerId === session.userId) {
      throw new ValidationError("Kamu tidak dapat membuka percakapan dengan akunmu sendiri");
    }

    const designer = await prisma.user.findFirst({
      where: {
        id: designerId,
        isDesigner: true,
      },
    });

    if (!designer) {
      throw new NotFoundError("Desainer tidak ditemukan");
    }

    const cleanInitialMessage = initialMessage ? sanitizeInput(initialMessage).slice(0, 3000) : "";

    // Cari thread konsultasi langsung yang sudah ada
    let thread = await prisma.chatThread.findFirst({
      where: {
        customerId: session.userId,
        designerId: designer.id,
        orderId: null,
      },
    });

    if (!thread) {
      const threadId = `consult_${session.userId}_${designer.id}`;
      thread = await prisma.chatThread.create({
        data: {
          id: threadId,
          customerId: session.userId,
          designerId: designer.id,
          title: `Konsultasi Desain - ${designer.displayName}`,
          lastMessage: cleanInitialMessage || "Percakapan baru dimulai",
          lastMessageAt: new Date(),
        },
      });

      if (cleanInitialMessage) {
        await prisma.message.create({
          data: {
            threadId: thread.id,
            senderId: session.userId,
            body: cleanInitialMessage,
            type: "TEXT",
          },
        });
      }
    } else if (cleanInitialMessage) {
      // Jika thread konsultasi sudah ada, kirim pesan konsultasi baru jika belum pernah terkirim
      const lastMsg = await prisma.message.findFirst({
        where: { threadId: thread.id },
        orderBy: { createdAt: "desc" },
      });
      if (!lastMsg || lastMsg.body !== cleanInitialMessage) {
        await prisma.message.create({
          data: {
            threadId: thread.id,
            senderId: session.userId,
            body: cleanInitialMessage,
            type: "TEXT",
          },
        });
        await prisma.chatThread.update({
          where: { id: thread.id },
          data: {
            lastMessage: cleanInitialMessage,
            lastMessageAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      threadId: thread.id,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
