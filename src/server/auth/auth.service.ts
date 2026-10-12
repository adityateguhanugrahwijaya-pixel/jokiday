import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_SECRET, sanitizeInput } from "@/lib/security";
import crypto from "node:crypto";
import { EmailService } from "@/server/email/email.service";
import { getAppUrl } from "@/lib/app-url";

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

  /**
   * Mengajukan permintaan atur ulang kata sandi via email
   */
  static async requestPasswordReset(email: string) {
    let cleanEmail = (email || "").toLowerCase().trim();
    if (cleanEmail === "admin" || cleanEmail === "administrator") {
      cleanEmail = "admin@jokiday.com";
    }

    if (!cleanEmail) {
      throw new ValidationError("Alamat email wajib diisi");
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // Keamanan: Jika email tidak terdaftar, tetap respons sukses agar tidak membocorkan data pengguna
    if (!user) {
      return {
        success: true,
        message: "Jika email tersebut terdaftar di JokiDay, tautan reset kata sandi telah dikirimkan ke kotak masuk Anda.",
      };
    }

    // Buat token random 32 byte (64 karakter heksadesimal)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // Masa aktif 30 menit

    // Simpan token ke database dan bersihkan token kadaluarsa/belum terpakai sebelumnya
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const appUrl = getAppUrl();
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    // Kirim email transaksional via Resend
    try {
      await EmailService.sendPasswordResetEmail({
        toEmail: user.email,
        userName: user.displayName,
        resetUrl,
        expiresMinutes: 30,
      });
    } catch (err) {
      console.error("[AuthService] Gagal mengirim email reset kata sandi:", err);
    }

    return {
      success: true,
      message: "Jika email tersebut terdaftar di JokiDay, tautan reset kata sandi telah dikirimkan ke kotak masuk Anda.",
    };
  }

  /**
   * Memvalidasi keabsahan token reset kata sandi
   */
  static async verifyResetToken(rawToken: string) {
    if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length < 32) {
      throw new ValidationError("Tautan reset kata sandi tidak valid");
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    if (!record || record.usedAt !== null) {
      throw new ValidationError("Tautan reset kata sandi sudah pernah digunakan atau tidak valid");
    }

    if (new Date() > record.expiresAt) {
      throw new ValidationError("Tautan reset kata sandi telah kedaluwarsa. Silakan ajukan permintaan baru.");
    }

    return {
      valid: true,
      email: record.user.email,
      displayName: record.user.displayName,
    };
  }

  /**
   * Mengatur ulang kata sandi pengguna dengan token yang sah
   */
  static async resetPassword(rawToken: string, newPassword: string) {
    const cleanPassword = (newPassword || "").trim();
    if (!cleanPassword || cleanPassword.length < 8) {
      throw new ValidationError("Kata sandi baru minimal 8 karakter");
    }

    const verification = await this.verifyResetToken(rawToken);
    const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");

    const newPasswordHash = await hashPassword(cleanPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: verification.email },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: "Kata sandi Anda berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.",
    };
  }
}


export { COOKIE_NAME };
