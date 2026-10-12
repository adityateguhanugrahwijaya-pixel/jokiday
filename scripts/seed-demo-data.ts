import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/crypto";
import { WatermarkService } from "../src/server/media/watermark.service";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const prisma = new PrismaClient();

async function main() {
  console.log("Memulai seeding data semi-real JokiDay...");

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "previews");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const passwordHash = await hashPassword("password123");

  // 1. Buat / update Desainer Budi Santoso
  const designer = await prisma.user.upsert({
    where: { email: "budi.designer@jokiday.com" },
    update: {
      passwordHash,
    },
    create: {
      email: "budi.designer@jokiday.com",
      passwordHash,
      displayName: "Budi Santoso",
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
          isVerified: true,
        },
      },
    },
    include: { designerProfile: true },
  });

  // Pastikan profile designer sudah ada dan terverifikasi
  await prisma.designerProfile.upsert({
    where: { userId: designer.id },
    update: { isVerified: true, ratingAvg: 4.9, completedCount: 42 },
    create: {
      userId: designer.id,
      bio: "Spesialis branding, identitas visual, logo minimalis dan kemasan produk UMKM.",
      categories: JSON.stringify(["logo", "branding", "poster", "kemasan"]),
      ratingAvg: 4.9,
      ratingCount: 38,
      completedCount: 42,
      isAvailable: true,
      isVerified: true,
    },
  });

  // 2. Buat / update Customer Ani Lestari
  await prisma.user.upsert({
    where: { email: "ani.customer@jokiday.com" },
    update: { passwordHash },
    create: {
      email: "ani.customer@jokiday.com",
      passwordHash,
      displayName: "Ani Lestari",
      isCustomer: true,
      isDesigner: false,
      activeRole: "CUSTOMER",
    },
  });

  // 3. Buat / update Admin
  await prisma.user.upsert({
    where: { email: "admin@jokiday.com" },
    update: { passwordHash },
    create: {
      email: "admin@jokiday.com",
      passwordHash,
      displayName: "Admin JokiDay",
      isCustomer: false,
      isDesigner: false,
      isAdmin: true,
      activeRole: "CUSTOMER",
    },
  });

  console.log("Akun demo Budi (Desainer), Ani (Customer), dan Admin siap.");

  // 4. Sample works artwork generator
  const sampleDesigns = [
    {
      title: "Identitas Visual & Logo Kopi Senja",
      category: "logo",
      bgColor: "#1E293B",
      accentColor: "#F59E0B",
      iconSvg: `
        <circle cx="300" cy="300" r="140" fill="#F59E0B" fill-opacity="0.15" />
        <circle cx="300" cy="300" r="110" stroke="#F59E0B" stroke-width="8" fill="none" />
        <path d="M250 260 C250 220 350 220 350 260 C350 340 250 340 250 260 Z" fill="#F59E0B" />
        <text x="300" y="470" font-family="sans-serif" font-size="34" font-weight="bold" fill="#F8FAFC" text-anchor="middle">KOPI SENJA</text>
        <text x="300" y="510" font-family="sans-serif" font-size="18" fill="#94A3B8" text-anchor="middle">ARTISAN ROASTERY</text>
      `,
    },
    {
      title: "Desain Kemasan Pouch Kripik Nusantara",
      category: "kemasan",
      bgColor: "#064E3B",
      accentColor: "#34D399",
      iconSvg: `
        <rect x="180" y="160" width="240" height="340" rx="20" fill="#047857" stroke="#34D399" stroke-width="6" />
        <rect x="210" y="220" width="180" height="120" rx="10" fill="#064E3B" />
        <circle cx="300" cy="280" r="35" fill="#FBBF24" />
        <text x="300" y="400" font-family="sans-serif" font-size="26" font-weight="bold" fill="#ECFDF5" text-anchor="middle">KRIPIK SINGKONG</text>
        <text x="300" y="435" font-family="sans-serif" font-size="16" fill="#A7F3D0" text-anchor="middle">RESEP TRADISIONAL • 150G</text>
      `,
    },
    {
      title: "Poster Eksplorasi Musik Senja Pantai",
      category: "poster",
      bgColor: "#4C1D95",
      accentColor: "#F472B6",
      iconSvg: `
        <circle cx="300" cy="250" r="120" fill="#DB2777" />
        <path d="M120 480 Q300 360 480 480 L480 600 L120 600 Z" fill="#312E81" />
        <text x="300" y="270" font-family="sans-serif" font-size="42" font-weight="900" fill="#FDF2F8" text-anchor="middle">SENJA FEST</text>
        <text x="300" y="320" font-family="sans-serif" font-size="18" font-weight="bold" fill="#FBCFE8" text-anchor="middle">LIVE ACOUSTIC EXPERIENCE</text>
        <text x="300" y="540" font-family="sans-serif" font-size="20" font-weight="bold" fill="#F472B6" text-anchor="middle">24 NOVEMBER 2026</text>
      `,
    },
    {
      title: "Branding Identitas Brand Kosmetik Glow Organic",
      category: "branding",
      bgColor: "#831843",
      accentColor: "#FBCFE8",
      iconSvg: `
        <circle cx="300" cy="270" r="90" fill="none" stroke="#F472B6" stroke-width="6" />
        <path d="M260 270 Q300 200 340 270 Q300 340 260 270 Z" fill="#F472B6" fill-opacity="0.7" />
        <text x="300" y="430" font-family="sans-serif" font-size="32" font-weight="bold" fill="#FFF1F2" text-anchor="middle">GLOW ORGANIC</text>
        <text x="300" y="470" font-family="sans-serif" font-size="16" fill="#FECDD3" text-anchor="middle">NATURAL SKIN SCIENCE</text>
      `,
    },
    {
      title: "Desain Label Botol Minuman Cold Brew Segar",
      category: "kemasan",
      bgColor: "#78350F",
      accentColor: "#FDE68A",
      iconSvg: `
        <rect x="160" y="140" width="280" height="380" rx="16" fill="#92400E" stroke="#FDE68A" stroke-width="4" />
        <text x="300" y="250" font-family="sans-serif" font-size="36" font-weight="extrabold" fill="#FEF3C7" text-anchor="middle">COLD BREW</text>
        <text x="300" y="295" font-family="sans-serif" font-size="18" fill="#FDE68A" text-anchor="middle">100% ARABICA SINGLE ORIGIN</text>
        <line x1="200" y1="330" x2="400" y2="330" stroke="#FDE68A" stroke-width="2" />
        <text x="300" y="380" font-family="sans-serif" font-size="24" font-weight="bold" fill="#FEF3C7" text-anchor="middle">500 ML</text>
      `,
    },
    {
      title: "Logo Geometric Tech Nusantara Solusi",
      category: "logo",
      bgColor: "#0F172A",
      accentColor: "#38BDF8",
      iconSvg: `
        <polygon points="300,160 410,230 410,370 300,440 190,370 190,230" fill="none" stroke="#38BDF8" stroke-width="10" />
        <polygon points="300,210 370,255 370,345 300,390 230,345 230,255" fill="#38BDF8" fill-opacity="0.3" />
        <text x="300" y="500" font-family="sans-serif" font-size="30" font-weight="bold" fill="#F0F9FF" text-anchor="middle">NUSANTARA TECH</text>
      `,
    },
  ];

  for (let i = 0; i < sampleDesigns.length; i++) {
    const item = sampleDesigns[i];
    const fileName = `demo-preview-${i + 1}.jpg`;
    const targetFilePath = path.join(uploadsDir, fileName);

    // 1. Buat SVG dasar
    const svgBase = `
      <svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="600" fill="${item.bgColor}" />
        ${item.iconSvg}
      </svg>
    `;

    // 2. Render dengan sharp menjadi buffer PNG mentah
    const rawBuffer = await sharp(Buffer.from(svgBase)).png().toBuffer();

    // 3. Bakar watermark JokiDay menggunakan WatermarkService
    const watermarked = await WatermarkService.applyWatermark(rawBuffer, {
      username: "budi.designer",
      maxPx: 1200,
    });

    // 4. Simpan ke public/uploads/previews
    fs.writeFileSync(targetFilePath, watermarked.buffer);

    const publicUrl = `/uploads/previews/${fileName}`;

    // 5. Simpan PreviewAsset
    const previewAsset = await prisma.previewAsset.create({
      data: {
        driveFileId: publicUrl,
        width: watermarked.width,
        height: watermarked.height,
      },
    });

    // 6. Simpan Post karya
    await prisma.post.create({
      data: {
        designerId: designer.id,
        caption: item.title,
        category: item.category,
        driveFileId: `mock-drive-id-${i + 1}`,
        previewAssetId: previewAsset.id,
      },
    });

    console.log(`[OK] Diposting karya: "${item.title}" (${item.category}) -> ${publicUrl}`);
  }

  console.log("Semua karya portofolio ber-watermark berhasil diunggah ke feed JokiDay!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
