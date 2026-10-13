import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import webpush from "web-push";
import { prisma } from "../src/lib/db";

async function main() {
  const sub = await prisma.pushSubscription.findFirst({
    where: { userId: "dff7585e-33ca-4ad3-9e48-57e229902f3c" },
  });

  if (!sub) {
    console.log("No push subscription found in DB for user dff7585e-33ca-4ad3-9e48-57e229902f3c");
    return;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  console.log("VAPID Config:", {
    hasPublicKey: Boolean(publicKey),
    hasPrivateKey: Boolean(privateKey),
  });

  webpush.setVapidDetails(
    "mailto:admin@jokiday.com",
    publicKey || "",
    privateKey || ""
  );

  console.log("Testing endpoint:", sub.endpoint.slice(0, 70) + "...");

  try {
    const res = await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      },
      JSON.stringify({
        title: "Test Diagnosa JokiDay",
        body: "Verifikasi alur push notification langsung dari server",
        url: "/chat",
      }),
      {
        TTL: 60,
        urgency: "high",
      }
    );

    console.log("Push Service Response SUCCESS:", {
      statusCode: res.statusCode,
      headers: res.headers,
      body: res.body,
    });
  } catch (err: any) {
    console.log("Push Service Response FAILED:", {
      statusCode: err.statusCode,
      name: err.name,
      message: err.message,
      body: err.body,
      headers: err.headers,
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
