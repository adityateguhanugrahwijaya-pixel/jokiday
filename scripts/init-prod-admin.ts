import { prisma } from "../src/lib/db";
import { hashPassword, verifyPassword } from "../src/lib/crypto";
import { AuthService } from "../src/server/auth/auth.service";

async function main() {
  console.log("Memulai konfigurasi akun admin resmi untuk mode PROD...");

  // 1. Bersihkan sisa akun dummy testing
  const deleted = await prisma.user.deleteMany({
    where: {
      email: {
        in: ["cust@test.com", "des1@test.com", "des2@test.com"],
      },
    },
  });
  console.log(`Dibersihkan: ${deleted.count} akun test lama.`);

  // 2. Buat / perbarui akun admin resmi
  const adminEmail = "admin@jokiday.com";
  const adminPassword = "password123";
  const passwordHash = await hashPassword(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      displayName: "Administrator",
      isAdmin: true,
      passwordHash,
    },
    create: {
      email: adminEmail,
      displayName: "Administrator",
      passwordHash,
      isAdmin: true,
      isCustomer: true,
      isDesigner: false,
      activeRole: "CUSTOMER",
    },
  });

  console.log("Akun Admin berhasil disiapkan di database Neon:");
  console.log({
    id: admin.id,
    email: admin.email,
    displayName: admin.displayName,
    isAdmin: admin.isAdmin,
  });

  // 3. Verifikasi hash
  const isValid = await verifyPassword(adminPassword, admin.passwordHash);
  console.log("Verifikasi hash internal:", isValid ? "VALID (OK)" : "GAGAL");

  // 4. Test simulasi AuthService.login
  const authResult = await AuthService.login(adminEmail, adminPassword);
  console.log("AuthService.login simulasi:", authResult.user);
  console.log("Token JWT terbit:", Boolean(authResult.token));
}

main()
  .catch((e) => {
    console.error("Terjadi kesalahan:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
