import { NextRequest, NextResponse } from "next/server";
import { OfferService } from "@/server/offers/offer.service";
import { AuthService } from "@/server/auth/auth.service";
import { handleApiError, UnauthorizedError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Silakan masuk terlebih dahulu untuk menerima penawaran");
    }

    const body = await req.json();
    const { offerId } = body;

    const order = await OfferService.acceptOffer(offerId, session.userId);

    return NextResponse.json({ success: true, order });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
