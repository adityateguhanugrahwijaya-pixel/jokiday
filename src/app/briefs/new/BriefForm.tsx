"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";

export function BriefForm({
  initialDesignerId,
  designers,
}: {
  initialDesignerId?: string;
  designers: Array<{ id: string; displayName: string }>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"DIRECT" | "MARKET">(initialDesignerId ? "DIRECT" : "MARKET");
  const [targetDesignerId, setTargetDesignerId] = useState(initialDesignerId || designers[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("logo");
  const [desiredDeadlineDays, setDesiredDeadlineDays] = useState("3");
  const [revisionQuota, setRevisionQuota] = useState("2");
  const [budgetHint, setBudgetHint] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg("Judul dan deskripsi brief wajib diisi");
      return;
    }
    if (mode === "DIRECT" && !targetDesignerId) {
      setErrorMsg("Pilih desainer tujuan terlebih dahulu");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          targetDesignerId: mode === "DIRECT" ? targetDesignerId : undefined,
          title,
          description,
          category,
          desiredDeadlineDays: parseInt(desiredDeadlineDays, 10) || 3,
          revisionQuota: parseInt(revisionQuota, 10) || 2,
          budgetHint: budgetHint ? parseInt(budgetHint, 10) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal membuat brief");

      router.push(`/market`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-sm">
      {errorMsg && (
        <div className="p-3 bg-danger-soft text-danger text-xs rounded border border-danger/20 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Mode Brief */}
      <div>
        <label className="block font-semibold text-text mb-2">
          Pilihan Jalur Pemesanan
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("MARKET")}
            className={`p-3.5 text-left border rounded-md transition-colors ${
              mode === "MARKET"
                ? "border-primary bg-primary-soft text-primary font-bold"
                : "border-border bg-background text-text-muted hover:text-text"
            }`}
          >
            <div className="text-sm font-bold">Pasar Terbuka</div>
            <div className="text-xs font-normal mt-0.5">Semua desainer boleh kirim penawaran</div>
          </button>

          <button
            type="button"
            onClick={() => setMode("DIRECT")}
            className={`p-3.5 text-left border rounded-md transition-colors ${
              mode === "DIRECT"
                ? "border-primary bg-primary-soft text-primary font-bold"
                : "border-border bg-background text-text-muted hover:text-text"
            }`}
          >
            <div className="text-sm font-bold">Pesan Langsung</div>
            <div className="text-xs font-normal mt-0.5">Khusus ke satu desainer pilihan</div>
          </button>
        </div>
      </div>

      {mode === "DIRECT" && (
        <div>
          <label className="block font-semibold text-text mb-1.5">
            Pilih Desainer Tujuan
          </label>
          {designers.length === 0 ? (
            <div className="p-3 bg-neutral-soft text-text-muted text-xs rounded border border-border">
              Belum ada desainer terverifikasi lain yang tersedia saat ini. Silakan gunakan opsi Pasar Terbuka.
            </div>
          ) : (
            <select
              value={targetDesignerId}
              onChange={(e) => setTargetDesignerId(e.target.value)}
              className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {designers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.displayName}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div>
        <label className="block font-semibold text-text mb-1.5">
          Kategori Desain
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="logo">Logo & Identitas Visual</option>
          <option value="poster">Poster & Banner Promosi</option>
          <option value="kemasan">Kemasan Produk & Label</option>
          <option value="ui">Desain UI Aplikasi / Website</option>
          <option value="thumbnail">Thumbnail & Konten Medsos</option>
          <option value="ilustrasi">Ilustrasi Kustom</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold text-text mb-1.5">
          Judul Kebutuhan Desain
        </label>
        <input
          type="text"
          placeholder="Contoh: Desain Logo Minimalis Kedai Kopi Senja"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      <div>
        <label className="block font-semibold text-text mb-1.5">
          Deskripsi & Brief Lengkap
        </label>
        <textarea
          rows={5}
          placeholder="Jelaskan konsep yang diinginkan, warna dominan, pesan yang ingin disampaikan, dan referensi..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold text-text mb-1.5">
            Target Selesai (Hari)
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={desiredDeadlineDays}
            onChange={(e) => setDesiredDeadlineDays(e.target.value)}
            className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block font-semibold text-text mb-1.5">
            Kuota Revisi yang Diharapkan
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={revisionQuota}
            onChange={(e) => setRevisionQuota(e.target.value)}
            className="w-full h-11 px-3 bg-background border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="cta"
          isLoading={isLoading}
        >
          Posting Brief
        </Button>
      </div>
    </form>
  );
}
