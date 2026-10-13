"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { playChatChime } from "@/lib/sound";

interface LatestMessage {
  id: string;
  threadId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

export function ChatNotificationListener() {
  const pathname = usePathname();
  const router = useRouter();

  const [activeToast, setActiveToast] = useState<{
    senderName: string;
    body: string;
    threadId: string;
  } | null>(null);

  const prevCountRef = useRef<number | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkUnreadCount = async () => {
    try {
      const res = await fetch("/api/chat/unread-count");
      if (!res.ok) return;
      const data = await res.json();
      const currentCount = Number(data.unreadCount || 0);

      // Dispatch event agar Navbar & Sidebar langsung update angka merahnya
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("jokiday_chat_unread_update", {
            detail: { count: currentCount },
          })
        );
      }

      // Jika pertama kali load, simpan count awal tanpa bunyikan alert
      if (prevCountRef.current === null) {
        prevCountRef.current = currentCount;
        if (data.latestUnreadMessage) {
          lastMessageIdRef.current = data.latestUnreadMessage.id;
        }
        return;
      }

      // Jika ada pesan baru masuk
      if (currentCount > (prevCountRef.current || 0) && data.latestUnreadMessage) {
        const latest: LatestMessage = data.latestUnreadMessage;

        // Cegah alert ganda untuk ID pesan yang sama
        if (lastMessageIdRef.current !== latest.id) {
          lastMessageIdRef.current = latest.id;

          // 1. Bunyikan nada alert notifikasi
          playChatChime();

          // 2. Jika pengguna sedang TIDAK membuka thread yang bersangkutan, tampilkan toast banner
          const isCurrentlyInThisThread =
            pathname === "/chat" &&
            typeof window !== "undefined" &&
            window.location.search.includes(latest.threadId);

          if (!isCurrentlyInThisThread) {
            setActiveToast({
              senderName: latest.senderName,
              body: latest.body,
              threadId: latest.threadId,
            });

            if (toastTimeoutRef.current) {
              clearTimeout(toastTimeoutRef.current);
            }
            toastTimeoutRef.current = setTimeout(() => {
              setActiveToast(null);
            }, 6000);
          }
        }
      }

      prevCountRef.current = currentCount;
    } catch {
      // Abaikan error jaringan sementara
    }
  };

  useEffect(() => {
    checkUnreadCount();

    // Polling setiap 6 detik
    const interval = setInterval(checkUnreadCount, 6000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        checkUnreadCount();
      }
    };

    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [pathname]);

  if (!activeToast) return null;

  return (
    <div className="fixed top-18 right-4 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="bg-surface border-2 border-primary/30 rounded-xl p-3.5 shadow-floating flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <MessageSquare className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-bold text-xs text-text truncate">
              {activeToast.senderName}
            </span>
            <span className="text-[10px] text-primary font-semibold">
              Pesan Baru
            </span>
          </div>

          <p className="text-xs text-text-muted mt-0.5 line-clamp-2 leading-snug">
            {activeToast.body}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <Link
              href={`/chat?threadId=${activeToast.threadId}`}
              onClick={() => setActiveToast(null)}
              className="px-2.5 py-1 rounded bg-primary text-white text-[11px] font-bold hover:bg-primary-hover transition-colors"
            >
              Buka Chat
            </Link>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="text-[11px] text-text-muted hover:text-text px-1.5 py-1"
            >
              Tutup
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveToast(null)}
          className="text-text-muted hover:text-text p-1 -mr-1 -mt-1 rounded-md"
          aria-label="Tutup notifikasi"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Hook untuk membaca unread chat count di komponen manapun (Navbar, Sidebar, dsb).
 */
export function useUnreadChatCount() {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    // Ambil jumlah unread saat awal mount
    fetch("/api/chat/unread-count")
      .then((res) => (res.ok ? res.json() : { unreadCount: 0 }))
      .then((data) => {
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {});

    // Listener custom event dari ChatNotificationListener
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      if (customEvent.detail && typeof customEvent.detail.count === "number") {
        setUnreadCount(customEvent.detail.count);
      }
    };

    window.addEventListener("jokiday_chat_unread_update", handleUpdate);
    return () => {
      window.removeEventListener("jokiday_chat_unread_update", handleUpdate);
    };
  }, []);

  return unreadCount;
}
