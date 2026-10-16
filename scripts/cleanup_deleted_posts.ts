import { PostCleanupService } from "../src/server/feed/post-cleanup.service";

async function main() {
  const isDryRun = process.argv.includes("--dry-run") || process.argv.includes("-n");
  console.log(`[CLEANUP] Menjalankan pembersihan post feed (Dry Run: ${isDryRun})...`);

  const result = await PostCleanupService.cleanupOldDeletedPosts(isDryRun);

  console.log(`[CLEANUP] Retensi: ${result.retentionDays} hari`);
  console.log(`[CLEANUP] Batas waktu (threshold): ${result.thresholdDate.toISOString()}`);
  console.log(`[CLEANUP] Ditemukan kandidat kedaluwarsa: ${result.candidatesCount}`);
  console.log(`[CLEANUP] Post dibersihkan permanen: ${result.purgedCount}`);
  console.log(`[CLEANUP] File preview lokal dibersihkan: ${result.cleanedLocalFilesCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[CLEANUP ERROR]:", err);
    process.exit(1);
  });
