"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, Archive, RotateCcw, Trash2, Eye } from "lucide-react";

interface PostActionMenuProps {
  postId: string;
  postTitle?: string;
  isOwner: boolean;
  isAdmin?: boolean;
  status?: "PUBLISHED" | "ARCHIVED" | "DELETED" | string;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function PostActionMenu({
  postId,
  postTitle,
  isOwner,
  isAdmin,
  status = "PUBLISHED",
  onArchive,
  onRestore,
  onDelete,
  className = "",
}: PostActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Jika bukan pemilik dan bukan admin, tidak tampilkan menu sama sekali
  if (!isOwner && !isAdmin) {
    return null;
  }

  // Handle klik di luar untuk menutup menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const isArchived = status === "ARCHIVED";

  return (
    <div
      ref={menuRef}
      className={`relative inline-block text-left ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Menu opsi karya"
        className="w-8 h-8 sm:w-8 sm:h-8 rounded-full bg-surface/90 hover:bg-surface text-text-muted hover:text-text border border-border/80 shadow-xs flex items-center justify-center transition-all touch-target focus:outline-none focus:ring-2 focus:ring-primary/40 backdrop-blur-sm"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-1.5 w-44 sm:w-48 rounded-xl bg-surface border border-border shadow-floating py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 divide-y divide-border/60"
        >
          <div className="py-1">
            {!isArchived ? (
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onArchive?.();
                }}
                className="w-full text-left px-3.5 py-2.5 sm:py-2 text-xs font-medium text-text hover:bg-background flex items-center gap-2.5 transition-colors touch-target"
              >
                <Archive className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span>Arsipkan Karya</span>
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onRestore?.();
                }}
                className="w-full text-left px-3.5 py-2.5 sm:py-2 text-xs font-medium text-text hover:bg-background flex items-center gap-2.5 transition-colors touch-target"
              >
                <RotateCcw className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Pulihkan ke Publik</span>
              </button>
            )}
          </div>

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onDelete?.();
              }}
              className="w-full text-left px-3.5 py-2.5 sm:py-2 text-xs font-medium text-danger hover:bg-danger-soft flex items-center gap-2.5 transition-colors touch-target"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>{isArchived ? "Hapus Permanen" : "Hapus Karya"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
