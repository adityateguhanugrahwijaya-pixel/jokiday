"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import {
  Send,
  User,
  Clock,
  RotateCcw,
  ShoppingBag,
  Palette,
  ExternalLink,
  ChevronRight,
  Check,
  CheckCheck,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

export interface ThreadItem {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: string;
  otherUser: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    roleLabel: "Desainer" | "Pelanggan";
  };
  order: {
    id: string;
    status: string;
    price: number;
    durationDays: number;
    revisionQuota: number;
    deadlineAt: string | null;
  } | null;
}

export interface ChatMessageItem {
  id: string;
  senderId: string;
  isMe: boolean;
  type: string;
  body: string;
  readAt?: string | null;
  isRead?: boolean;
  isOptimistic?: boolean;
  createdAt: string;
}

function formatChatTime(isoString: string) {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ChatViewClient({
  currentUserId,
  role,
  initialThreads = [],
  initialActiveThreadId = null,
  initialMessages = [],
}: {
  currentUserId: string;
  role: "CUSTOMER" | "DESIGNER";
  initialThreads?: ThreadItem[];
  initialActiveThreadId?: string | null;
  initialMessages?: ChatMessageItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetDesignerId = searchParams?.get("designerId");
  const targetDesignerName = searchParams?.get("name");

  const [threads, setThreads] = useState<ThreadItem[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialActiveThreadId || (initialThreads.length > 0 ? initialThreads[0].id : null)
  );
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [messagesCache, setMessagesCache] = useState<Record<string, ChatMessageItem[]>>(() => {
    if (initialActiveThreadId && initialMessages.length > 0) {
      return { [initialActiveThreadId]: initialMessages };
    }
    return {};
  });
  const [messageText, setMessageText] = useState("");
  const [isLoadingThreads, setIsLoadingThreads] = useState(initialThreads.length === 0);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleSelectThread = (threadId: string) => {
    if (threadId === activeThreadId) return;
    setActiveThreadId(threadId);
    if (messagesCache[threadId] && messagesCache[threadId].length > 0) {
      setMessages(messagesCache[threadId]);
      setIsLoadingMessages(false);
    } else {
      setMessages([]);
      setIsLoadingMessages(true);
    }
  };

  // 1. Muat Thread Percakapan Sesuai Peran Aktif Akun
  const loadThreads = async () => {
    try {
      const res = await fetch("/api/chat/threads");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Gagal memuat daftar percakapan");
      }
      const data = await res.json();
      const fetchedThreads = data.threads || [];
      setThreads(fetchedThreads);

      if (fetchedThreads.length > 0 && !activeThreadId) {
        if (targetDesignerId) {
          const matched = fetchedThreads.find(
            (t: ThreadItem) => t.otherUser.id === targetDesignerId
          );
          if (matched) {
            setActiveThreadId(matched.id);
            return;
          }
        }
        setActiveThreadId(fetchedThreads[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  useEffect(() => {
    // Jalankan loadThreads hanya jika initialThreads kosong atau peran berganti
    if (threads.length === 0) {
      loadThreads();
    }
    // Live Polling daftar thread setiap 3 detik
    const threadInterval = setInterval(loadThreads, 3000);
    return () => clearInterval(threadInterval);
  }, [role]);

  // 2. Jika ada query parameter ?designerId dan belum ada thread, mulai otomatis thread baru
  useEffect(() => {
    if (targetDesignerId && !isLoadingThreads && role === "CUSTOMER") {
      const existing = threads.find((t) => t.otherUser.id === targetDesignerId);
      if (!existing) {
        fetch("/api/chat/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            designerId: targetDesignerId,
            initialMessage: `Halo kak ${targetDesignerName || "Desainer"}, saya tertarik berkonsultasi mengenai kebutuhan desain saya.`,
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.threadId) {
              loadThreads().then(() => {
                setActiveThreadId(data.threadId);
              });
            }
          })
          .catch(console.error);
      }
    }
  }, [targetDesignerId, isLoadingThreads, role]);

  // 3. Live Polling Pesan di Thread Aktif setiap 1000ms (1 Detik)
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    let isFirstLoad = messages.length === 0;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/threads/${activeThreadId}/messages`);
        if (!res.ok) return;

        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.messages)) {
          setMessages((prev) => {
            // Pertahankan pesan optimistik yang belum terkonfirmasi oleh server
            const optimistics = prev.filter((p) => p.isOptimistic);
            const serverIds = new Set(data.messages.map((m: any) => m.id));
            const remainingOptimistics = optimistics.filter(
              (opt) => !serverIds.has(opt.id)
            );
            const merged = [...data.messages, ...remainingOptimistics];
            setMessagesCache((cache) => ({ ...cache, [activeThreadId]: merged }));
            return merged;
          });

          if (isFirstLoad) {
            isFirstLoad = false;
            setTimeout(() => scrollToBottom("auto"), 30);
          }
        }
      } catch (err) {
        console.error("Gagal sinkronisasi pesan live:", err);
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    };

    // Ambil pesan segera
    fetchMessages();

    const messageInterval = setInterval(fetchMessages, 1000);
    return () => {
      isMounted = false;
      clearInterval(messageInterval);
    };
  }, [activeThreadId]);

  // 4. Kirim Pesan dengan Update Optimistik Cepat (Live & Zero Delay)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeThreadId || isSending) return;

    const sendingText = messageText.trim();
    setMessageText("");

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageItem = {
      id: tempId,
      senderId: currentUserId,
      isMe: true,
      type: "TEXT",
      body: sendingText,
      readAt: null,
      isRead: false,
      isOptimistic: true,
      createdAt: new Date().toISOString(),
    };

    // Tampilkan langsung di antarmuka (Centang Satu)
    setMessages((prev) => {
      const updated = [...prev, optimisticMsg];
      setMessagesCache((cache) => ({ ...cache, [activeThreadId]: updated }));
      return updated;
    });
    setTimeout(() => scrollToBottom("smooth"), 30);

    try {
      const res = await fetch(`/api/chat/threads/${activeThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sendingText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengirim pesan");

      if (data.success && data.message) {
        setMessages((prev) => {
          const updated = prev.map((m) => (m.id === tempId ? { ...data.message, isMe: true } : m));
          setMessagesCache((cache) => ({ ...cache, [activeThreadId]: updated }));
          return updated;
        });

        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeThreadId
              ? {
                  ...t,
                  lastMessage: sendingText,
                  lastMessageAt: new Date().toISOString(),
                }
              : t
          )
        );
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert(err.message || "Gagal mengirim pesan");
    }
  };

  const activeThread = threads.find((t) => t.id === activeThreadId);

  return (
    <div className="flex-1 bg-surface border border-border rounded-xl overflow-hidden flex flex-col md:flex-row min-h-0 shadow-sm">
      {/* PANEL KIRI: DAFTAR THREAD BERDASARKAN MODE AKTIF */}
      <div className="w-full md:w-80 border-r border-border flex flex-col shrink-0 bg-surface">
        {/* Header Kotak Pesan Sesuai Mode */}
        <div className="p-3.5 border-b border-border bg-neutral-soft/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {role === "DESIGNER" ? (
              <div className="p-1.5 bg-primary-soft text-primary rounded-md">
                <Palette className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-1.5 bg-secondary-soft text-secondary-text rounded-md">
                <ShoppingBag className="w-4 h-4" />
              </div>
            )}
            <div>
              <h2 className="text-xs font-bold text-text">
                {role === "DESIGNER" ? "Pesan Klien (Desainer)" : "Pesan Desainer (Pelanggan)"}
              </h2>
              <p className="text-[11px] text-text-muted">
                {role === "DESIGNER"
                  ? "Inquiry pesanan masuk dari pelanggan"
                  : "Konsultasi Anda dengan para desainer"}
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-background border border-border text-text">
            {threads.length} Obrolan
          </span>
        </div>

        {/* List Threads */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {isLoadingThreads ? (
            <div className="p-8 text-center text-xs text-text-muted">
              Memuat daftar obrolan...
            </div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-xs text-text-muted">
              <MessageSquare className="w-8 h-8 mx-auto text-text-muted" />
              <p className="font-semibold text-text">
                {role === "DESIGNER"
                  ? "Belum ada pesan dari pelanggan"
                  : "Belum ada percakapan aktif"}
              </p>
              <p className="text-[11px] leading-relaxed">
                {role === "DESIGNER"
                  ? "Pesan konsultasi dan pesanan paket jasa dari pelanggan akan otomatis masuk ke sini."
                  : "Mulai konsultasi dengan desainer melalui halaman portofolio atau pasar brief."}
              </p>
            </div>
          ) : (
            threads.map((t) => {
              const isActive = t.id === activeThreadId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectThread(t.id)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                    isActive
                      ? "bg-primary-soft/70 border-l-4 border-l-primary"
                      : "hover:bg-neutral-soft/60"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs">
                    {t.otherUser.avatarUrl ? (
                      <img
                        src={t.otherUser.avatarUrl}
                        alt={t.otherUser.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      t.otherUser.displayName.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold text-xs text-text truncate">
                        {t.otherUser.displayName}
                      </span>
                      <span className="text-[10px] text-text-muted shrink-0 font-mono">
                        {formatChatTime(t.lastMessageAt)}
                      </span>
                    </div>

                    <p className="text-xs text-text-muted truncate">
                      {t.lastMessage}
                    </p>

                    {t.order && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-soft text-text font-mono font-medium">
                          Order #{t.order.id.slice(0, 6)}
                        </span>
                        <span className="text-[10px] font-bold text-primary">
                          {formatRupiah(t.order.price)}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* PANEL TENGAH: RUANG OBROLAN LIVE & CENTANG DUA */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {activeThread ? (
          <>
            {/* Header Thread Aktif */}
            <div className="p-3.5 border-b border-border bg-surface flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                  {activeThread.otherUser.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-text truncate">
                      {activeThread.otherUser.displayName}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-soft text-primary">
                      {activeThread.otherUser.roleLabel}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted block truncate font-mono">
                    @{activeThread.otherUser.username} &bull; {activeThread.title}
                  </span>
                </div>
              </div>

              {activeThread.order && (
                <Link
                  href={`/orders/${activeThread.order.id}`}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>Detail Order</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Bubble Messages (Live Stream) */}
            <div
              ref={chatContainerRef}
              className="flex-1 p-4 overflow-y-auto space-y-3"
            >
              {isLoadingMessages && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-text-muted space-y-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Memuat percakapan...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  Belum ada pesan. Ketik pesan di bawah untuk memulai obrolan live.
                </div>
              ) : (
                messages.map((m) => {
                  return (
                    <div
                      key={m.id}
                      className={`flex ${m.isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                          m.isMe
                            ? "bg-primary text-white rounded-br-none"
                            : "bg-surface border border-border text-text rounded-bl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>

                        <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                          <span
                            className={`text-[10px] font-mono ${
                              m.isMe ? "text-white/80" : "text-text-muted"
                            }`}
                          >
                            {formatChatTime(m.createdAt)}
                          </span>

                          {/* Indikator Centang Satu dan Centang Dua */}
                          {m.isMe && (
                            <>
                              {m.isRead ? (
                                <span
                                  title="Telah dibaca oleh penerima (Centang Dua)"
                                  className="text-sky-300 inline-flex items-center"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span
                                  title="Pesan terkirim ke server (Centang Satu)"
                                  className="text-white/70 inline-flex items-center"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Form Input Pesan (Live Send) */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-surface border-t border-border flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={
                  role === "CUSTOMER"
                    ? "Ketik pesan untuk desainer..."
                    : "Ketik balasan untuk pelanggan..."
                }
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 h-10 px-3.5 bg-background border border-border rounded-lg text-xs sm:text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSending}
                disabled={!messageText.trim()}
                className="h-10 px-4 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted text-xs space-y-2">
            <MessageSquare className="w-10 h-10 text-text-muted" />
            <p className="font-semibold text-text">Pilih Percakapan</p>
            <p className="max-w-xs leading-relaxed">
              Pilih salah satu obrolan di sebelah kiri untuk melihat pesan dan mulai berdiskusi secara live.
            </p>
          </div>
        )}
      </div>

      {/* PANEL KANAN: KONTEKS ORDER & DETAIL KONTRAK */}
      {activeThread && (
        <div className="hidden lg:flex flex-col w-72 border-l border-border bg-surface p-5 space-y-5 shrink-0 text-xs">
          <div>
            <h3 className="font-bold text-sm text-text">Konteks Diskusi</h3>
            <p className="text-text-muted mt-0.5 line-clamp-2">
              {activeThread.title}
            </p>
          </div>

          {activeThread.order ? (
            <div className="space-y-3 bg-neutral-soft/70 border border-border rounded-lg p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Order Terkait
              </span>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-muted">Nomor Order:</span>
                  <span className="font-mono font-bold text-text">
                    #{activeThread.order.id.slice(0, 8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Nilai:</span>
                  <span className="font-money font-bold text-text">
                    {formatRupiah(activeThread.order.price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Status:</span>
                  <span className="font-semibold text-primary">
                    {activeThread.order.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Durasi:</span>
                  <span className="font-medium text-text">
                    {activeThread.order.durationDays} hari kerja
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Kuota Revisi:</span>
                  <span className="font-medium text-text">
                    {activeThread.order.revisionQuota}x revisi
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/orders/${activeThread.order.id}`}
                  className="w-full inline-flex items-center justify-center h-8 rounded bg-surface border border-border text-primary font-bold text-xs hover:bg-background transition-colors"
                >
                  <span>Buka Halaman Order</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-soft/50 border border-dashed border-border rounded-lg p-4 text-center text-text-muted space-y-1">
              <p className="font-semibold text-text">Konsultasi Bebas</p>
              <p className="text-[11px] leading-relaxed">
                {role === "CUSTOMER"
                  ? "Kamu sedang berkonsultasi mengenai kebutuhan desain sebelum memesan paket jasa."
                  : "Calon pelanggan sedang berdiskusi mengenai proyek desain denganmu."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
