import { prisma } from "@/lib/db";

/**
 * Generate a URL-friendly and unique username based on the user's display name.
 * Example: "Aditya Teguh Wijaya" -> "aditya_teguh_wijaya"
 */
export async function generateUniqueUsername(
  displayName: string,
  currentUserId?: string
): Promise<string> {
  const baseSlug =
    displayName
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "designer";

  let candidate = baseSlug.slice(0, 30);
  let counter = 1;

  while (true) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing || (currentUserId && existing.id === currentUserId)) {
      return candidate;
    }

    counter++;
    candidate = `${baseSlug.slice(0, 25)}_${counter}`;
  }
}
