import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { handleApiError, NotFoundError, ValidationError, ConflictError, UnauthorizedError } from "@/lib/errors";
import { SignJWT } from "jose";
import { SESSION_SECRET, sanitizeInput } from "@/lib/security";
import { validateNIK } from "@/lib/validation";

const COOKIE_NAME = "jokiday_session";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invite = await prisma.designerInvite.findUnique({
      where: { token: params.token },
    });

    if (!invite) {
      throw new NotFoundError("Tautan undangan tidak valid atau tidak ditemukan");
    }

    if (invite.status === "USED") {
      throw new ValidationError("Tautan undangan ini sudah pernah digunakan");
    }

    if (invite.status === "REVOKED") {
      throw new ValidationError("Tautan undangan ini telah dibatalkan oleh administrator");
    }

    if (new Date() > invite.expiresAt) {
      throw new ValidationError("Tautan undangan ini telah kadaluarsa");
    }

    const body = await req.json();
    const {
      mode, // "REGISTER" | "LOGIN"
      email,
      password,
      displayName,
      loginEmail,
      loginPassword,
      ktpNumber,
      phone,
      categories = ["logo"],
      portfolioUrl = "",
      bio = "",
    } = body;

    // Validasi data penting verifikasi desainer
    const cleanKtp = sanitizeInput(ktpNumber).slice(0, 20);
    const cleanPhone = sanitizeInput(phone).slice(0, 20);
    const cleanBio = sanitizeInput(bio).slice(0, 1000);
    const cleanPortfolioUrl = sanitizeInput(portfolioUrl).slice(0, 300);

    const nikCheck = validateNIK(cleanKtp);
    if (!nikCheck.valid) {
      throw new ValidationError(nikCheck.reason);
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new ValidationError("Nomor telepon/WhatsApp aktif wajib diisi minimal 10 digit");
    }
    if (!cleanBio) {
      throw new ValidationError("Biografi singkat dan keahlian desainer wajib diisi");
    }

    let targetUser: any = null;

    if (mode === "LOGIN") {
      if (!loginEmail || !loginPassword) {
        throw new ValidationError("Email dan password akun yang sudah ada wajib diisi");
      }
      const existing = await prisma.user.findUnique({
        where: { email: loginEmail.toLowerCase().trim() },
      });
      if (!existing) {
        throw new UnauthorizedError("Email atau password akun Anda salah");
      }
      const isMatch = await verifyPassword(loginPassword, existing.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedError("Email atau password akun Anda salah");
      }
      targetUser = existing;
    } else {
      // mode === "REGISTER"
      if (!email || !password || !displayName) {
        throw new ValidationError("Nama lengkap, email, dan kata sandi wajib diisi");
      }
      if (password.length < 8) {
        throw new ValidationError("Kata sandi minimal 8 karakter");
      }

      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (existing) {
        throw new ConflictError("Email ini sudah terdaftar. Silakan pilih opsi 'Masuk dengan Akun yang Sudah Ada'");
      }

      const passwordHash = await hashPassword(password);
      targetUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          displayName: displayName.trim(),
          isCustomer: true,
          isDesigner: true,
          activeRole: "DESIGNER",
        },
      });
    }

    // Jalankan transaksi pendaftaran desainer dan klaim invite
    await prisma.$transaction(async (tx) => {
      // Update status user jadi desainer
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          isDesigner: true,
          activeRole: "DESIGNER",
        },
      });

      // Upsert profile desainer dengan data KTP dan kontak
      await tx.designerProfile.upsert({
        where: { userId: targetUser.id },
        update: {
          bio: cleanBio,
          categories: JSON.stringify(Array.isArray(categories) ? categories : [categories]),
          ktpNumber: cleanKtp,
          phone: cleanPhone,
          portfolioUrl: cleanPortfolioUrl,
          isVerified: true,
          isAvailable: true,
        },
        create: {
          userId: targetUser.id,
          bio: cleanBio,
          categories: JSON.stringify(Array.isArray(categories) ? categories : [categories]),
          ktpNumber: cleanKtp,
          phone: cleanPhone,
          portfolioUrl: cleanPortfolioUrl,
          isVerified: true,
          isAvailable: true,
        },
      });

      // Tandai undangan sebagai SUDAH DIGUNAKAN (One-Time Link)
      await tx.designerInvite.update({
        where: { id: invite.id },
        data: {
          status: "USED",
          usedBy: targetUser.id,
          usedAt: new Date(),
        },
      });
    });

    // Buat JWT sesi baru
    const sessionToken = await new SignJWT({
      userId: targetUser.id,
      email: targetUser.email,
      activeRole: "DESIGNER",
      isAdmin: targetUser.isAdmin,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(SESSION_SECRET);

    const response = NextResponse.json({
      success: true,
      message: "Selamat! Pendaftaran desainer berhasil. Anda sekarang dapat mengunggah karya dan menerima pesanan.",
      redirectUrl: "/dashboard",
    });

    const isHttps = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
