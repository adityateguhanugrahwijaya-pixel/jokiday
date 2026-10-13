import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "../src/lib/db";
import { PushNotificationService } from "../src/server/push/push.service";

async function main() {
  console.log("=== PENGUJIAN END-TO-END PUSH NOTIFICATION CHAT ===");

  const targetUserId = "dff7585e-33ca-4ad3-9e48-57e229902f3c";

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: targetUserId },
  });

  console.log(`Jumlah subscription terdaftar di DB untuk user ${targetUserId}: ${subs.length}`);
  if (subs.length === 0) {
    console.error("Gagal: Tidak ada subscription aktif untuk diuji.");
    return;
  }

  // 1. Uji pengiriman nyata lewat PushNotificationService.notifyUser
  console.log("\n[1] Mengirim notifikasi chat melalui PushNotificationService.notifyUser()...");
  const testPayload = {
    type: "CHAT_MESSAGE",
    title: "Pesan baru dari Pelanggan (Verifikasi E2E)",
    body: "Halo, ini pesan verifikasi push notification saat web ditutup.",
    url: "/chat?chatid=test_thread_verification_123",
    payload: {
      threadId: "test_thread_verification_123",
      testMarker: "test_verification_run",
    },
  };

  const notification = await PushNotificationService.notifyUser(targetUserId, testPayload);
  console.log("Record in-app notification berhasil dibuat di database ID:", notification.id);

  // 2. Uji langsung fungsi sendPushToUser
  console.log("\n[2] Mengirim Web Push VAPID langsung lewat sendPushToUser()...");
  const successCount = await PushNotificationService.sendPushToUser(targetUserId, {
    title: testPayload.title,
    body: testPayload.body,
    url: testPayload.url,
    tag: "test-chat-push",
  });

  console.log(`Hasil pengiriman: ${successCount} perangkat berhasil menerima push.`);

  // Bersihkan HANYA record test notification sementara yang baru saja dibuat
  await prisma.notification.delete({
    where: { id: notification.id },
  });
  console.log("Test notification DB record berhasil dibersihkan (data user asli tetap utuh).");

  console.log("\n=== VERIFIKASI SELESAI DENGAN SUKSES ===");
}

main()
  .catch((err) => {
    console.error("Fatal error during E2E test:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
