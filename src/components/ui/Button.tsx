import React from "react";
import { clsx } from "clsx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "cta" | "ghost" | "danger";
  size?: "md" | "sm" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      isLoading = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-target disabled:opacity-50 disabled:pointer-events-none select-none";

    const variantStyles = {
      // Primary biru untuk rasa aman, konfirmasi, aksi umum
      primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover",
      // CTA oranye: hanya satu per layar untuk aksi transaksi utama. Teks navy on-secondary (#0B1F4A)
      cta: "bg-secondary text-on-secondary hover:bg-secondary-hover active:bg-secondary-hover font-bold",
      // Ghost aksi sekunder: latar putih, tepi border, teks biru
      ghost: "bg-surface text-primary border border-border hover:bg-background",
      // Danger untuk dispute / pembatalan kritis
      danger: "bg-danger text-white hover:bg-red-700",
    };

    const sizeStyles = {
      sm: "h-10 px-3 text-sm",
      md: "h-12 px-4 text-base",
      lg: "h-14 px-6 text-lg",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>Memproses...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
