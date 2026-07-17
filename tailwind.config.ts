import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // CazaPAL palette — warm "cartucho" tones on a soft neutral.
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
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
