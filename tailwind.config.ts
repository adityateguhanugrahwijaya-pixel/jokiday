import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "360px",
      sm: "600px",
      md: "900px",
      lg: "1200px",
      xl: "1536px",
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1D4ED8",
          hover: "#1E40AF",
          soft: "#E8EEFF",
        },
        "on-primary": "#FFFFFF",
        secondary: {
          DEFAULT: "#FF7A1A",
          hover: "#E8650A",
          soft: "#FFF0E3",
          text: "#C2410C",
        },
        "on-secondary": "#0B1F4A",
        background: "#F5F8FF",
        surface: "#FFFFFF",
        border: "#D9E2F5",
        text: {
          DEFAULT: "#0B1F4A",
          muted: "#51617F",
        },
        "neutral-soft": "#EEF1F7",
        success: {
          DEFAULT: "#166534",
          soft: "#E6F6EC",
        },
        danger: {
          DEFAULT: "#B91C1C",
          soft: "#FDECEC",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "20px",
        full: "9999px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
      },
      boxShadow: {
        floating: "0 8px 24px rgba(29, 78, 216, 0.12)",
      },
      maxWidth: {
        content: "1280px",
        form: "720px",
      },
    },
  },
  plugins: [],
};
export default config;
