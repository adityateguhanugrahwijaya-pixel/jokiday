import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/errors";
import { sanitizeInput } from "@/lib/security";

import { validateServicePackagePrice } from "@/lib/constants/packages";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { designerProfile: true },
    });

    if (!user || !user.isDesigner || !user.designerProfile) {
      throw new ForbiddenError("Hanya akun desainer yang dapat membuat paket jasa");
    }

    const body = await req.json();
    const { title, description, category, price, durationDays, revisionQuota, deliverables } = body;

    const cleanTitle = sanitizeInput(title || "").slice(0, 150);
    const cleanDesc = sanitizeInput(description || "").slice(0, 2500);
    const cleanCat = sanitizeInput(category || "logo").slice(0, 50);

    if (!cleanTitle) {
      throw new ValidationError("Judul paket jasa wajib diisi");
    }
    if (!cleanDesc) {
      throw new ValidationError("Deskripsi paket jasa wajib diisi");
    }

    const priceValidation = validateServicePackagePrice(price);
    if (!priceValidation.isValid || priceValidation.value === undefined) {
      throw new ValidationError(priceValidation.error || "Harga paket tidak valid");
    }
    const priceNum = priceValidation.value;
    const durationNum = parseInt(durationDays, 10) || 2;
    const revisionNum = parseInt(revisionQuota, 10) || 2;

    const deliverablesArray = Array.isArray(deliverables)
      ? deliverables
          .filter((d: any) => typeof d === "string" && d.trim().length > 0)
          .map((d: string) => sanitizeInput(d).slice(0, 150))
      : [];

    const newPackage = await prisma.servicePackage.create({
      data: {
        designerId: user.id,
        title: cleanTitle,
        description: cleanDesc,
        category: cleanCat,
        price: priceNum,
        durationDays: durationNum,
        revisionQuota: revisionNum,
        deliverables: JSON.stringify(deliverablesArray),
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, package: newPackage });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu");
    }

    const packages = await prisma.servicePackage.findMany({
      where: { designerId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, packages });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

