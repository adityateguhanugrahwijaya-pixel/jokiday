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
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { useUnreadChatCount } from "@/components/chat/ChatNotificationListener";

export interface SidebarProps {
  role?: "CUSTOMER" | "DESIGNER";
  isAdmin?: boolean;
}

export function Sidebar({ role = "CUSTOMER", isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [isAdminState, setIsAdminState] = React.useState(isAdmin ?? false);
  const unreadChatCount = useUnreadChatCount();

  React.useEffect(() => {
    if (isAdmin !== undefined) {
      setIsAdminState(isAdmin);
      return;
    }
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user?.isAdmin) {
          setIsAdminState(true);
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  const customerNav = [
    { label: "Beranda", href: "/", icon: Home },
    { label: "Dashboard", href: "/dashboard/customer", icon: Layers },
    { label: "Pasar Brief", href: "/market", icon: ShoppingBag },
    { label: "Order Saya", href: "/orders", icon: Clock },
    { label: "Pesan & Diskusi", href: "/chat", icon: MessageSquare },
    { label: "Profil Akun", href: "/profile", icon: User },
  ];

  const designerNav = [
    { label: "Dashboard", href: "/dashboard/designer", icon: Home },
    { label: "Pasar Brief", href: "/market", icon: ShoppingBag },
    { label: "Kelola Order", href: "/orders", icon: Clock },
    { label: "Karya Portofolio", href: "/portfolio", icon: Layers },
    { label: "Dompet & Saldo", href: "/wallet", icon: Wallet },
    { label: "Pesan & Diskusi", href: "/chat", icon: MessageSquare },
    { label: "Profil Desainer", href: "/profile", icon: User },
  ];

  const adminNav = [
    { label: "Dashboard Admin", href: "/admin", icon: Layers },
    { label: "Undangan Desainer", href: "/admin/invites", icon: UserPlus },
    { label: "Penarikan Saldo", href: "/admin/withdrawals", icon: Wallet },
    { label: "Monitoring Order", href: "/orders", icon: Clock },
  ];

  const currentNav = isAdminState
    ? adminNav
    : role === "CUSTOMER"
    ? customerNav
    : designerNav;

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-surface min-h-[calc(100vh-64px)] p-4">
      <div className="space-y-1.5 flex-1">
        {isAdminState && (
          <div className="px-3 py-2 mb-2 rounded-md bg-primary-soft/40 border border-primary/20 text-xs text-primary font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Panel Administrator</span>
          </div>
        )}
        {currentNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isChat = item.href === "/chat";
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
              <div className="relative">
                <Icon className="w-5 h-5 shrink-0" />
                {isChat && unreadChatCount > 0 && (
                  <span className="lg:hidden absolute -top-1 -right-1.5 bg-danger text-white text-[9px] font-bold h-3.5 min-w-3.5 px-0.5 rounded-full flex items-center justify-center">
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
              </div>
              <span className="flex-1 truncate">{item.label}</span>
              {isChat && unreadChatCount > 0 && (
                <span className="ml-auto bg-danger text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-5 text-center shadow-xs">
                  {unreadChatCount > 99 ? "99+" : unreadChatCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
