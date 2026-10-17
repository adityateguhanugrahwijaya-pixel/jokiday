"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";

export interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const RATING_DESCRIPTIONS = [
  "",
  "Sangat Kurang",
  "Kurang Memuaskan",
  "Cukup Baik",
  "Bagus & Memuaskan",
  "Luar Biasa / Sempurna",
];

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  size = "md",
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const starSizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  };

  const currentVal = hoverValue !== null ? hoverValue : value;

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(star);
    } else if (e.key === "ArrowRight" && star < 5) {
      e.preventDefault();
      onChange(star + 1);
    } else if (e.key === "ArrowLeft" && star > 1) {
      e.preventDefault();
      onChange(star - 1);
    }
  };

  return (
    <div className="space-y-1.5">
      <div
        className="flex flex-wrap items-center gap-2"
        role="radiogroup"
        aria-label="Pilih nilai bintang ulasan"
      >
        <div className="flex items-center gap-1 shrink-0">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= currentVal;

            return (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={value === star}
                aria-label={`${star} Bintang - ${RATING_DESCRIPTIONS[star]}`}
                disabled={disabled}
                onClick={() => onChange(star)}
                onMouseEnter={() => !disabled && setHoverValue(star)}
                onMouseLeave={() => !disabled && setHoverValue(null)}
                onKeyDown={(e) => handleKeyDown(e, star)}
                className={`p-1.5 rounded-md transition-all focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  disabled
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:scale-110 active:scale-95"
                }`}
              >
                <Star
                  className={`${starSizes[size]} transition-colors ${
                    isFilled
                      ? "fill-amber-400 text-amber-500"
                      : "fill-transparent text-text-muted/40 hover:text-amber-300"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {currentVal > 0 && (
          <span className="text-xs font-semibold text-text">
            {currentVal} / 5 ({RATING_DESCRIPTIONS[currentVal]})
          </span>
        )}
      </div>
    </div>
  );
}
