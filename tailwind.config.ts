import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // PAL España palette — bandera roja y gualda sobre neutro.
        brand: {
          50: "#fef2f3",
          100: "#fde0e3",
          200: "#fbc5cb",
          300: "#f79aa4",
          400: "#f0687a",
          500: "#e63946",
          600: "#d81e2f",
          700: "#b51826",
          800: "#921521",
          900: "#7a1620",
        },
        // Amarillo gualda de la bandera (acento secundario).
        gold: {
          400: "#f7d24a",
          500: "#f5c518",
          600: "#d9a90a",
        },
        verdict: {
          es: "#16a34a",
          esBg: "#dcfce7",
          esMulti: "#2563eb",
          esMultiBg: "#dbeafe",
          other: "#dc2626",
          otherBg: "#fee2e2",
          inconc: "#d97706",
          inconcBg: "#fef3c7",
          pending: "#64748b",
          pendingBg: "#f1f5f9",
        },
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
