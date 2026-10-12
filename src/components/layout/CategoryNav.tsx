"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";

export const CATEGORIES = [
  { id: "all", label: "Semua Kategori", icon: "✨" },
  { id: "logo", label: "Logo & Branding", icon: "🎨" },
  { id: "kemasan", label: "Kemasan & Label", icon: "📦" },
  { id: "poster", label: "Poster & Banner", icon: "📢" },
  { id: "branding", label: "Identitas Brand", icon: "🏷️" },
  { id: "media", label: "Konten Medsos", icon: "📱" },
  { id: "ilustrasi", label: "Ilustrasi & Vektor", icon: "✒️" },
];

export function CategoryNav({
  activeCategory,
  onSelectCategory,
}: {
  activeCategory?: string;
  onSelectCategory?: (id: string) => void;
}) {
  const searchParams = useSearchParams();
  const currentCategory = activeCategory || searchParams?.get("category") || "all";

  return (
    <div className="w-full bg-surface border-b border-border overflow-x-auto no-scrollbar py-2.5 px-4 md:px-8">
      <div className="flex items-center gap-2 min-w-max max-w-content mx-auto">
        {CATEGORIES.map((cat) => {
          const isActive = currentCategory === cat.id;

          if (onSelectCategory) {
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={clsx(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all touch-target",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "bg-background text-text-muted hover:text-text hover:bg-neutral-soft border border-border"
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={cat.id}
              href={cat.id === "all" ? "/" : `/?category=${cat.id}`}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all touch-target",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-background text-text-muted hover:text-text hover:bg-neutral-soft border border-border"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
