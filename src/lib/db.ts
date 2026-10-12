import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Pelindung Keamanan Mutlak: Cegah penghapusan akun pengguna tanpa izin
  client.$use(async (params, next) => {
    if (params.model === "User") {
      // 1. Blokir kueri deleteMany tanpa filter (yang mengosongkan seluruh tabel)
      if (params.action === "deleteMany") {
        const where = params.args?.where;
        if (!where || Object.keys(where).length === 0) {
          throw new Error(
            "[SECURITY GUARD] Penghapusan massal tabel User dilarang mutlak untuk melindungi data akun produksi!"
          );
        }
      }

      // 2. Blokir penghapusan akun administrator resmi
      if (params.action === "delete" || params.action === "deleteMany") {
        const where = params.args?.where;
        if (where) {
          const emailTarget = where.email;
          if (
            emailTarget === "admin@jokiday.com" ||
            (typeof emailTarget === "object" && emailTarget?.in?.includes("admin@jokiday.com"))
          ) {
            throw new Error(
              "[SECURITY GUARD] Akun administrator resmi admin@jokiday.com dilindungi dan tidak dapat dihapus!"
            );
          }
        }
      }
    }

    return next(params);
  });

  return client;
}

export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
