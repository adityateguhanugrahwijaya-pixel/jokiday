import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { WatermarkService } from "../src/server/media/watermark.service";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating post previews with perfected dense watermark...");

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

    // Check if we already have scratch-final-dark.jpg or downloaded buffer
    if (post.id === '7a13a0a0-4097-4eb0-b131-a77e6adcb729' && fs.existsSync('scratch-post2-downloaded.jpg')) {
      rawBuffer = fs.readFileSync('scratch-post2-downloaded.jpg');
    } else {
      // Check existing file in previews
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
      console.log(`[OK] Saved new watermarked preview to ${targetFilePath}`);

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

  console.log("All previews updated successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
