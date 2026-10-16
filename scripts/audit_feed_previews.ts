import { prisma } from "../src/lib/db";
import fs from "node:fs/promises";
import path from "node:path";

interface AuditResult {
  postId: string;
  caption: string;
  designerName: string;
  designerUsername: string;
  assetId: string;
  storedDriveFileId: string;
  status: "OK" | "WARNING" | "BROKEN";
  reason: string;
  details?: Record<string, any>;
}

async function auditFeedPreviews() {
  console.log("================================================================");
  console.log("   AUDIT READ-ONLY PRATINJAU FEED & PORTOFOLIO JOKIDAY          ");
  console.log("================================================================\n");

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "previews");

  // Ambil semua Post dari database
  const posts = await prisma.post.findMany({
    include: {
      previewAsset: true,
      designer: {
        include: {
          user: {
            include: { driveConnection: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const results: AuditResult[] = [];
  let okCount = 0;
  let brokenCount = 0;
  let warningCount = 0;

  for (const post of posts) {
    const asset = post.previewAsset;
    const designerUser = post.designer?.user;
    const storedDriveFileId = asset?.driveFileId || "";

    if (!asset) {
      brokenCount++;
      results.push({
        postId: post.id,
        caption: post.caption,
        designerName: designerUser?.displayName || "Tidak diketahui",
        designerUsername: designerUser?.username || "-",
        assetId: "-",
        storedDriveFileId: "-",
        status: "BROKEN",
        reason: "Record PreviewAsset tidak ditemukan di database (data yatim)",
      });
      continue;
    }

    // 1. Cek keberadaan file di penyimpanan lokal
    const possibleFilenames = [
      asset.id,
      `${asset.id}.jpg`,
      `wm_${asset.id}.jpg`,
      `wm_order_${asset.id}.jpg`,
      path.basename(storedDriveFileId),
    ];

    let foundLocalFile: string | null = null;
    for (const fn of possibleFilenames) {
      if (!fn || fn === "." || fn === "/") continue;
      const fullPath = path.join(uploadsDir, fn);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isFile() && stat.size > 0) {
          foundLocalFile = fn;
          break;
        }
      } catch {
        // File tidak ada
      }
    }

    if (foundLocalFile) {
      okCount++;
      results.push({
        postId: post.id,
        caption: post.caption,
        designerName: designerUser?.displayName || "-",
        designerUsername: designerUser?.username || "-",
        assetId: asset.id,
        storedDriveFileId,
        status: "OK",
        reason: `File pratinjau lokal tersedia (${foundLocalFile})`,
      });
      continue;
    }

    // 2. Cek apakah storedDriveFileId adalah URL Remote (ImageKit CDN / HTTP)
    if (storedDriveFileId.startsWith("http://") || storedDriveFileId.startsWith("https://")) {
      try {
        const headRes = await fetch(storedDriveFileId, { method: "HEAD", signal: AbortSignal.timeout(4000) });
        if (headRes.ok) {
          okCount++;
          results.push({
            postId: post.id,
            caption: post.caption,
            designerName: designerUser?.displayName || "-",
            designerUsername: designerUser?.username || "-",
            assetId: asset.id,
            storedDriveFileId,
            status: "OK",
            reason: `Pratinjau remote cloud CDN aktif (${headRes.status})`,
          });
          continue;
        } else {
          brokenCount++;
          results.push({
            postId: post.id,
            caption: post.caption,
            designerName: designerUser?.displayName || "-",
            designerUsername: designerUser?.username || "-",
            assetId: asset.id,
            storedDriveFileId,
            status: "BROKEN",
            reason: `URL remote CDN mengembalikan status HTTP ${headRes.status}`,
          });
          continue;
        }
      } catch (httpErr: any) {
        warningCount++;
        results.push({
          postId: post.id,
          caption: post.caption,
          designerName: designerUser?.displayName || "-",
          designerUsername: designerUser?.username || "-",
          assetId: asset.id,
          storedDriveFileId,
          status: "WARNING",
          reason: `Gagal menghubungi URL remote CDN: ${httpErr.message}`,
        });
        continue;
      }
    }

    // 3. Cek apakah ada file di Google Drive
    const driveConn = designerUser?.driveConnection;
    if (driveConn && driveConn.status === "ACTIVE") {
      warningCount++;
      results.push({
        postId: post.id,
        caption: post.caption,
        designerName: designerUser?.displayName || "-",
        designerUsername: designerUser?.username || "-",
        assetId: asset.id,
        storedDriveFileId,
        status: "WARNING",
        reason: "File belum dicache secara lokal di server, memerlukan unduhan dari Google Drive desainer",
      });
      continue;
    }

    // 4. File benar-benar tidak ditemukan
    brokenCount++;
    results.push({
      postId: post.id,
      caption: post.caption,
      designerName: designerUser?.displayName || "-",
      designerUsername: designerUser?.username || "-",
      assetId: asset.id,
      storedDriveFileId,
      status: "BROKEN",
      reason: "File fisik hilang dari disk server dan Google Drive tidak terhubung",
    });
  }

  // Cetak Hasil
  console.log(`TOTAL POSTINGAN FEED DIPINDAI : ${posts.length}`);
  console.log(`  - Pratinjau Sehat & Tersedia (OK)   : ${okCount}`);
  console.log(`  - Peringatan / Perlu Unduh (WARN)   : ${warningCount}`);
  console.log(`  - Pratinjau Rusak / Hilang (BROKEN) : ${brokenCount}\n`);

  console.log("RINCIAN HASIL AUDIT PER POSTINGAN:");
  results.forEach((r, idx) => {
    const icon = r.status === "OK" ? "[OK] " : r.status === "WARNING" ? "[WARN]" : "[FAIL]";
    console.log(`${idx + 1}. ${icon} ID: ${r.postId}`);
    console.log(`   Judul/Caption : "${r.caption}"`);
    console.log(`   Desainer      : ${r.designerName} (@${r.designerUsername})`);
    console.log(`   PreviewAsset  : ${r.assetId}`);
    console.log(`   Path/Drive ID : ${r.storedDriveFileId}`);
    console.log(`   Status        : ${r.status} - ${r.reason}\n`);
  });

  // Cek juga PreviewAsset yatim
  const allAssets = await prisma.previewAsset.findMany({
    include: {
      posts: { select: { id: true } },
      deliveryFiles: { select: { id: true } },
    },
  });

  const orphanAssets = allAssets.filter((a) => a.posts.length === 0 && a.deliveryFiles.length === 0);
  console.log(`TOTAL PREVIEW_ASSETS DI DB : ${allAssets.length}`);
  console.log(`ASSET YATIM (ORPHAN)       : ${orphanAssets.length}`);
  if (orphanAssets.length > 0) {
    orphanAssets.forEach((a) => {
      console.log(`  - ID: ${a.id}, driveFileId: ${a.driveFileId}, isBroken: ${a.isBroken}`);
    });
  }
}

auditFeedPreviews()
  .catch((err) => {
    console.error("Kesalahan saat menjalankan audit:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
