"use client";

import React, { useEffect } from "react";
import { AlertCircle, ArrowRightLeft, ShieldCheck, UserCheck, X } from "lucide-react";
import { Button } from "./Button";

export interface RoleSwitchModalProps {
  isOpen: boolean;
  targetRole: "CUSTOMER" | "DESIGNER";
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function RoleSwitchModal({
  isOpen,
  targetRole,
  isLoading = false,
  onConfirm,
  onClose,
}: RoleSwitchModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isSwitchingToCustomer = targetRole === "CUSTOMER";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-switch-title"
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-neutral-soft/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 id="role-switch-title" className="font-bold text-base text-text">
                Konfirmasi Ganti Mode Akun
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Peralihan peran aktif pengguna
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface transition-colors"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          <div className="p-3.5 rounded-lg border border-primary/20 bg-primary-soft/50 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold">
              {isSwitchingToCustomer ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Target: Mode Customer (Pelanggan)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Target: Mode Desainer (Penyedia Jasa)</span>
                </>
              )}
            </div>
            <p className="text-text leading-relaxed text-xs">
              {isSwitchingToCustomer
                ? "Anda akan beralih ke Mode Customer. Halaman pesanan dan chat akan menampilkan transaksi pembelian desain Anda. Semua data pekerjaan klien dan dompet desainer Anda tetap tersimpan aman dan tidak akan hilang."
                : "Anda akan beralih ke Mode Desainer. Anda dapat mengakses dashboard pekerjaan klien, melihat pesanan aktif, mengunggah karya ke portofolio, dan memantau penarikan dana."}
            </p>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-neutral-soft text-text-muted text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-text shrink-0 mt-0.5" />
            <p>
              Mode yang Anda pilih akan disimpan ke sistem dan otomatis berlaku di semua tab browser aktif.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-soft/40 border-t border-border flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs font-semibold"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className="text-xs font-bold"
          >
            {isSwitchingToCustomer ? "Beralih ke Customer" : "Beralih ke Desainer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
