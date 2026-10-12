import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatViewClient, ThreadItem, ChatMessageItem } from "./ChatViewClient";
import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams?: { designerId?: string; name?: string; threadId?: string; offerId?: string };
}) {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect("/login?redirect=/chat");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!currentUser) {
    redirect("/login");
  }

  const activeRole = (currentUser.activeRole as "CUSTOMER" | "DESIGNER") || "CUSTOMER";

  // Ambil thread langsung dari server untuk rendering instan tanpa delay
  let initialThreads: ThreadItem[] = [];

  if (activeRole === "DESIGNER") {
    const dbThreads = await prisma.chatThread.findMany({
      where: { designerId: currentUser.id },
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

    initialThreads = dbThreads.map((t) => ({
      id: t.id,
      title: t.title,
      lastMessage: t.lastMessage || "Mulai obrolan",
      lastMessageAt: t.lastMessageAt.toISOString(),
      otherUser: {
        id: t.customer.id,
        displayName: t.customer.displayName,
        username: t.customer.username || t.customer.displayName.toLowerCase().replace(/\s+/g, "_"),
        avatarUrl: t.customer.avatarUrl,
        roleLabel: "Pelanggan" as const,
      },
      order: t.order ? {
        ...t.order,
        deadlineAt: t.order.deadlineAt ? t.order.deadlineAt.toISOString() : null,
      } : null,
    }));
  } else {
    const dbThreads = await prisma.chatThread.findMany({
      where: { customerId: currentUser.id },
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

    initialThreads = dbThreads.map((t) => ({
      id: t.id,
      title: t.title,
      lastMessage: t.lastMessage || "Mulai obrolan",
      lastMessageAt: t.lastMessageAt.toISOString(),
      otherUser: {
        id: t.designer.id,
        displayName: t.designer.displayName,
        username: t.designer.username || t.designer.displayName.toLowerCase().replace(/\s+/g, "_"),
        avatarUrl: t.designer.avatarUrl,
        roleLabel: "Desainer" as const,
      },
      order: t.order ? {
        ...t.order,
        deadlineAt: t.order.deadlineAt ? t.order.deadlineAt.toISOString() : null,
      } : null,
    }));
  }

  // Tentukan thread aktif awal
  let initialActiveThreadId: string | null = null;
  const targetThreadId = searchParams?.threadId;
  const targetDesignerId = searchParams?.designerId;

  if (targetThreadId) {
    const matched = initialThreads.find((t) => t.id === targetThreadId);
    if (matched) initialActiveThreadId = matched.id;
  }
  if (!initialActiveThreadId && targetDesignerId) {
    const matched = initialThreads.find((t) => t.otherUser.id === targetDesignerId);
    if (matched) initialActiveThreadId = matched.id;
  }
  if (!initialActiveThreadId && initialThreads.length > 0) {
    initialActiveThreadId = initialThreads[0].id;
  }

  // Muat pesan awal untuk thread aktif pertama di server (zero delay, instant load)
  let initialMessages: ChatMessageItem[] = [];
  if (initialActiveThreadId) {
    // Tandai pesan belum terbaca dari lawan bicara sebagai telah dibaca
    await prisma.message.updateMany({
      where: {
        threadId: initialActiveThreadId,
        senderId: { not: currentUser.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    const dbMessages = await prisma.message.findMany({
      where: { threadId: initialActiveThreadId },
      orderBy: { createdAt: "asc" },
    });

    initialMessages = dbMessages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      isMe: m.senderId === currentUser.id,
      type: m.type,
      body: m.body,
      readAt: m.readAt ? m.readAt.toISOString() : null,
      isRead: Boolean(m.readAt),
      createdAt: m.createdAt.toISOString(),
    }));
  }

  return (
    <AppShell
      role={activeRole}
      displayName={currentUser.displayName || "Pengguna"}
    >
      <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-text">
            Pesan & Diskusi Desain
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Komunikasi terpisah antara peran pelanggan dan desainer agar pekerjaan dan pesanan tidak tercampur.
          </p>
        </div>

        <React.Suspense fallback={<div className="bg-surface border border-border rounded-lg p-8 text-center text-xs text-text-muted">Memuat obrolan...</div>}>
          <ChatViewClient
            currentUserId={currentUser.id}
            role={activeRole}
            initialThreads={initialThreads}
            initialActiveThreadId={initialActiveThreadId}
            initialMessages={initialMessages}
          />
        </React.Suspense>
      </div>
    </AppShell>
  );
}
