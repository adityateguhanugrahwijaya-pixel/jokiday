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
  ShieldCheck,
  Handshake,
  X,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { clsx } from "clsx";
import { playChatChime } from "@/lib/sound";

export interface PendingOfferItem {
  id: string;
  briefId: string;
  briefTitle: string;
  price: number;
  durationDays: number;
  revisionQuota: number;
  note: string;
  designerId: string;
  designerName: string;
}

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
  const targetDesignerId = searchParams?.get("designerId") || searchParams?.get("userId");
  const targetDesignerName = searchParams?.get("name");

  // Query parameters konteks brief dan penawaran
  const queryThreadId = searchParams?.get("threadId");
  const queryOfferId = searchParams?.get("offerId");
  const queryBriefId = searchParams?.get("briefId");
  const queryBriefTitle = searchParams?.get("briefTitle");
  const queryOfferPrice = searchParams?.get("offerPrice");
  const queryDurationDays = searchParams?.get("durationDays");
  const queryRevisionQuota = searchParams?.get("revisionQuota");
  const queryDesignerName = searchParams?.get("designerName");

  const [threads, setThreads] = useState<ThreadItem[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    queryThreadId || initialActiveThreadId || (initialThreads.length > 0 ? initialThreads[0].id : null)
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

  // State untuk penawaran aktif dan pop up konfirmasi kesepakatan
  const [pendingOffers, setPendingOffers] = useState<PendingOfferItem[]>([]);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [modalOfferId, setModalOfferId] = useState<string>("");
  const [modalBriefId, setModalBriefId] = useState<string>("");
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalPrice, setModalPrice] = useState<string>("");
  const [modalDuration, setModalDuration] = useState<string>("3");
  const [modalRevisions, setModalRevisions] = useState<string>("2");
  const [modalNotes, setModalNotes] = useState<string>("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [isAcceptingOfferId, setIsAcceptingOfferId] = useState<string | null>(null);
  const [isBriefLocked, setIsBriefLocked] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleSelectThread = (threadId: string) => {
    if (threadId === activeThreadId) return;
    setActiveThreadId(threadId);
    setIsBriefLocked(false);
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

  // Sinkronkan activeThreadId jika pengguna diarahkan dengan ?threadId=...
  useEffect(() => {
    if (queryThreadId && queryThreadId !== activeThreadId) {
      setActiveThreadId(queryThreadId);
    }
  }, [queryThreadId]);

  // Sinkronkan class chat-thread-active ke document.body agar navbar mobile otomatis disembunyikan saat ruang chat aktif dibuka
  useEffect(() => {
    if (activeThreadId) {
      document.body.classList.add("chat-thread-active");
    } else {
      document.body.classList.remove("chat-thread-active");
    }
    return () => {
      document.body.classList.remove("chat-thread-active");
    };
  }, [activeThreadId]);

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
        if (isMounted && data.success) {
          if (data.order) {
            setThreads((prev) =>
              prev.map((t) =>
                t.id === activeThreadId && (!t.order || t.order.id !== data.order.id)
                  ? { ...t, order: data.order }
                  : t
              )
            );
          }
          if (typeof data.isBriefLocked === "boolean") {
            setIsBriefLocked(data.isBriefLocked);
          }
          if (Array.isArray(data.pendingOffers)) {
            setPendingOffers(data.pendingOffers);
          }
          if (Array.isArray(data.messages)) {
            setMessages((prev) => {
              // Pertahankan pesan optimistik yang belum terkonfirmasi oleh server
              const optimistics = prev.filter((p) => p.isOptimistic);
              const serverIds = new Set(data.messages.map((m: any) => m.id));
              const remainingOptimistics = optimistics.filter(
                (opt) => !serverIds.has(opt.id)
              );
              const merged = [...data.messages, ...remainingOptimistics];
              setMessagesCache((cache) => ({ ...cache, [activeThreadId]: merged }));

              // Jika ada pesan baru dari lawan bicara saat percakapan sedang dibuka, bunyikan alert
              if (!isFirstLoad) {
                const prevOtherMsgs = prev.filter((p) => !p.isMe).length;
                const newOtherMsgs = data.messages.filter((m: any) => !m.isMe).length;
                if (newOtherMsgs > prevOtherMsgs) {
                  playChatChime();
                  setTimeout(() => scrollToBottom("smooth"), 50);
                }
              }

              return merged;
            });

            if (isFirstLoad) {
              isFirstLoad = false;
              setTimeout(() => scrollToBottom("auto"), 30);
            }
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

  // Handler Buka Pop Up Konfirmasi Penawaran (Khusus Desainer)
  const handleOpenOfferModal = (offer?: PendingOfferItem) => {
    if (offer) {
      setModalOfferId(offer.id);
      setModalBriefId(offer.briefId);
      setModalTitle(offer.briefTitle);
      setModalPrice(String(offer.price));
      setModalDuration(String(offer.durationDays));
      setModalRevisions(String(offer.revisionQuota));
      setModalNotes(offer.note || "");
    } else if (pendingOffers.length > 0) {
      const first = pendingOffers[0];
      setModalOfferId(first.id);
      setModalBriefId(first.briefId);
      setModalTitle(first.briefTitle);
      setModalPrice(String(first.price));
      setModalDuration(String(first.durationDays));
      setModalRevisions(String(first.revisionQuota));
      setModalNotes(first.note || "");
    } else {
      setModalOfferId(queryOfferId || "");
      setModalBriefId(queryBriefId || "");
      setModalTitle(queryBriefTitle || "Kesepakatan Desain");
      setModalPrice(queryOfferPrice || "50000");
      setModalDuration(queryDurationDays || "3");
      setModalRevisions(queryRevisionQuota || "2");
      setModalNotes("");
    }
    setIsOfferModalOpen(true);
  };

  // Handler Kirim Konfirmasi Penawaran ke Ruang Obrolan
  const handleSubmitOfferModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThreadId || isSubmittingOffer) return;

    const numPrice = Number(modalPrice);
    const numDuration = Number(modalDuration);
    const numRevisions = Number(modalRevisions);

    if (!numPrice || numPrice <= 0 || !Number.isInteger(numPrice)) {
      alert("Harga kesepakatan harus bilangan bulat positif dalam rupiah");
      return;
    }
    if (!numDuration || numDuration <= 0) {
      alert("Durasi pengerjaan minimal 1 hari kerja");
      return;
    }

    setIsSubmittingOffer(true);
    try {
      const res = await fetch(`/api/chat/threads/${activeThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OFFER_CONFIRMATION",
          offerData: {
            offerId: modalOfferId || undefined,
            briefId: modalBriefId || undefined,
            title: modalTitle || "Kesepakatan Desain",
            price: numPrice,
            durationDays: numDuration,
            revisionQuota: numRevisions,
            notes: modalNotes,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengirim konfirmasi penawaran");

      if (data.success && data.message) {
        setMessages((prev) => [...prev, { ...data.message, isMe: true }]);
        setTimeout(() => scrollToBottom("smooth"), 30);
      }

      setIsOfferModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Gagal mengirim konfirmasi penawaran");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // Handler Pelanggan: Konfirmasi & Terima Tawaran Langsung dari Chat -> Direct Payment Gateway
  const handleAcceptOfferFromChat = async (offerData: any) => {
    if (
      !confirm(
        `Konfirmasi menerima penawaran "${offerData.title}" sebesar ${formatRupiah(
          offerData.price
        )}? Kontrak akan dikunci dan Anda akan diarahkan langsung ke checkout pembayaran.`
      )
    ) {
      return;
    }

    setIsAcceptingOfferId(offerData.offerId);
    setErrorMsg("");

    try {
      // 1. Terima penawaran desainer dan buat order
      const acceptRes = await fetch("/api/offers/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offerData.offerId,
        }),
      });

      const acceptContentType = acceptRes.headers.get("content-type") || "";
      if (!acceptContentType.includes("application/json")) {
        throw new Error("Gagal menerima penawaran: Server tidak mengembalikan format data yang valid.");
      }

      const acceptData = await acceptRes.json();
      if (!acceptRes.ok) {
        throw new Error(acceptData.error?.message || "Gagal menerima penawaran");
      }

      const order = acceptData.order;

      // Update state lokal agar UI chat langsung terkunci dengan pesanan baru
      if (order && activeThreadId) {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeThreadId
              ? { ...t, order }
              : t
          )
        );
        setIsBriefLocked(true);
      }

      // 2. Inisialisasi pembayaran order (WaroengPay QRIS checkout)
      try {
        const payRes = await fetch("/api/orders/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            useBalance: false,
          }),
        });

        const payContentType = payRes.headers.get("content-type") || "";
        if (payContentType.includes("application/json")) {
          const payData = await payRes.json();
          if (payRes.ok && payData.checkoutUrl) {
            window.location.href = payData.checkoutUrl;
            return;
          }
        }
      } catch (payErr) {
        console.warn("Inisialisasi pembayaran gateway dilewati:", payErr);
      }

      // 3. Fallback langsung ke halaman detail order
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memproses kesepakatan");
      alert(err.message || "Gagal memproses kesepakatan");
      setIsAcceptingOfferId(null);
    }
  };

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
    <div className="flex-1 bg-surface border-0 md:border md:border-border rounded-none md:rounded-xl overflow-hidden flex flex-col md:flex-row min-h-0 md:shadow-sm h-full w-full">
      {/* PANEL KIRI: DAFTAR THREAD BERDASARKAN MODE AKTIF */}
      <div
        className={clsx(
          "w-full md:w-80 border-r border-border flex flex-col shrink-0 bg-surface min-h-0",
          activeThreadId ? "hidden md:flex" : "flex flex-1 md:flex-initial h-full"
        )}
      >
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
        <div className="flex-1 overflow-y-auto divide-y divide-border pb-20 md:pb-0">
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
      <div
        className={clsx(
          "flex-1 flex flex-col bg-background min-w-0 h-full",
          !activeThreadId ? "hidden md:flex" : "flex"
        )}
      >
        {activeThread ? (
          <>
            {/* Header Thread Aktif */}
            <div className="p-3 sm:p-3.5 border-b border-border bg-surface flex items-center justify-between gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveThreadId(null)}
                  className="md:hidden p-2 -ml-1 text-primary hover:bg-primary-soft rounded-lg flex items-center gap-1 font-bold text-xs shrink-0 touch-target min-w-[44px] min-h-[44px]"
                  title="Kembali ke daftar percakapan"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-xs font-bold">Daftar</span>
                </button>

                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                  {activeThread.otherUser.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h3 className="font-bold text-xs sm:text-sm text-text truncate">
                      {activeThread.otherUser.displayName}
                    </h3>
                    <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full bg-primary-soft text-primary">
                      {activeThread.otherUser.roleLabel}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-text-muted block truncate font-mono">
                    @{activeThread.otherUser.username} &bull; {activeThread.title}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {role === "DESIGNER" && !activeThread.order && !isBriefLocked && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenOfferModal()}
                    className="flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kirim Tawaran Baru</span>
                    <span className="sm:hidden">Tawaran Baru</span>
                  </Button>
                )}

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
            </div>

            {/* Banner Diskusi Penawaran Aktif atau Status Kesepakatan Terkunci */}
            {activeThread.order || isBriefLocked ? (
              <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-text block">
                      Kesepakatan Telah Dikonfirmasi
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {activeThread.order
                        ? `Pesanan resmi #${activeThread.order.id.slice(0, 8)} aktif. Brief dikunci dari penawaran lain.`
                        : "Proyek ini telah disepakati oleh pelanggan dengan desainer terpilih. Penawaran telah ditutup."}
                    </span>
                  </div>
                </div>
                {activeThread.order && (
                  <Link
                    href={`/orders/${activeThread.order.id}`}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
                  >
                    <span>Lihat Order</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ) : pendingOffers.length > 0 ? (
              <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs font-bold text-text truncate">
                      {pendingOffers[0].briefTitle}
                    </span>
                    <span className="text-xs font-extrabold text-primary font-money">
                      {formatRupiah(pendingOffers[0].price)}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted truncate mt-0.5">
                    {role === "DESIGNER"
                      ? "Diskusikan harga & deadline dengan klien. Anda yang menginput harga tawaran, klien yang menyetujui."
                      : "Baku tawar di chat dengan desainer. Desainer yang menginput harga dan batas waktu, lalu Anda yang menyetujui."}
                  </p>
                </div>

                {role === "DESIGNER" && (
                  <Button
                    variant="cta"
                    size="sm"
                    onClick={() => handleOpenOfferModal(pendingOffers[0])}
                    className="shrink-0 text-xs font-bold self-start sm:self-auto"
                  >
                    <Handshake className="w-3.5 h-3.5 mr-1" />
                    <span>Kirim Tawaran Baru</span>
                  </Button>
                )}
              </div>
            ) : null}

            {/* Bubble Messages (Live Stream) */}
            <div
              ref={chatContainerRef}
              className="flex-1 p-3 sm:p-4 pb-6 overflow-y-auto space-y-3 min-h-0"
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
                  if (m.type === "OFFER_CONFIRMATION") {
                    let offerData: any = null;
                    try {
                      offerData = JSON.parse(m.body);
                    } catch {
                      offerData = null;
                    }

                    if (!offerData) return null;

                    const isOrderCreated = Boolean(
                      activeThread.order || isBriefLocked
                    );

                    return (
                      <div key={m.id} className="w-full flex justify-center py-2">
                        <div className="w-full max-w-lg bg-surface border-2 border-primary/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                          {/* Header Card */}
                          <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <Sparkles className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                                  Tawaran Baru dari Desainer
                                </span>
                                <span className="text-xs text-text-muted">
                                  Diajukan oleh {offerData.designerName || "Desainer"}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              {isOrderCreated ? "Telah Disetujui" : "Menunggu Persetujuan Pelanggan"}
                            </span>
                          </div>

                          {/* Judul & Harga */}
                          <div className="space-y-1">
                            <h4 className="font-bold text-base text-text">
                              {offerData.title}
                            </h4>
                            <div className="font-money text-2xl font-extrabold text-primary">
                              {formatRupiah(offerData.price)}
                            </div>
                          </div>

                          {/* Detail Spesifikasi */}
                          <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-soft/60 rounded-xl p-3 border border-border">
                            <div className="flex items-center gap-1.5 text-text-muted">
                              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Batas Waktu: <strong className="text-text">{offerData.durationDays} hari kerja</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 text-text-muted">
                              <RotateCcw className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Revisi: <strong className="text-text">{offerData.revisionQuota}x kuota</strong></span>
                            </div>
                          </div>

                          {/* Catatan / Lingkup Pekerjaan */}
                          {(offerData.note || offerData.notes) && (
                            <div className="text-xs text-text-muted bg-background/60 rounded-lg p-2.5 border border-border/60">
                              <span className="font-medium text-text block mb-0.5">Catatan & Deliverables:</span>
                              <p className="whitespace-pre-wrap leading-relaxed">{offerData.note || offerData.notes}</p>
                            </div>
                          )}

                          {/* Action Area */}
                          <div className="pt-1">
                            {role === "CUSTOMER" ? (
                              isOrderCreated ? (
                                <div className="flex flex-col gap-2">
                                  <div className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1.5 bg-emerald-500/10 py-2 rounded-lg">
                                    <Check className="w-4 h-4" />
                                    <span>Tawaran Sudah Disetujui</span>
                                  </div>
                                  {activeThread.order ? (
                                    <Link
                                      href={`/orders/${activeThread.order.id}`}
                                      className="w-full text-center py-2 px-3 rounded-lg bg-surface border border-border text-xs font-bold text-primary hover:bg-neutral-soft transition-colors"
                                    >
                                      Lihat Detail Pesanan & Pembayaran
                                    </Link>
                                  ) : (
                                    <span className="text-[11px] text-text-muted text-center block py-1">
                                      Brief telah dikonfirmasi dan ditutup untuk penawaran lain.
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Button
                                    variant="cta"
                                    size="md"
                                    isLoading={isAcceptingOfferId === offerData.offerId}
                                    disabled={Boolean(isAcceptingOfferId)}
                                    onClick={() => handleAcceptOfferFromChat(offerData)}
                                    className="w-full flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-sm"
                                  >
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>Setujui Tawaran & Bayar Sekarang</span>
                                  </Button>
                                  <p className="text-[11px] text-center text-text-muted">
                                    Jika ingin menawar harga atau batas waktu, silakan sampaikan di obrolan chat.
                                  </p>
                                </div>
                              )
                            ) : (
                              <div className="space-y-2">
                                <div className="text-center p-2.5 rounded-lg bg-neutral-soft text-xs text-text-muted">
                                  {isOrderCreated ? (
                                    <span className="text-emerald-600 font-semibold flex items-center justify-center gap-1.5">
                                      <Check className="w-4 h-4" />
                                      <span>Pelanggan telah menyetujui tawaran ini!</span>
                                    </span>
                                  ) : (
                                    <span>Tawaran terkirim ke klien. Menunggu pelanggan memutuskan setuju atau menawar.</span>
                                  )}
                                </div>
                                {!isOrderCreated && !isBriefLocked && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenOfferModal()}
                                    className="w-full py-1 px-3 rounded text-[11px] font-semibold text-primary hover:underline text-center"
                                  >
                                    Revisi atau Kirim Tawaran Baru Lainnya
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-border/40">
                            <span className="font-mono">ID: {offerData.offerId ? offerData.offerId.slice(0, 8) : "-"}</span>
                            <span className="font-mono">{formatChatTime(m.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

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

            {/* Prompt Aksi Cepat Kirim Tawaran untuk Desainer */}
            {role === "DESIGNER" && (
              <div className="px-3 py-1.5 bg-neutral-soft/80 border-t border-border flex items-center justify-between text-xs text-text-muted">
                <span>Klien ingin negosiasi harga atau batas waktu pengerjaan?</span>
                <button
                  type="button"
                  onClick={() => handleOpenOfferModal()}
                  className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Handshake className="w-3.5 h-3.5" />
                  <span>Kirim Tawaran Baru</span>
                </button>
              </div>
            )}

            {/* Form Input Pesan (Live Send) */}
            <form
              onSubmit={handleSendMessage}
              className="p-2 sm:p-3 bg-surface border-t border-border flex items-center gap-2 shrink-0 sticky bottom-0 z-10 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
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
                className="flex-1 h-11 px-4 bg-background border border-border rounded-full text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSending}
                disabled={!messageText.trim()}
                className="h-11 w-11 rounded-full p-0 flex items-center justify-center shrink-0 shadow-xs touch-target"
                title="Kirim pesan"
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

      {/* MODAL POP UP KIRIM TAWARAN BARU (SISI DESAINER) */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary-soft text-primary">
                  <Handshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text">
                    Kirim Tawaran Baru ke Klien
                  </h3>
                  <p className="text-xs text-text-muted">
                    Hanya desainer yang dapat menginput harga dan batas waktu. Pelanggan yang akan menyetujui di chat.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-neutral-soft transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOfferModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Judul Proyek / Brief
                </label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="Contoh: Desain Logo Brand & Identitas Visual"
                  className="w-full h-10 px-3.5 bg-background border border-border rounded-lg text-xs sm:text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Harga Penawaran Baru (Rupiah)
                </label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={1000}
                  value={modalPrice}
                  onChange={(e) => setModalPrice(e.target.value)}
                  placeholder="Contoh: 350000"
                  className="w-full h-10 px-3.5 bg-background border border-border rounded-lg text-xs sm:text-sm font-mono text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-primary font-money font-semibold mt-1">
                  Preview: {formatRupiah(Number(modalPrice) || 0)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Batas Waktu / Deadline (Hari Kerja)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={60}
                    value={modalDuration}
                    onChange={(e) => setModalDuration(e.target.value)}
                    className="w-full h-10 px-3.5 bg-background border border-border rounded-lg text-xs sm:text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Kuota Revisi
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={10}
                    value={modalRevisions}
                    onChange={(e) => setModalRevisions(e.target.value)}
                    className="w-full h-10 px-3.5 bg-background border border-border rounded-lg text-xs sm:text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Catatan Deliverables / Lingkup Desain
                </label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Contoh: 3 Opsi konsep logo, file master AI/EPS, export PNG transparan 300 DPI."
                  className="w-full p-3 bg-background border border-border rounded-lg text-xs sm:text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOfferModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="cta"
                  size="sm"
                  isLoading={isSubmittingOffer}
                  className="flex items-center gap-1.5"
                >
                  <Handshake className="w-4 h-4" />
                  <span>Kirim Tawaran ke Chat</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
