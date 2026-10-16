import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";
import { validateServicePackagePrice } from "@/lib/constants/packages";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const pkg = await prisma.servicePackage.findUnique({
      where: { id: params.id },
    });
    if (!pkg) {
      throw new NotFoundError("Paket jasa tidak ditemukan");
    }

    if (pkg.designerId !== session.userId && !session.isAdmin) {
      throw new ForbiddenError("Kamu tidak memiliki hak untuk mengedit paket jasa ini");
    }

    const body = await req.json();
    const { title, description, category, price, durationDays, revisionQuota, deliverables, isActive } = body;

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = sanitizeInput(title).slice(0, 150);
    if (description !== undefined) dataToUpdate.description = sanitizeInput(description).slice(0, 2500);
    if (category !== undefined) dataToUpdate.category = sanitizeInput(category).slice(0, 50);
    if (price !== undefined) {
      const priceValidation = validateServicePackagePrice(price);
      if (!priceValidation.isValid || priceValidation.value === undefined) {
        throw new ValidationError(priceValidation.error || "Harga paket tidak valid");
      }
      dataToUpdate.price = priceValidation.value;
    }
    if (durationDays !== undefined) {
      const d = parseInt(durationDays, 10);
      if (!isNaN(d) && d > 0) dataToUpdate.durationDays = d;
    }
    if (revisionQuota !== undefined) {
      const r = parseInt(revisionQuota, 10);
      if (!isNaN(r) && r >= 0) dataToUpdate.revisionQuota = r;
    }
    if (deliverables !== undefined) {
      const cleaned = Array.isArray(deliverables)
        ? deliverables
            .filter((d: any) => typeof d === "string" && d.trim().length > 0)
            .map((d: string) => sanitizeInput(d).slice(0, 150))
        : [];
      dataToUpdate.deliverables = JSON.stringify(cleaned);
    }
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updated = await prisma.servicePackage.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, package: updated });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const pkg = await prisma.servicePackage.findUnique({
      where: { id: params.id },
    });
    if (!pkg) {
      throw new NotFoundError("Paket jasa tidak ditemukan");
    }

    if (pkg.designerId !== session.userId && !session.isAdmin) {
      throw new ForbiddenError("Kamu tidak memiliki hak untuk menghapus paket jasa ini");
    }

    await prisma.servicePackage.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Paket jasa berhasil dihapus" });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

