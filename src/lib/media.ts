/**
 * Helper tunggal dan terpadu untuk resolusi URL gambar pratinjau (Single Source of Truth).
 * 
 * Aturan Resolusi:
 * 1. Jika driveFileId adalah URL absolut (http/https misal ImageKit CDN), kembalikan langsung
 *    agar browser klien dapat memuat gambar secara cepat via CDN edge tanpa proxy serverless.
 * 2. Jika driveFileId adalah path statis lokal (/uploads/...), kembalikan langsung.
 * 3. Jika asset memiliki ID di database, fallback ke route /api/previews/${asset.id}.
 * 4. Jika asset tidak ada, kembalikan string kosong atau fallback aman.
 */
export function resolvePreviewUrl(
  asset?: { id?: string | null; driveFileId?: string | null } | null
): string {
  if (!asset) return "";

  const driveFileId = (asset.driveFileId || "").trim();

  // 1. URL CDN eksternal (ImageKit, CloudFront, S3, dll.)
  if (driveFileId.startsWith("http://") || driveFileId.startsWith("https://")) {
    return driveFileId;
  }

  // 2. Berkas statis di direktori public (/uploads/...)
  if (driveFileId.startsWith("/uploads/")) {
    return driveFileId;
  }

  // 3. Fallback route API internal jika asset ID terdaftar
  if (asset.id && asset.id.trim()) {
    return `/api/previews/${asset.id.trim()}`;
  }

  return driveFileId;
}
