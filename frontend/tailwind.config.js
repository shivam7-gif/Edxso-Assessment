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
        background: "#090A0F",
        surface: "#12141C",
        "surface-raised": "#1A1D27",
        "surface-hover": "#222736",
        border: "#283044",
        "border-subtle": "#1E2433",
        primary: {
          DEFAULT: "#007AFF",
          hover: "#0062CC",
          glow: "rgba(0, 122, 255, 0.15)",
        },
        success: {
          DEFAULT: "#10B981",
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.25)",
        },
        warning: {
          DEFAULT: "#F59E0B",
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.25)",
        },
        danger: {
          DEFAULT: "#EF4444",
          bg: "rgba(239, 68, 68, 0.12)",
          border: "rgba(239, 68, 68, 0.25)",
        },
        accent: {
          DEFAULT: "#8B5CF6",
          bg: "rgba(139, 92, 246, 0.12)",
          border: "rgba(139, 92, 246, 0.25)",
        },
        cyan: {
          DEFAULT: "#06B6D4",
          bg: "rgba(6, 182, 212, 0.12)",
          border: "rgba(6, 182, 212, 0.25)",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
