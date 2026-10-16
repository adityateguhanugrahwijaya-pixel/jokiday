import React from "react";
import { AuthService } from "@/server/auth/auth.service";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    redirect("/login?redirect=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.isAdmin) {
    const activeRole = (user?.activeRole as "CUSTOMER" | "DESIGNER") || "CUSTOMER";
    const targetDashboard =
      activeRole === "DESIGNER" ? "/dashboard/designer" : "/dashboard/customer";
    const roleLabel = activeRole === "DESIGNER" ? "Mode Desainer" : "Mode Pelanggan";

    return (
      <AppShell
        role={activeRole}
        displayName={user?.displayName || "Pengguna"}
      >
        <div className="max-w-md mx-auto my-12 p-8 bg-surface border border-border rounded-xl text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-danger-soft text-danger mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">Akses Admin Ditolak</h1>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Akun Anda tidak memiliki hak akses Administrator untuk mengelola panel ini. Anda tetap berada dalam {roleLabel}.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={targetDashboard}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md bg-primary text-white font-bold text-xs hover:bg-primary-hover transition-colors touch-target"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard ({roleLabel})</span>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return <>{children}</>;
}
