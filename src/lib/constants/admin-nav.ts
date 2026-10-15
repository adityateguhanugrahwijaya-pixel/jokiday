import { Layers, UserPlus, Wallet, Clock, LucideIcon } from "lucide-react";

export interface AdminNavItem {
  id: "dashboard" | "invites" | "withdrawals" | "orders";
  label: string;
  href: string;
  icon: LucideIcon;
  pageTitle: string;
  browserTitle: string;
  description: string;
}

/**
 * Sumber tunggal navigasi dan penamaan menu admin di seluruh platform JokiDay.
 * Digunakan secara konsisten pada:
 * - Sidebar admin (Desktop)
 * - Bottom navbar admin (Mobile)
 * - Drawer hamburger admin (Mobile / Tablet)
 * - Judul halaman (h1)
 * - Tab browser (Metadata / document.title)
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard Admin",
    href: "/admin",
    icon: Layers,
    pageTitle: "Dashboard Admin",
    browserTitle: "Dashboard Admin - JokiDay",
    description:
      "Pusat kendali ekosistem JokiDay: kelola undangan desainer, persetujuan pencairan saldo, dan pantau seluruh transaksi platform.",
  },
  {
    id: "invites",
    label: "Undangan Desainer",
    href: "/admin/invites",
    icon: UserPlus,
    pageTitle: "Undangan Desainer",
    browserTitle: "Undangan Desainer - JokiDay",
    description:
      "Hanya desainer yang menerima tautan undangan khusus satu kali pakai (one-time link) yang dapat membuka jasa di JokiDay.",
  },
  {
    id: "withdrawals",
    label: "Penarikan Saldo",
    href: "/admin/withdrawals",
    icon: Wallet,
    pageTitle: "Penarikan Saldo",
    browserTitle: "Penarikan Saldo - JokiDay",
    description:
      "Verifikasi transfer pencairan dana desainer dan unggah bukti transfer ke Google Drive admin.",
  },
  {
    id: "orders",
    label: "Monitoring Order",
    href: "/orders",
    icon: Clock,
    pageTitle: "Monitoring Order",
    browserTitle: "Monitoring Order - JokiDay",
    description:
      "Pantau seluruh transaksi pesanan antara pelanggan dan desainer di seluruh platform JokiDay.",
  },
];

export function getAdminNavItemByHref(pathname: string): AdminNavItem | undefined {
  if (pathname === "/admin") {
    return ADMIN_NAV_ITEMS.find((item) => item.id === "dashboard");
  }
  if (pathname.startsWith("/admin/invites")) {
    return ADMIN_NAV_ITEMS.find((item) => item.id === "invites");
  }
  if (pathname.startsWith("/admin/withdrawals")) {
    return ADMIN_NAV_ITEMS.find((item) => item.id === "withdrawals");
  }
  if (pathname.startsWith("/orders")) {
    return ADMIN_NAV_ITEMS.find((item) => item.id === "orders");
  }
  return undefined;
}
