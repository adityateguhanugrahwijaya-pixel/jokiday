"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  Home,
  ShoppingBag,
  Clock,
  Wallet,
  User,
  Layers,
  MessageSquare,
} from "lucide-react";

export interface SidebarProps {
  role?: "CUSTOMER" | "DESIGNER";
}

export function Sidebar({ role = "CUSTOMER" }: SidebarProps) {
  const pathname = usePathname();

  const customerNav = [
    { label: "Beranda", href: "/", icon: Home },
    { label: "Dashboard", href: "/dashboard", icon: Layers },
    { label: "Pasar Brief", href: "/market", icon: ShoppingBag },
    { label: "Order Saya", href: "/orders", icon: Clock },
    { label: "Pesan & Diskusi", href: "/chat", icon: MessageSquare },
    { label: "Profil Akun", href: "/profile", icon: User },
  ];

  const designerNav = [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Pasar Brief", href: "/market", icon: ShoppingBag },
    { label: "Kelola Order", href: "/orders", icon: Clock },
    { label: "Karya Portofolio", href: "/portfolio", icon: Layers },
    { label: "Dompet & Saldo", href: "/wallet", icon: Wallet },
    { label: "Pesan & Diskusi", href: "/chat", icon: MessageSquare },
    { label: "Profil Desainer", href: "/profile", icon: User },
  ];

  const currentNav = role === "CUSTOMER" ? customerNav : designerNav;

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-surface min-h-[calc(100vh-64px)] p-4">
      <div className="space-y-1.5 flex-1">
        {currentNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-semibold transition-colors",
                isActive
                  ? "bg-primary-soft text-primary font-bold"
                  : "text-text-muted hover:text-text hover:bg-background"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
