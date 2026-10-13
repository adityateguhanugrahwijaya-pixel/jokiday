import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";

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
      // Jika driveFileId adalah path relatif lokal
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

      // Jika driveFileId adalah URL remote (misal ImageKit CDN)
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

    return new NextResponse("File pratinjau tidak ditemukan", { status: 404 });
  } catch (err: any) {
    console.error("[PreviewProxy] Gagal menyajikan pratinjau:", err);
    return new NextResponse("Terjadi kesalahan server saat memuat pratinjau", {
      status: 500,
    });
  }
}
