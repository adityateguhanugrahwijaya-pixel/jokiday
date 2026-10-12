import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function generateScryptHash(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function main() {
  const configs = [
    { key: "platform_fee_percent", value: "5", description: "Persentase potongan platform dari harga deal" },
    { key: "payment_expires_hours", value: "24", description: "Batas waktu bayar setelah deal sebelum batal otomatis" },
    { key: "auto_approve_days", value: "3", description: "Batas waktu customer merespons hasil deliver sebelum auto-approve" },
    { key: "market_brief_expires_days", value: "7", description: "Masa aktif brief mode pasar jika tidak ada deal" },
    { key: "offer_expires_days", value: "3", description: "Masa berlaku penawaran designer jika tidak direspons" },
    { key: "overdue_grace_hours", value: "24", description: "Tenggang waktu setelah deadline sebelum auto-refund" },
    { key: "dispute_response_hours", value: "48", description: "Batas waktu respons dispute sebelum diputuskan sepihak" },
    { key: "min_withdrawal", value: "50000", description: "Batas minimum penarikan saldo dompet dalam rupiah" },
    { key: "withdrawal_fee", value: "0", description: "Biaya penarikan saldo" },
    { key: "max_upload_mb", value: "100", description: "Maksimal ukuran upload file dalam megabyte" },
    { key: "preview_max_px", value: "1200", description: "Dimensi maksimum sisi panjang gambar pratinjau watermark" },
  ];

  for (const cfg of configs) {
    await prisma.appConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value, description: cfg.description },
      create: cfg,
    });
  }

  // Seed default users (customer, designer, admin)
  const defaultPasswordHash = generateScryptHash("password123");

  const designer = await prisma.user.upsert({
    where: { email: "budi.designer@jokiday.com" },
    update: {},
    create: {
      email: "budi.designer@jokiday.com",
      passwordHash: defaultPasswordHash,
      displayName: "Budi Santoso",
      avatarUrl: null,
      isCustomer: true,
      isDesigner: true,
      activeRole: "DESIGNER",
      designerProfile: {
        create: {
          bio: "Spesialis branding, identitas visual, logo minimalis dan kemasan produk UMKM.",
          categories: JSON.stringify(["logo", "branding", "poster", "kemasan"]),
          ratingAvg: 4.9,
          ratingCount: 38,
          completedCount: 42,
          isAvailable: true,
        },
      },
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "ani.customer@jokiday.com" },
    update: {},
    create: {
      email: "ani.customer@jokiday.com",
      passwordHash: defaultPasswordHash,
      displayName: "Ani Lestari",
      avatarUrl: null,
      isCustomer: true,
      isDesigner: false,
      activeRole: "CUSTOMER",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@jokiday.com" },
    update: {},
    create: {
      email: "admin@jokiday.com",
      passwordHash: defaultPasswordHash,
      displayName: "Admin JokiDay",
      avatarUrl: null,
      isCustomer: false,
      isDesigner: false,
      isAdmin: true,
      activeRole: "CUSTOMER",
    },
  });

  console.log("Database seeded successfully with configs and initial demo users.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
