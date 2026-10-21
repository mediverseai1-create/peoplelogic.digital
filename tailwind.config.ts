import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        plum: { 950: "#1f0f1d", 900: "#2e1a2c", 800: "#43263f", 700: "#5a3354", 600: "#734269", 100: "#eadfe8" },
        ivory: { DEFAULT: "#faf6ef", 100: "#f4ede0", 200: "#e8dec9", 300: "#d6c9ae" },
        terracotta: { DEFAULT: "#b8654a", 600: "#9c4f36", 100: "#f3ddd4" },
        rose: { muted: "#c98b8b" },
        charcoal: { DEFAULT: "#26232a", 600: "#4a4650", 400: "#767079" },
        signal: { high: "#a8342b", watch: "#b7791f", ok: "#3f7d5c", info: "#4b5d8f" },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "'Times New Roman'", "serif"],
        sans: ["ui-sans-serif", "system-ui", "'Segoe UI'", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
