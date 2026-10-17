import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { error: { message: "Akses ditolak: Hanya admin yang diizinkan" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // VISIBLE, HIDDEN, or null for all
    const direction = searchParams.get("direction"); // CUSTOMER_TO_DESIGNER, DESIGNER_TO_CUSTOMER, or null
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && (status === "VISIBLE" || status === "HIDDEN")) {
      where.status = status;
    }
    if (
      direction &&
      (direction === "CUSTOMER_TO_DESIGNER" || direction === "DESIGNER_TO_CUSTOMER")
    ) {
      where.direction = direction;
    }

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          reviewer: { select: { id: true, displayName: true, email: true, username: true } },
          reviewee: { select: { id: true, displayName: true, email: true, username: true } },
          order: { select: { id: true, price: true, status: true } },
          reports: { select: { id: true, reason: true, status: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        reviews,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || "Gagal memuat ulasan untuk admin" } },
      { status: 500 }
    );
  }
}
