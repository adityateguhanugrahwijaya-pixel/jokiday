"use client";

import React from "react";
import clsx from "clsx";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export interface AppShellProps {
  children: React.ReactNode;
  role?: "CUSTOMER" | "DESIGNER";
  displayName?: string;
  hideSidebar?: boolean;
  isAdmin?: boolean;
  hideFooter?: boolean;
  fullBleed?: boolean;
}

export function AppShell({
  children,
  role = "CUSTOMER",
  displayName = "Pengguna",
  hideSidebar = false,
  isAdmin,
  hideFooter = false,
  fullBleed = false,
}: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text">
      <Navbar initialRole={role} displayName={displayName} isAdmin={isAdmin} />
      <div className="flex-1 flex w-full max-w-content mx-auto">
        {!hideSidebar && <Sidebar role={role} isAdmin={isAdmin} />}
        <main
          className={clsx(
            "flex-1 min-w-0",
            fullBleed
              ? "w-full p-0 md:p-6 lg:p-8 pb-0 md:pb-8"
              : `${hideSidebar ? "w-full p-4 sm:p-6 lg:p-8" : "p-4 sm:p-6 lg:p-8"} ${
                  hideFooter ? "pb-[calc(4rem+1.5rem+env(safe-area-inset-bottom,0px))] md:pb-8" : "pb-8"
                }`
          )}
        >
          {children}
        </main>
      </div>

      {!hideFooter && (
        <footer className="border-t border-border pt-6 px-4 pb-[calc(1.5rem+4rem+env(safe-area-inset-bottom,0px))] md:pb-6 bg-surface text-center text-xs text-text-muted">
          <div className="max-w-content mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 JokiDay by AgentKikir. Hak cipta dilindungi.</p>
            <div className="flex items-center gap-4">
              <a href="/terms" className="hover:text-primary transition-colors">
                Syarat dan Ketentuan
              </a>
              <span>•</span>
              <a href="/privacy" className="hover:text-primary transition-colors">
                Kebijakan Privasi
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
