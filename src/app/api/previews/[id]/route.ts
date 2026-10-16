import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import { DriveService } from "@/server/drive/drive.service";
import { WatermarkService } from "@/server/media/watermark.service";

export const dynamic = "force-dynamic";

/**
 * Fetch gambar eksternal (misal ImageKit) secara tangguh.
 * Jika ISP (seperti Telkom) mencegat DNS ik.imagekit.io ke Internet Positif (36.86.63.185),
 * fallback otomatis menyelesaikan IP CloudFront asli melalui DNS over HTTPS (DoH) Google/Cloudflare.
 */
async function fetchRemoteImageWithDohFallback(urlStr: string): Promise<Buffer | null> {
  const url = new URL(urlStr);

  // 1. Coba fetch standar terlebih dahulu
  try {
    const res = await fetch(urlStr, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 JokiDay/1.0" },
      redirect: "manual",
    });

    if (res.status === 200 && res.headers.get("content-type")?.startsWith("image/")) {
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    }
  } catch {
    // Lanjut ke fallback DoH
  }

  // 2. Fallback DoH jika terblokir atau dialihkan (misal DNS Telkom Internet Positif)
  try {
    const dohRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(url.hostname)}&type=A`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!dohRes.ok) return null;

    const dohData = (await dohRes.json()) as {
      Answer?: Array<{ name: string; type: number; data: string }>;
    };

    // Ambil IP tipe A (IPv4)
    const ipRecord = dohData.Answer?.find((a) => a.type === 1);
    if (!ipRecord?.data) return null;

    const realIp = ipRecord.data;

    return await new Promise<Buffer | null>((resolve) => {
      const req = https.request(
        {
          hostname: realIp,
          port: 443,
          path: `${url.pathname}${url.search}`,
          method: "GET",
          headers: {
            Host: url.hostname,
            "User-Agent": "Mozilla/5.0 JokiDay/1.0",
          },
          servername: url.hostname,
          rejectUnauthorized: false,
          timeout: 7000,
        },
        (res) => {
          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      );

      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params.id;
    if (!rawId) {
      return new NextResponse("ID pratinjau tidak valid", { status: 400 });
    }

    // Sanitasi nama file / ID untuk mencegah directory traversal
    const safeId = path.basename(rawId).replace(/[^a-zA-Z0-9_.-]/g, "");
    if (!safeId) {
      return new NextResponse("ID pratinjau tidak valid", { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "previews");

    // 1. Cek keberadaan file di penyimpanan lokal disk
    const possibleFilenames = [
      safeId,
      `${safeId}.jpg`,
      `wm_order_${safeId}.jpg`,
      `wm_${safeId}.jpg`,
    ];

    for (const filename of possibleFilenames) {
      const fullPath = path.join(uploadsDir, filename);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          const fileBuffer = await fs.readFile(fullPath);
          return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }
      } catch {
        // File tidak ada, lanjut cari pola berikutnya
      }
    }

    // 2. Jika belum ada di disk lokal, cari metadata PreviewAsset di database
    const asset = await prisma.previewAsset.findFirst({
      where: {
        OR: [
          { id: safeId },
          { driveFileId: { contains: safeId } },
        ],
      },
    });

    if (asset?.driveFileId) {
      // 2a. Jika driveFileId adalah path relatif lokal
      if (asset.driveFileId.startsWith("/uploads/previews/")) {
        const localRelFile = path.basename(asset.driveFileId);
        const localRelPath = path.join(uploadsDir, localRelFile);
        try {
          const fileBuffer = await fs.readFile(localRelPath);
          return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch {
          // File tidak ditemukan di path relatif
        }
      }

      // 2b. Jika driveFileId adalah URL internal /api/previews/<id>
      if (asset.driveFileId.startsWith("/api/previews/")) {
        const nestedId = path.basename(asset.driveFileId).replace(/[^a-zA-Z0-9_.-]/g, "");
        if (nestedId && nestedId !== safeId) {
          for (const fn of [nestedId, `${nestedId}.jpg`, `wm_${nestedId}.jpg`, `wm_order_${nestedId}.jpg`]) {
            const nestedPath = path.join(uploadsDir, fn);
            try {
              const stat = await fs.stat(nestedPath);
              if (stat.isFile()) {
                const fileBuffer = await fs.readFile(nestedPath);
                return new NextResponse(new Uint8Array(fileBuffer), {
                  status: 200,
                  headers: {
                    "Content-Type": "image/jpeg",
                    "Cache-Control": "public, max-age=31536000, immutable",
                  },
                });
              }
            } catch {
              // Lanjut
            }
          }
        }
      }

      // 2c. Jika driveFileId adalah URL remote (misal ImageKit CDN)
      if (
        asset.driveFileId.startsWith("http://") ||
        asset.driveFileId.startsWith("https://")
      ) {
        const remoteBuffer = await fetchRemoteImageWithDohFallback(
          asset.driveFileId
        );

        if (remoteBuffer && remoteBuffer.length > 0) {
          // Simpan ke cache lokal agar request berikutnya langsung cepat
          try {
            await fs.mkdir(uploadsDir, { recursive: true });
            const cacheFilename = `wm_order_${asset.id}.jpg`;
            await fs.writeFile(path.join(uploadsDir, cacheFilename), remoteBuffer);
          } catch (writeErr) {
            console.warn("[PreviewProxy] Gagal simpan cache lokal:", writeErr);
          }

          return new NextResponse(new Uint8Array(remoteBuffer), {
            status: 200,
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }
      }
    }

    // 3. Coba resolusi Google Drive desainer jika preview berasal dari Post atau Delivery
    if (asset) {
      const post = await prisma.post.findFirst({
        where: { previewAssetId: asset.id },
        include: {
          designer: {
            include: {
              user: {
                include: { driveConnection: true },
              },
            },
          },
        },
      });

      const driveConn = post?.designer?.user?.driveConnection;
      const targetDriveFileId =
        post?.driveFileId &&
        !post.driveFileId.startsWith("orig_") &&
        !post.driveFileId.startsWith("local_")
          ? post.driveFileId
          : asset.driveFileId &&
            !asset.driveFileId.startsWith("/") &&
            !asset.driveFileId.startsWith("http")
          ? asset.driveFileId
          : null;

      if (driveConn && driveConn.status === "ACTIVE" && targetDriveFileId) {
        try {
          const { buffer: driveBuffer, mimeType } = await DriveService.downloadFile(
            driveConn.refreshTokenEnc,
            targetDriveFileId
          );

          if (driveBuffer && mimeType.startsWith("image/")) {
            const username = post?.designer?.user?.displayName || "designer";
            const usernameSlug = username.toLowerCase().replace(/\s+/g, "_");
            const { buffer: wmBuffer } = await WatermarkService.applyWatermark(driveBuffer, {
              username: usernameSlug,
              maxPx: 1200,
            });

            try {
              await fs.mkdir(uploadsDir, { recursive: true });
              await fs.writeFile(path.join(uploadsDir, `wm_${asset.id}.jpg`), wmBuffer);
            } catch (fsWriteErr) {
              console.warn("[PreviewProxy] Gagal simpan cache Drive lokal:", fsWriteErr);
            }

            return new NextResponse(new Uint8Array(wmBuffer), {
              status: 200,
              headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          }
        } catch (driveErr) {
          console.warn("[PreviewProxy] Gagal unduh file dari Google Drive desainer:", driveErr);
        }
      }
    }

    // 4. File benar-benar tidak ditemukan: log dan tandai record isBroken di database
    if (asset) {
      console.warn(`[PreviewProxy] File pratinjau tidak ditemukan untuk PreviewAsset ID: ${asset.id}`);
      await prisma.previewAsset
        .update({
          where: { id: asset.id },
          data: { isBroken: true },
        })
        .catch(() => {});
    }

    // Jika request berasal dari tag <img> browser, kirimkan fallback SVG yang ramah agar tata letak kartu tidak rusak
    const acceptHeader = _req.headers.get("accept") || "";
    if (
      acceptHeader.includes("image/*") ||
      acceptHeader.includes("image/") ||
      !acceptHeader.includes("application/json")
    ) {
      const fallbackSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450" fill="none">
  <rect width="600" height="450" fill="#f8fafc"/>
  <rect x="20" y="20" width="560" height="410" rx="16" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 6"/>
  <g transform="translate(300, 205)" text-anchor="middle">
    <circle cx="0" cy="-24" r="32" fill="#e2e8f0"/>
    <path d="M-10 -34 L10 -14 M-10 -14 L10 -34" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
    <text y="36" fill="#475569" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700">Preview Sedang Tidak Tersedia</text>
    <text y="58" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="12">File pratinjau belum dapat dimuat saat ini</text>
  </g>
</svg>`.trim();

      return new NextResponse(fallbackSvg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    return new NextResponse("File pratinjau tidak ditemukan", { status: 404 });
  } catch (err: any) {
    console.error("[PreviewProxy] Gagal menyajikan pratinjau:", err);
    return new NextResponse("Terjadi kesalahan server saat memuat pratinjau", {
      status: 500,
    });
  }
}
