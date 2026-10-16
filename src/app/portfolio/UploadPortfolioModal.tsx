"use client";

import React, { useState } from "react";
import { PlusCircle } from "lucide-react";
import { UploadFeedModal } from "@/components/feed/UploadFeedModal";

export function UploadPortfolioModal({ designerId }: { designerId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary-hover transition-colors touch-target shrink-0 shadow-sm"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Unggah Desain Baru</span>
      </button>

      <UploadFeedModal
        isOpen={isOpen}
        designerId={designerId}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
