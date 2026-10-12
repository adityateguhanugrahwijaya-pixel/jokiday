"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RoleSwitchModal } from "@/components/ui/RoleSwitchModal";

export function ProfileRoleClient({
  userId,
  initialRole,
}: {
  userId: string;
  initialRole: "CUSTOMER" | "DESIGNER";
}) {
  const router = useRouter();
  const [role, setRole] = useState(initialRole);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<"CUSTOMER" | "DESIGNER">(
    initialRole === "CUSTOMER" ? "DESIGNER" : "CUSTOMER"
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestSwitch = (selectedRole: "CUSTOMER" | "DESIGNER") => {
    if (selectedRole === role) return;
    setTargetRole(selectedRole);
    setIsModalOpen(true);
  };

  const handleConfirmSwitch = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, targetRole }),
      });
      if (res.ok) {
        setRole(targetRole);
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
      setIsLoading(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-text mb-1">
          Ganti Peran Aktif
        </label>
        <p className="text-xs text-text-muted">
          Satu akun JokiDay dapat memesan desain sebagai Customer maupun menerima order sebagai Desainer.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <button
          type="button"
          onClick={() => handleRequestSwitch("CUSTOMER")}
          disabled={isLoading}
          className={`p-3 text-left border rounded-md transition-colors text-xs font-semibold ${
            role === "CUSTOMER"
              ? "border-primary bg-primary-soft text-primary font-bold"
              : "border-border bg-background text-text-muted hover:text-text"
          }`}
        >
          Customer (Pemberi Order)
        </button>

        <button
          type="button"
          onClick={() => handleRequestSwitch("DESIGNER")}
          disabled={isLoading}
          className={`p-3 text-left border rounded-md transition-colors text-xs font-semibold ${
            role === "DESIGNER"
              ? "border-primary bg-primary-soft text-primary font-bold"
              : "border-border bg-background text-text-muted hover:text-text"
          }`}
        >
          Desainer (Penerima Order)
        </button>
      </div>

      <RoleSwitchModal
        isOpen={isModalOpen}
        targetRole={targetRole}
        isLoading={isLoading}
        onConfirm={handleConfirmSwitch}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
