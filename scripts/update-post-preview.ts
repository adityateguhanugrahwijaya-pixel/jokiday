import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { WatermarkService } from "../src/server/media/watermark.service";

const prisma = new PrismaClient();

async function fetchRemoteImageDoh(urlStr: string): Promise<Buffer | null> {
  try {
    const url = new URL(urlStr);
    const dohRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(url.hostname)}&type=A`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!dohRes.ok) return null;
    const dohData = (await dohRes.json()) as any;
    const realIp = dohData.Answer?.find((a: any) => a.type === 1)?.data;
    if (!realIp) return null;

    return await new Promise<Buffer | null>((resolve) => {
      const req = https.request(
        {
          hostname: realIp,
          port: 443,
          path: `${url.pathname}${url.search}`,
          method: "GET",
          headers: { Host: url.hostname, "User-Agent": "Mozilla/5.0 JokiDay/1.0" },
          servername: url.hostname,
          rejectUnauthorized: false,
          timeout: 8000,
        },
        (res) => {
          if (res.statusCode !== 200) return resolve(null);
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      );
      req.on("error", () => resolve(null));
      req.end();
    });
  } catch {
    return null;
  }
}

async function main() {
  console.log("Updating post previews with subtle, simple watermark...");

  const posts = await prisma.post.findMany({
    include: { previewAsset: true, designer: { include: { user: true } } },
  });

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "previews");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  for (const post of posts) {
    if (!post.previewAssetId) continue;
    const username = post.designer.user.username || post.designer.user.displayName || "designer";
    const usernameSlug = username.toLowerCase().replace(/\s+/g, "_");

    console.log(`Processing post ${post.id} (${post.caption}) by @${usernameSlug}...`);

    let rawBuffer: Buffer | null = null;

    // Check if asset has remote URL
    const remoteUrl = post.previewAsset?.driveFileId?.startsWith("http")
      ? post.previewAsset.driveFileId
      : post.id === "7a13a0a0-4097-4eb0-b131-a77e6adcb729"
      ? "https://ik.imagekit.io/dkzba08rg/jokiday/portfolio/wm_bed067ff-f781-46c2-92b3-f8670ee2b1dc_fWaC8OMNJ.jpg"
      : null;

    if (remoteUrl) {
      console.log(`Downloading original via DoH: ${remoteUrl}...`);
      rawBuffer = await fetchRemoteImageDoh(remoteUrl);
    }

    if (!rawBuffer) {
      const possibleFilenames = [
        `wm_${post.previewAssetId}.jpg`,
        `${post.previewAssetId}.jpg`,
        post.previewAssetId,
      ];
      for (const fn of possibleFilenames) {
        const p = path.join(uploadsDir, fn);
        if (fs.existsSync(p)) {
          rawBuffer = fs.readFileSync(p);
          break;
        }
      }
    }

    if (rawBuffer) {
      const { buffer: newWmBuffer, width, height } = await WatermarkService.applyWatermark(
        rawBuffer,
        {
          username: usernameSlug,
          maxPx: 1200,
        }
      );

      const targetFileName = `wm_${post.previewAssetId}.jpg`;
      const targetFilePath = path.join(uploadsDir, targetFileName);
      fs.writeFileSync(targetFilePath, newWmBuffer);
      console.log(`[OK] Saved new subtle watermarked preview to ${targetFilePath}`);

      await prisma.previewAsset.update({
        where: { id: post.previewAssetId },
        data: {
          driveFileId: `/uploads/previews/${targetFileName}`,
          width,
          height,
          isBroken: false,
        },
      });
      console.log(`[OK] Updated previewAsset record in DB.`);
    }
  }

  // Also update demo previews
  for (let i = 1; i <= 6; i++) {
    const demoFn = `demo-preview-${i}.jpg`;
    const demoPath = path.join(uploadsDir, demoFn);
    if (fs.existsSync(demoPath)) {
      const buf = fs.readFileSync(demoPath);
      const { buffer: newWm } = await WatermarkService.applyWatermark(buf, {
        username: "budi.designer",
        maxPx: 1200,
      });
      fs.writeFileSync(demoPath, newWm);
      console.log(`[OK] Updated demo preview ${demoFn}`);
    }
  }

  console.log("All previews updated successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
