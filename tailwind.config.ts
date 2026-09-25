import type { Config } from "tailwindcss";

/**
 * Sistema de diseño de Toca y Recuerda.
 * Paleta derivada del logo: crema cálido de fondo + azul pizarra como color de marca.
 * Un único acento cálido (ámbar) para CTAs y estados "premium", evitando saturar de colores (ver spec #69).
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FCFBF7",
          100: "#F7F4EC", // fondo base de marca (igual que el logo)
          200: "#EFEADC",
          300: "#E4DCC7",
        },
        ink: {
          50: "#EEF1F4",
          100: "#D7DEE6",
          300: "#8C9BAC",
          500: "#4C5F73", // azul pizarra secundario
          700: "#33475B", // azul pizarra del logo (color de marca principal)
          900: "#212F3C", // texto principal / máximo contraste
        },
        amber: {
          400: "#E4A959",
          500: "#D8933B", // acento cálido: CTAs principales, badge "Premium"
          600: "#B8752A",
        },
        success: "#4C7A5E",
        danger: "#B4483C",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 2px 16px -4px rgba(33, 47, 60, 0.12)",
        card: "0 4px 24px -8px rgba(33, 47, 60, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
