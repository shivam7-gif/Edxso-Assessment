/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        surface: "#FFFFFF",
        "surface-subtle": "#F8FAFC",
        "surface-muted": "#F1F5F9",
        "surface-hover": "#F1F5F9",
        border: "#E2E8F0",
        "border-subtle": "#F1F5F9",
        "border-strong": "#CBD5E1",
        text: {
          primary: "#0F172A",
          secondary: "#475569",
          muted: "#64748B",
          subtle: "#94A3B8",
        },
        primary: {
          DEFAULT: "#0F172A",
          hover: "#1E293B",
          accent: "#2563EB",
          "accent-hover": "#1D4ED8",
          subtle: "#F1F5F9",
        },
        success: {
          DEFAULT: "#166534",
          bg: "#F0FDF4",
          border: "#DCFCE7",
          text: "#15803D",
        },
        warning: {
          DEFAULT: "#854D0E",
          bg: "#FEFCE8",
          border: "#FEF08A",
          text: "#A16207",
        },
        danger: {
          DEFAULT: "#991B1B",
          bg: "#FEF2F2",
          border: "#FEE2E2",
          text: "#B91C1C",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        drawer: "-4px 0 24px 0 rgba(0, 0, 0, 0.08)",
        modal: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};
