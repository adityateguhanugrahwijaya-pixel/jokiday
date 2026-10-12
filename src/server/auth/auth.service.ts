import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_SECRET, sanitizeInput } from "@/lib/security";

const COOKIE_NAME = "jokiday_session";

export interface SessionPayload {
  userId: string;
  email: string;
  activeRole: "CUSTOMER" | "DESIGNER";
  isAdmin: boolean;
}

export class AuthService {
  static async register(data: { email: string; password: string; displayName: string }) {
    const cleanEmail = (data.email || "").toLowerCase().trim();
    const cleanName = sanitizeInput(data.displayName || "").slice(0, 60);

    if (!cleanEmail || !data.password || !cleanName) {
      throw new ValidationError("Email, password, dan nama tampilan wajib diisi");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new ValidationError("Format alamat email tidak valid");
    }

    if (data.password.length < 8) {
      throw new ValidationError("Password minimal 8 karakter");
    }

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      throw new ConflictError("Email ini sudah terdaftar. Silakan login.");
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        displayName: cleanName,
        isCustomer: true,
        isDesigner: false,
        activeRole: "CUSTOMER",
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        activeRole: true,
        isCustomer: true,
        isDesigner: true,
        isAdmin: true,
      },
    });

    return user;
  }

  static async login(email: string, password: string) {
    let cleanEmail = (email || "").toLowerCase().trim();
    if (cleanEmail === "admin" || cleanEmail === "administrator") {
      cleanEmail = "admin@jokiday.com";
    } else if (cleanEmail === "aditya") {
      cleanEmail = "aditya.teguhanugrahwijaya@gmail.com";
    }

    const cleanPassword = (password || "").trim();
    if (!cleanEmail || !cleanPassword) {
      throw new UnauthorizedError("Email atau password salah");
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (!user) {
      throw new UnauthorizedError("Email atau password salah");
    }

    let isValid = await verifyPassword(cleanPassword, user.passwordHash);
    if (!isValid && password !== cleanPassword) {
      isValid = await verifyPassword(password, user.passwordHash);
    }
    if (!isValid) {
      throw new UnauthorizedError("Email atau password salah");
    }

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      activeRole: user.activeRole as "CUSTOMER" | "DESIGNER",
      isAdmin: user.isAdmin,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(SESSION_SECRET);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        activeRole: user.activeRole,
        isCustomer: user.isCustomer,
        isDesigner: user.isDesigner,
        isAdmin: user.isAdmin,
      },
    };
  }

  static async verifySession(token: string): Promise<SessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, SESSION_SECRET);
      return payload as unknown as SessionPayload;
    } catch {
      return null;
    }
  }

  static async getCurrentUser(): Promise<SessionPayload | null> {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await this.verifySession(token);
  }

  static async switchRole(userId: string, targetRole: "CUSTOMER" | "DESIGNER") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundError("Pengguna tidak ditemukan");

    if (targetRole === "DESIGNER" && !user.isDesigner) {
      // Aktifkan peran desainer dan buat profil default
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { isDesigner: true, activeRole: "DESIGNER" },
        }),
        prisma.designerProfile.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            bio: "Desainer kreatif di JokiDay",
            categories: JSON.stringify(["logo", "grafis"]),
          },
        }),
      ]);
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { activeRole: targetRole },
      });
    }

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      activeRole: targetRole,
      isAdmin: user.isAdmin,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(SESSION_SECRET);

    return { activeRole: targetRole, token };
  }
}


export { COOKIE_NAME };
