import webpush from "web-push";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export class PushNotificationService {
  private static isConfigured = false;

  private static ensureConfigured() {
    if (this.isConfigured) return;

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const appUrl = getAppUrl();
    const contactEmail = process.env.EMAIL_FROM?.match(/<([^>]+)>/)?.[1] || "jokiday@agentkikir.cloud";

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(
          `mailto:${contactEmail}`,
          publicKey,
          privateKey
        );
        this.isConfigured = true;
      } catch (err) {
        console.warn("[PushNotificationService] Gagal mengatur VAPID details:", err);
      }
    }
  }

  /**
   * Mengambil VAPID Public Key untuk browser client
   */
  static getPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY || "";
  }

  /**
   * Menyimpan langganan Push Subscription dari browser pengguna ke database
   */
  static async subscribe(userId: string, subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }) {
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      throw new Error("Format push subscription tidak valid");
    }

    return prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  /**
   * Menghapus langganan Push Subscription saat logout atau izin dicabut
   */
  static async unsubscribe(endpoint: string) {
    return prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }

  /**
   * Mengirim pesan Web Push Notification ke seluruh perangkat aktif milik pengguna
   */
  static async sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
    this.ensureConfigured();

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return 0;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || getAppUrl(),
      icon: payload.icon || "/favicon.ico",
      badge: payload.badge || "/favicon.ico",
      tag: payload.tag || `jokiday-${Date.now()}`,
    });

    let successCount = 0;
    const expiredEndpoints: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            notificationPayload
          );
          successCount++;
        } catch (err: any) {
          // HTTP 404 atau 410 menunjukkan subscription sudah tidak aktif pada server browser
          if (err.statusCode === 404 || err.statusCode === 410) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.warn(`[PushNotificationService] Gagal mengirim push ke ${sub.endpoint.slice(0, 30)}...:`, err.message);
          }
        }
      })
    );

    // Bersihkan subscription yang sudah kedaluwarsa secara otomatis
    if (expiredEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: expiredEndpoints } },
      });
    }

    return successCount;
  }

  /**
   * Mengirim notifikasi gabungan: In-App Database Notification + Web Push Notification
   */
  static async notifyUser(
    userId: string,
    data: {
      type: string;
      title: string;
      body: string;
      url?: string;
      payload?: Record<string, any>;
    }
  ) {
    // 1. Simpan ke database sebagai In-App Notification
    const inApp = await prisma.notification.create({
      data: {
        userId,
        type: data.type,
        payload: JSON.stringify({
          title: data.title,
          body: data.body,
          url: data.url,
          ...data.payload,
        }),
      },
    });

    // 2. Kirim Web Push Notification jika ada browser terdaftar
    try {
      await this.sendPushToUser(userId, {
        title: data.title,
        body: data.body,
        url: data.url,
        tag: data.type.toLowerCase(),
      });
    } catch (pushErr) {
      console.warn("[PushNotificationService] Gagal kirim web push:", pushErr);
    }

    return inApp;
  }
}
