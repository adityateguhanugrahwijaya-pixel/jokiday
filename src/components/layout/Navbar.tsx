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
} from "lucide-react";
import { RoleSwitchModal } from "@/components/ui/RoleSwitchModal";

export interface NavbarProps {
  initialRole?: "CUSTOMER" | "DESIGNER";
  displayName?: string;
}

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  activeRole: "CUSTOMER" | "DESIGNER";
  isCustomer: boolean;
  isDesigner: boolean;
  isAdmin: boolean;
}

export function Navbar({ initialRole = "CUSTOMER", displayName = "Pengguna" }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"CUSTOMER" | "DESIGNER">(initialRole);
  const [showMenu, setShowMenu] = useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

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
  }, []);

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

  const customerNav = [
    { label: "Beranda", href: "/", icon: Home },
    { label: "Dashboard", href: "/dashboard", icon: Layers },
    { label: "Pasar", href: "/market", icon: ShoppingBag },
    { label: "Order Saya", href: "/orders", icon: Clock },
    { label: "Pesan", href: "/chat", icon: MessageSquare },
  ];

  const designerNav = [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Pasar", href: "/market", icon: ShoppingBag },
    { label: "Karya", href: "/portfolio", icon: Layers },
    { label: "Order", href: "/orders", icon: Clock },
    { label: "Dompet", href: "/wallet", icon: Wallet },
  ];

  const currentNav = role === "CUSTOMER" ? customerNav : designerNav;
  const currentDisplayName = user ? user.displayName : displayName;

  return (
    <>
      {/* Topbar untuk Tablet & Desktop */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border h-16 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
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

          {/* Quick Links Desktop */}
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
        </div>

        {/* Action & Role Switcher */}
        <div className="flex items-center gap-3">
          {/* Role switcher button jika login sebagai akun yang punya peran ganda atau sedang aktif */}
          {user && (user.isCustomer && user.isDesigner) && (
            <button
              onClick={() => setIsSwitchModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-background hover:bg-surface text-text transition-colors touch-target"
              title="Ganti peran antara customer dan desainer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
              <span>Mode: {role === "CUSTOMER" ? "Customer" : "Desainer"}</span>
            </button>
          )}

          {/* New Order CTA atau Upload Portfolio CTA (Hanya jika sudah login) */}
          {user && (
            role === "CUSTOMER" ? (
              <Link
                href="/briefs/new"
                className="inline-flex items-center gap-1.5 justify-center h-10 px-3.5 sm:px-4 bg-secondary text-on-secondary font-bold text-sm rounded-md hover:bg-secondary-hover transition-colors touch-target"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">Buat Brief</span>
              </Link>
            ) : user.isDesigner ? (
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-1.5 justify-center h-10 px-3.5 sm:px-4 bg-secondary text-on-secondary font-bold text-sm rounded-md hover:bg-secondary-hover transition-colors touch-target"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">Upload Karya</span>
              </Link>
            ) : null
          )}

          {/* User Auth Info / Login Link */}
          {loading ? (
            <div className="w-9 h-9 rounded-full bg-border/40 animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 p-1 rounded-md hover:bg-background transition-colors touch-target"
                aria-expanded={showMenu}
              >
                <div className="w-9 h-9 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                  {currentDisplayName.slice(0, 1).toUpperCase()}
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
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-text hover:bg-background transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-text-muted" />
                    <span>Pesan & Diskusi</span>
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

                  {user.isAdmin && (
                    <Link
                      href="/admin/withdrawals"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-secondary-text font-bold hover:bg-background transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Panel Admin Penarikan</span>
                    </Link>
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
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-surface text-text text-xs font-semibold transition-colors touch-target"
              >
                <LogIn className="w-3.5 h-3.5 text-primary" />
                <span>Masuk</span>
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors touch-target"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Bottom Navigation untuk Layar HP (xs - sm) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border h-16 px-2 flex items-center justify-around">
        {currentNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center flex-1 h-full touch-target transition-colors",
                isActive ? "text-primary font-bold" : "text-text-muted hover:text-text"
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

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
