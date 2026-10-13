import { prisma } from "../src/lib/db";

async function main() {
  const designers = await prisma.user.findMany({
    where: { isDesigner: true },
    include: { designerProfile: true },
  });

  console.log(`Found ${designers.length} designers in database.`);

  for (const designer of designers) {
    if (!designer.designerProfile) {
      console.log(`Creating DesignerProfile for ${designer.displayName} (${designer.id})...`);
      const profile = await prisma.designerProfile.upsert({
        where: { userId: designer.id },
        update: {
          isVerified: true,
          isAvailable: true,
        },
        create: {
          userId: designer.id,
          bio: designer.displayName === "Aditya Teguh Wijaya"
            ? "Desainer grafis & branding spesialis identitas visual dan logo kreatif."
            : "Kreator visual profesional untuk kemasan produk, banner, dan konten media sosial.",
          categories: JSON.stringify(
            designer.displayName === "Aditya Teguh Wijaya"
              ? ["Logo", "Branding", "Poster"]
              : ["Kemasan", "Media", "Poster"]
          ),
          ratingAvg: 5.0,
          ratingCount: 1,
          completedCount: 1,
          isVerified: true,
          isAvailable: true,
        },
      });
      console.log(`Created profile for ${designer.displayName}:`, profile);
    } else if (!designer.designerProfile.isVerified) {
      console.log(`Marking DesignerProfile as verified for ${designer.displayName}...`);
      await prisma.designerProfile.update({
        where: { userId: designer.id },
        data: { isVerified: true },
      });
    } else {
      console.log(`Designer ${designer.displayName} already has verified profile.`);
    }
  }
}

main()
  .catch((err) => {
    console.error("Error ensuring designer profiles:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
