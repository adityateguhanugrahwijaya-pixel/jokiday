import { NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
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

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
