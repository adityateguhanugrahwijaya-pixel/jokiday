import { NextRequest, NextResponse } from "next/server";
import { OfferService } from "@/server/offers/offer.service";
import { prisma } from "@/lib/db";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk membuat brief");
    }

    const body = await req.json();

    if (body.mode === "DIRECT") {
      if (!body.targetDesignerId) {
        throw new ValidationError("Pilih desainer tujuan untuk pesanan langsung");
      }

      if (body.targetDesignerId === session.userId) {
        throw new ValidationError("Kamu tidak dapat membuat pesanan langsung ke akunmu sendiri");
      }

      const targetDesigner = await prisma.user.findFirst({
        where: {
          id: body.targetDesignerId,
          isDesigner: true,
          designerProfile: { isVerified: true },
        },
      });

      if (!targetDesigner) {
        throw new ValidationError("Desainer yang dipilih tidak valid atau belum terverifikasi");
      }
    }

    const brief = await OfferService.createBrief({
      ...body,
      customerId: session.userId,
    });

    return NextResponse.json({ success: true, brief });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
