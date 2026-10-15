"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  Home,
  ShoppingBag,
  Clock,
  Wallet,
  User,
  Search,
  MessageSquare,
  Layers,
  ArrowRightLeft,
  LogOut,
  LogIn,
  ShieldCheck,
  Plus,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { RoleSwitchModal } from "@/components/ui/RoleSwitchModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ChatNotificationListener, useUnreadChatCount } from "@/components/chat/ChatNotificationListener";
import { ADMIN_NAV_ITEMS } from "@/lib/constants/admin-nav";

export interface NavbarProps {
  initialRole?: "CUSTOMER" | "DESIGNER";
  displayName?: string;
  isAdmin?: boolean;
}

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  activeRole: "CUSTOMER" | "DESIGNER";
  isCustomer: boolean;
  isDesigner: boolean;
  isAdmin: boolean;
  avatarUrl?: string | null;
}

export function Navbar({
  initialRole = "CUSTOMER",
  displayName = "Pengguna",
  isAdmin = false,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(
    isAdmin
      ? {
          id: "admin",
          email: "admin@jokiday.com",
          displayName,
          activeRole: "CUSTOMER",
          isCustomer: false,
          isDesigner: false,
          isAdmin: true,
        }
      : null
  );
  const [loading, setLoading] = useState(!isAdmin);
  const [role, setRole] = useState<"CUSTOMER" | "DESIGNER">(initialRole);
  const [showMenu, setShowMenu] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const unreadChatCount = useUnreadChatCount();

  // Tutup drawer dan dropdown saat navigasi rute halaman berganti
  useEffect(() => {
    setIsMobileDrawerOpen(false);
    setShowMenu(false);
  }, [pathname]);

  // Kunci scroll halaman saat mobile drawer dibuka
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileDrawerOpen]);

  // Sinkronisasi saat prop initialRole berubah pada navigasi halaman
  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
      if (typeof window !== "undefined") {
        localStorage.setItem("jokiday_active_role", initialRole);
      }
    }
  }, [initialRole]);

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.authenticated && data.user) {
            setUser(data.user);
            if (data.user.activeRole) {
              setRole(data.user.activeRole);
              if (typeof window !== "undefined") {
                localStorage.setItem("jokiday_active_role", data.user.activeRole);
              }
            }
          }
        }
      } catch (err) {
        console.error("Gagal memeriksa sesi pengguna:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Multi-tab synchronization: cegah peran kembali atau tertinggal saat ganti tab browser
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "jokiday_active_role" && e.newValue && e.newValue !== role) {
        window.location.reload();
      }
    };
    window.addEventListener("storage", handleStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("jokiday_role_sync");
      bc.onmessage = (event) => {
        if (event.data?.role && event.data.role !== role) {
          window.location.reload();
        }
      };
    } catch {}

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        const savedRole = localStorage.getItem("jokiday_active_role");
        if (savedRole && (savedRole === "CUSTOMER" || savedRole === "DESIGNER") && savedRole !== role) {
          window.location.reload();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (bc) bc.close();
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [role]);

  const targetRole: "CUSTOMER" | "DESIGNER" = role === "CUSTOMER" ? "DESIGNER" : "CUSTOMER";

  const handleConfirmSwitch = async () => {
    setIsSwitchingRole(true);
    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole, targetRole }),
      });
      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.setItem("jokiday_active_role", targetRole);
          try {
            const bc = new BroadcastChannel("jokiday_role_sync");
            bc.postMessage({ role: targetRole });
            bc.close();
          } catch {}
          window.location.reload();
        }
      } else {
        const data = await res.json();
        alert(data.error?.message || "Gagal mengubah mode akun");
      }
    } catch (err) {
      console.error("Gagal mengubah peran:", err);
      alert("Terjadi kesalahan koneksi saat mengubah mode akun");
    } finally {
      setIsSwitchingRole(false);
      setIsSwitchModalOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      window.location.href = "/login";
    } catch (err) {
      console.error("Gagal keluar:", err);
    }
  };

  const handleChatNavClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jokiday_chat_reset_to_list"));
    }
  };

  const customerNav = [
    { label: "Beranda", href: "/", icon: Home },
    { label: "Dashboard", href: "/dashboard/customer", icon: Layers },
    { label: "Pasar", href: "/market", icon: ShoppingBag },
    { label: "Order Saya", href: "/orders", icon: Clock },
    { label: "Pesan", href: "/chat", icon: MessageSquare },
  ];

  const designerNav = [
    { label: "Dashboard", href: "/dashboard/designer", icon: Home },
    { label: "Order", href: "/orders", icon: Clock },
    { label: "Pesan", href: "/chat", icon: MessageSquare },
    { label: "Karya", href: "/portfolio", icon: Layers },
    { label: "Dompet", href: "/wallet", icon: Wallet },
  ];

  const adminNav = ADMIN_NAV_ITEMS;

  const currentNav = user?.isAdmin
    ? adminNav
    : role === "CUSTOMER"
    ? customerNav
    : designerNav;
  const currentDisplayName = user ? user.displayName : displayName;

  return (
    <>
      {/* Topbar untuk Tablet & Desktop */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border h-16 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={user?.isAdmin ? "/admin" : "/"} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-md bg-primary text-white flex items-center justify-center font-bold text-lg">
              J
            </div>
            <span className="font-extrabold text-xl tracking-tight text-text">
              Joki<span className="text-secondary">Day</span>
            </span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex items-center relative w-64 lg:w-80">
            <Search className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari desainer, logo, poster..."
              className="w-full h-10 pl-9 pr-4 bg-background border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>

          {/* Quick Links Desktop (Hanya untuk non-admin; Navigasi admin eksklusif lewat Sidebar) */}
          {!user?.isAdmin && (
            <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold">
              <Link
                href="/"
                className={clsx(
                  "px-3 py-1.5 rounded-md transition-colors",
                  pathname === "/" ? "text-primary bg-primary-soft" : "text-text-muted hover:text-text hover:bg-background"
                )}
              >
                Beranda
              </Link>
              <Link
                href="/portfolio"
                className={clsx(
                  "px-3 py-1.5 rounded-md transition-colors",
                  pathname === "/portfolio" ? "text-primary bg-primary-soft" : "text-text-muted hover:text-text hover:bg-background"
                )}
              >
                Feed Karya
              </Link>
              <Link
                href="/market"
                className={clsx(
                  "px-3 py-1.5 rounded-md transition-colors",
                  pathname === "/market" ? "text-primary bg-primary-soft" : "text-text-muted hover:text-text hover:bg-background"
                )}
              >
                Pasar Brief
              </Link>
            </nav>
          )}
        </div>

        {/* Action & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin CTA (Desktop / Tablet) */}
          {user?.isAdmin ? (
            <Link
              href="/admin/invites"
              className="hidden sm:inline-flex items-center gap-1.5 justify-center h-9 px-3.5 sm:px-4 bg-secondary text-on-secondary font-bold text-xs sm:text-sm rounded-lg hover:bg-secondary-hover transition-colors touch-target shadow-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Undang Desainer</span>
            </Link>
          ) : (
            <>
              {/* Role switcher button jika login sebagai akun yang punya peran ganda atau sedang aktif */}
              {user && (user.isCustomer && user.isDesigner) && (
                <button
                  onClick={() => setIsSwitchModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-surface text-text transition-colors touch-target whitespace-nowrap"
                  title="Ganti peran antara customer dan desainer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                  <span>Mode: {role === "CUSTOMER" ? "Customer" : "Desainer"}</span>
                </button>
              )}

              {/* New Order CTA atau Upload Portfolio CTA (Hanya jika bukan admin, Desktop/Tablet) */}
              {user && (
                role === "CUSTOMER" ? (
                  <Link
                    href="/briefs/new"
                    className="hidden sm:inline-flex items-center gap-1.5 justify-center h-9 px-3.5 sm:px-4 bg-secondary text-on-secondary font-bold text-xs sm:text-sm rounded-lg hover:bg-secondary-hover transition-colors touch-target shadow-xs whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Brief</span>
                  </Link>
                ) : user.isDesigner ? (
                  <Link
                    href="/portfolio"
                    className="hidden sm:inline-flex items-center gap-1.5 justify-center h-9 px-3.5 sm:px-4 bg-secondary text-on-secondary font-bold text-xs sm:text-sm rounded-lg hover:bg-secondary-hover transition-colors touch-target shadow-xs whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Karya</span>
                  </Link>
                ) : null
              )}
            </>
          )}

          {/* User Auth Info / Login Link */}
          {loading ? (
            <div className="w-9 h-9 rounded-full bg-border/40 animate-pulse" />
          ) : user ? (
            <>
              <NotificationBell />
              <Link
                href="/chat"
                onClick={handleChatNavClick}
                className="hidden md:flex relative p-2 rounded-lg hover:bg-background text-text-muted hover:text-text transition-colors touch-target"
                title="Pesan & Diskusi Desain"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadChatCount > 0 && (
                  <span className="absolute top-1 right-1 bg-danger text-white text-[9px] font-extrabold h-4 min-w-4 px-1 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
              </Link>
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-background transition-colors touch-target"
                  aria-expanded={showMenu}
                >
                  <div className="w-9 h-9 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-sm border border-primary/20 overflow-hidden shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={currentDisplayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      currentDisplayName.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-bold text-text truncate max-w-[100px]">
                      {currentDisplayName}
                    </span>
                    <span className="text-[10px] text-text-muted font-medium">
                      {user.isAdmin ? "Admin" : role === "CUSTOMER" ? "Customer" : "Desainer"}
                    </span>
                  </div>
                </button>

                {/* Dropdown Menu Pengguna */}
                {showMenu && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-lg shadow-lg py-2 z-50 text-sm"
                    onMouseLeave={() => setShowMenu(false)}
                  >
                    <div className="px-4 py-2 border-b border-border">
                      <p className="font-bold text-text truncate">{user.displayName}</p>
                      <p className="text-xs text-text-muted truncate">{user.email}</p>
                      <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-soft text-primary">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{user.isAdmin ? "Administrator" : role}</span>
                      </div>
                    </div>

                    {!user.isAdmin && (
                      <>
                        <Link
                          href={role === "DESIGNER" ? "/dashboard/designer" : "/dashboard/customer"}
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-text hover:bg-background transition-colors font-medium"
                        >
                          <Layers className="w-4 h-4 text-primary" />
                          <span>Dashboard</span>
                        </Link>

                        <Link
                          href="/profile"
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-text hover:bg-background transition-colors"
                        >
                          <User className="w-4 h-4 text-text-muted" />
                          <span>Profil Akun</span>
                        </Link>

                        <Link
                          href="/orders"
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-text hover:bg-background transition-colors"
                        >
                          <Clock className="w-4 h-4 text-text-muted" />
                          <span>Daftar Order</span>
                        </Link>

                        <Link
                          href="/chat"
                          onClick={() => {
                            setShowMenu(false);
                            handleChatNavClick();
                          }}
                          className="flex items-center justify-between px-4 py-2 text-text hover:bg-background transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <MessageSquare className="w-4 h-4 text-text-muted" />
                            <span>Pesan & Diskusi</span>
                          </div>
                          {unreadChatCount > 0 && (
                            <span className="bg-danger text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                              {unreadChatCount > 99 ? "99+" : unreadChatCount}
                            </span>
                          )}
                        </Link>

                        {user.isDesigner && (
                          <>
                            <Link
                              href="/portfolio"
                              onClick={() => setShowMenu(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-text hover:bg-background transition-colors"
                            >
                              <Layers className="w-4 h-4 text-text-muted" />
                              <span>Karya & Portofolio</span>
                            </Link>
                            <Link
                              href="/wallet"
                              onClick={() => setShowMenu(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-text hover:bg-background transition-colors"
                            >
                              <Wallet className="w-4 h-4 text-text-muted" />
                              <span>Dompet & Saldo</span>
                            </Link>
                          </>
                        )}

                        {user.isCustomer && user.isDesigner && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowMenu(false);
                              setIsSwitchModalOpen(true);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2 text-text hover:bg-background transition-colors text-left"
                          >
                            <div className="flex items-center gap-2.5">
                              <ArrowRightLeft className="w-4 h-4 text-primary" />
                              <span>Ganti Mode Akun</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-soft text-primary">
                              {role === "CUSTOMER" ? "Ke Desainer" : "Ke Customer"}
                            </span>
                          </button>
                        )}
                      </>
                    )}

                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-danger hover:bg-danger-soft transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Keluar dari Akun</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile / Tablet Burger Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-background hover:bg-surface text-text transition-colors touch-target shrink-0"
                aria-label="Buka menu navigasi"
              >
                <Menu className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-surface text-text text-xs font-semibold transition-colors touch-target"
              >
                <LogIn className="w-3.5 h-3.5 text-primary" />
                <span>Masuk</span>
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors touch-target"
              >
                Daftar
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-surface text-text transition-colors touch-target shrink-0"
                aria-label="Buka menu navigasi"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Bottom Navigation untuk Layar HP (xs - sm) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border h-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] px-1 sm:px-2 flex items-center justify-around">
        {currentNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && item.href !== "/admin" && pathname.startsWith(item.href));
          const Icon = item.icon;
          const isChat = item.href === "/chat";
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={isChat ? handleChatNavClick : undefined}
              className={clsx(
                "flex flex-col items-center justify-center flex-1 h-full touch-target transition-colors min-w-0 px-0.5",
                isActive ? "text-primary font-bold" : "text-text-muted hover:text-text"
              )}
            >
              <div className="relative mb-1">
                <Icon className="w-5 h-5" />
                {isChat && unreadChatCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-danger text-white text-[9px] font-extrabold h-4 min-w-4 px-1 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight text-center truncate max-w-full leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile & Tablet Navigation Drawer / Burger Sheet */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-[84%] max-w-sm bg-surface shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-200 z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary text-white flex items-center justify-center font-bold text-base">
                  J
                </div>
                <span className="font-extrabold text-lg tracking-tight text-text">
                  Joki<span className="text-secondary">Day</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-background transition-colors touch-target"
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 flex-1 flex flex-col gap-4">
              {user ? (
                <>
                  {/* User Profile Card */}
                  <div className="p-3.5 rounded-xl bg-background border border-border flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-base border border-primary/20 overflow-hidden shrink-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={currentDisplayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        currentDisplayName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-text truncate">{currentDisplayName}</p>
                      <p className="text-xs text-text-muted truncate">{user.email}</p>
                      <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-soft text-primary">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{user.isAdmin ? "Administrator" : role === "CUSTOMER" ? "Customer" : "Desainer"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Prominent CTA Hero Card */}
                  {user.isAdmin ? (
                    <Link
                      href="/admin/invites"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-secondary text-on-secondary font-bold text-sm rounded-xl shadow-xs hover:bg-secondary-hover transition-colors touch-target"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Undang Desainer Baru</span>
                    </Link>
                  ) : role === "CUSTOMER" ? (
                    <Link
                      href="/briefs/new"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-secondary text-on-secondary font-bold text-sm rounded-xl shadow-xs hover:bg-secondary-hover transition-colors touch-target"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buat Brief Baru</span>
                    </Link>
                  ) : user.isDesigner ? (
                    <Link
                      href="/portfolio"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-secondary text-on-secondary font-bold text-sm rounded-xl shadow-xs hover:bg-secondary-hover transition-colors touch-target"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload Karya Portofolio</span>
                    </Link>
                  ) : null}

                  {/* Role Switch Toggle (jika punya peran ganda) */}
                  {user.isCustomer && user.isDesigner && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        setIsSwitchModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:bg-surface transition-colors text-left touch-target"
                    >
                      <div className="flex items-center gap-2.5">
                        <ArrowRightLeft className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-text">Ganti Mode Akun</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-soft text-primary">
                        {role === "CUSTOMER" ? "Ke Desainer" : "Ke Customer"}
                      </span>
                    </button>
                  )}

                  {/* Nav Links Section */}
                  <div className="space-y-1 pt-2 border-t border-border">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted px-2 mb-1.5">
                      Navigasi Menu
                    </p>

                    {user.isAdmin ? (
                      ADMIN_NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          pathname === item.href ||
                          (item.href !== "/admin" && pathname.startsWith(item.href));
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileDrawerOpen(false)}
                            className={clsx(
                              "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                              isActive
                                ? "bg-primary-soft text-primary font-bold"
                                : "text-text hover:bg-background"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-text-muted" />
                          </Link>
                        );
                      })
                    ) : (
                      <>
                        <Link
                          href="/"
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className={clsx(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                            pathname === "/" ? "bg-primary-soft text-primary font-bold" : "text-text hover:bg-background"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Home className="w-4 h-4" />
                            <span>Beranda</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-muted" />
                        </Link>
                        <Link
                          href={role === "DESIGNER" ? "/dashboard/designer" : "/dashboard/customer"}
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className={clsx(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                            pathname.startsWith("/dashboard") ? "bg-primary-soft text-primary font-bold" : "text-text hover:bg-background"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Layers className="w-4 h-4" />
                            <span>Dashboard {role === "DESIGNER" ? "Desainer" : "Customer"}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-muted" />
                        </Link>
                        <Link
                          href="/market"
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className={clsx(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                            pathname === "/market" ? "bg-primary-soft text-primary font-bold" : "text-text hover:bg-background"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <ShoppingBag className="w-4 h-4" />
                            <span>Pasar Brief</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-muted" />
                        </Link>
                        <Link
                          href="/portfolio"
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className={clsx(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                            pathname === "/portfolio" ? "bg-primary-soft text-primary font-bold" : "text-text hover:bg-background"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Layers className="w-4 h-4" />
                            <span>Feed Karya</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-muted" />
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className={clsx(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                            pathname.startsWith("/orders") ? "bg-primary-soft text-primary font-bold" : "text-text hover:bg-background"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Clock className="w-4 h-4" />
                            <span>Daftar Order</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-muted" />
                        </Link>
                        <Link
                          href="/chat"
                          onClick={() => {
                            setIsMobileDrawerOpen(false);
                            handleChatNavClick();
                          }}
                          className={clsx(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                            pathname.startsWith("/chat") ? "bg-primary-soft text-primary font-bold" : "text-text hover:bg-background"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <MessageSquare className="w-4 h-4" />
                            <span>Pesan & Diskusi</span>
                          </div>
                          {unreadChatCount > 0 ? (
                            <span className="bg-danger text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-4 text-center">
                              {unreadChatCount > 99 ? "99+" : unreadChatCount}
                            </span>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-text-muted" />
                          )}
                        </Link>
                        {role === "DESIGNER" && (
                          <Link
                            href="/wallet"
                            onClick={() => setIsMobileDrawerOpen(false)}
                            className={clsx(
                              "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                              pathname.startsWith("/wallet") ? "bg-primary-soft text-primary font-bold" : "text-text hover:bg-background"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Wallet className="w-4 h-4" />
                              <span>Dompet & Saldo</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-text-muted" />
                          </Link>
                        )}
                        <Link
                          href="/profile"
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className={clsx(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                            pathname.startsWith("/profile") ? "bg-primary-soft text-primary font-bold" : "text-text hover:bg-background"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <User className="w-4 h-4" />
                            <span>Profil Akun</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-muted" />
                        </Link>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-surface text-text font-bold text-sm transition-colors"
                  >
                    <LogIn className="w-4 h-4 text-primary" />
                    <span>Masuk ke Akun</span>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-colors shadow-xs"
                  >
                    <span>Daftar Sekarang</span>
                  </Link>
                  <div className="space-y-1 pt-4 border-t border-border">
                    <Link
                      href="/"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-text hover:bg-background"
                    >
                      <div className="flex items-center gap-2.5">
                        <Home className="w-4 h-4" />
                        <span>Beranda</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </Link>
                    <Link
                      href="/portfolio"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-text hover:bg-background"
                    >
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-4 h-4" />
                        <span>Feed Karya</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </Link>
                    <Link
                      href="/market"
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-text hover:bg-background"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag className="w-4 h-4" />
                        <span>Pasar Brief</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Drawer Footer with Logout (for logged in user) */}
              {user && (
                <div className="mt-auto pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-danger bg-danger-soft/40 hover:bg-danger-soft font-bold text-sm transition-colors touch-target"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar dari Akun</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ChatNotificationListener />

      <RoleSwitchModal
        isOpen={isSwitchModalOpen}
        targetRole={targetRole}
        isLoading={isSwitchingRole}
        onConfirm={handleConfirmSwitch}
        onClose={() => setIsSwitchModalOpen(false)}
      />
    </>
  );
}
