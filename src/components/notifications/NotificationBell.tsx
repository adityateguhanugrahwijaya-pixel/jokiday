"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Periksa dukungan Web Push di browser
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
      const perm = Notification.permission;
      setPushPermission(perm);

      // Daftarkan service worker
      navigator.serviceWorker.register("/sw.js").then(async (registration) => {
        // Jika izin sudah granted di browser, pastikan subscription aktif tersinkronisasi ke akun yang sedang login
        if (perm === "granted") {
          try {
            let sub = await registration.pushManager.getSubscription();
            if (!sub) {
              const keyRes = await fetch("/api/notifications/vapid-key");
              if (keyRes.ok) {
                const keyData = await keyRes.json();
                if (keyData.publicKey) {
                  sub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
                  });
                }
              }
            }

            if (sub) {
              const subJson = sub.toJSON();
              if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
                await fetch("/api/notifications/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    keys: subJson.keys,
                  }),
                });
              }
            }
          } catch (syncErr) {
            console.warn("[Push] Gagal sinkronisasi otomatis subscription:", syncErr);
          }
        }
      }).catch((err) => {
        console.warn("[Push] Gagal mendaftarkan service worker:", err);
      });
    }
  }, []);

  // Ambil notifikasi dari server
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Abaikan jika unauthenticated
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling setiap 30 detik
    return () => clearInterval(interval);
  }, []);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Aktifkan Web Push Notification menggunakan VAPID Key
  const handleEnablePush = async () => {
    if (!pushSupported) return;
    setIsSubscribing(true);

    try {
      // 1. Minta izin ke pengguna
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        setIsSubscribing(false);
        return;
      }

      // 2. Ambil VAPID Public Key dari server
      const keyRes = await fetch("/api/notifications/vapid-key");
      const keyData = await keyRes.json();
      if (!keyData.publicKey) {
        throw new Error("VAPID public key tidak tersedia");
      }

      // 3. Daftarkan Push Subscription ke browser
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });

      // 4. Kirim endpoint dan kunci enkripsi ke server database
      const subJson = subscription.toJSON();
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      // Uji push langsung lokal untuk konfirmasi
      registration.showNotification("JokiDay Notifikasi Aktif", {
        body: "Anda akan menerima kabar instan saat ada pesanan baru atau revisi.",
        icon: "/favicon.ico",
      });
    } catch (err: any) {
      console.error("[Push] Gagal mengaktifkan push:", err);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Tandai semua dibaca
  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
    } catch {
      // Abaikan error
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-text-muted hover:text-text hover:bg-background rounded-full transition-colors touch-target"
        title="Notifikasi"
        aria-label="Lihat Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-white bg-primary rounded-full ring-2 ring-surface animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-xl shadow-xl py-3 z-50 text-xs overflow-hidden">
          {/* Header */}
          <div className="px-4 pb-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-text text-sm">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary-soft text-primary font-bold text-[10px]">
                  {unreadCount} Baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>Tandai Dibaca</span>
              </button>
            )}
          </div>

          {/* Banner Web Push VAPID */}
          {pushSupported && pushPermission !== "granted" && (
            <div className="mx-3 my-2.5 p-3 rounded-lg bg-primary-soft/60 border border-primary/20 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-bold text-primary text-[11px]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Aktifkan Web Push Notification</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Dapatkan pemberitahuan langsung di layar saat ada pembayaran pesanan dan penyerahan desain.
              </p>
              <button
                onClick={handleEnablePush}
                disabled={isSubscribing}
                className="self-start px-3 py-1 bg-primary text-white rounded font-bold text-[11px] hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isSubscribing ? "Mengaktifkan..." : "Izinkan Notifikasi"}
              </button>
            </div>
          )}

          {/* List Notifikasi */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-text-muted">
                <Bell className="w-8 h-8 mx-auto mb-2 text-border" />
                <p>Belum ada notifikasi saat ini</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 hover:bg-background transition-colors ${
                      isUnread ? "bg-primary-soft/20" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-semibold text-text ${isUnread ? "text-primary" : ""}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-text-muted shrink-0">
                        {new Date(n.createdAt).toLocaleDateString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-text-muted text-[11px] mt-0.5 line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                    {n.url && (
                      <Link
                        href={n.url}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] text-primary font-bold mt-1.5 hover:underline"
                      >
                        <span>Lihat Rincian</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
