import { NextRequest, NextResponse } from "next/server";
import { OfferService } from "@/server/offers/offer.service";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk mengirim penawaran");
    }

    const designer = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { designerProfile: true },
    });

    if (!designer?.isDesigner || !designer.designerProfile?.isVerified) {
      throw new ForbiddenError("Hanya desainer terverifikasi yang dapat mengirim penawaran");
    }

    const body = await req.json();

    const offer = await OfferService.createOffer({
      ...body,
      designerId: designer.id,
    });

    return NextResponse.json({ success: true, offer });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
