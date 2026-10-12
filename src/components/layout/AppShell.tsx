"use client";

import React from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export interface AppShellProps {
  children: React.ReactNode;
  role?: "CUSTOMER" | "DESIGNER";
  displayName?: string;
  hideSidebar?: boolean;
}

export function AppShell({
  children,
  role = "CUSTOMER",
  displayName = "Pengguna",
  hideSidebar = false,
}: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text">
      <Navbar initialRole={role} displayName={displayName} />
      <div className="flex-1 flex w-full max-w-content mx-auto">
        {!hideSidebar && <Sidebar role={role} />}
        <main className={`flex-1 min-w-0 ${hideSidebar ? "w-full p-4 sm:p-6 lg:p-8" : "p-4 sm:p-6 lg:p-8"} pb-24 md:pb-8`}>
          {children}
        </main>
      </div>

      <footer className="border-t border-border py-6 px-4 bg-surface text-center text-xs text-text-muted">
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
    </div>
  );
}
