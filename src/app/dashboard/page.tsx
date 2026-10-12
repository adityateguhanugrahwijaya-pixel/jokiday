import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Dashboard Router
 * Mengarahkan setiap peran ke route terisolasi masing-masing secara instan di server:
 * - Admin -> /admin
 * - Desainer -> /dashboard/designer
 * - Pelanggan -> /dashboard/customer
 * Mencegah race condition dan glitch/glance antar role di client.
 */
export default async function DashboardPage() {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect("/login?redirect=/dashboard");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isAdmin: true, isDesigner: true, activeRole: true },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.isAdmin) {
    redirect("/admin");
  }

  if (user.activeRole === "DESIGNER" && user.isDesigner) {
    redirect("/dashboard/designer");
  }

  redirect("/dashboard/customer");
}
