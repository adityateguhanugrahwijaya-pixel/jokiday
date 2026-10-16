import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { sanitizeInput } from "@/lib/security";
import {
  handleApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    if (!session.isAdmin) throw new ForbiddenError("Akses admin diperlukan");

    const reports = await prisma.productReport.findMany({
      include: {
        product: {
          include: {
            designer: {
              include: {
                user: {
                  select: { id: true, displayName: true, username: true, email: true },
                },
              },
            },
          },
        },
        reporter: {
          select: { id: true, displayName: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    if (!session.isAdmin) throw new ForbiddenError("Akses admin diperlukan");

    const body = await req.json();
    const { reportId, status, adminNote } = body;

    if (!reportId) throw new ValidationError("ID laporan wajib disertakan");
    if (!["PENDING", "RESOLVED", "DISMISSED"].includes(status)) {
      throw new ValidationError("Status laporan tidak valid");
    }

    const report = await prisma.productReport.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundError("Laporan tidak ditemukan");

    const updated = await prisma.productReport.update({
      where: { id: reportId },
      data: {
        status,
        adminNote: adminNote ? sanitizeInput(adminNote).slice(0, 500) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Status laporan berhasil diperbarui",
      report: updated,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
