import type { Config } from "tailwindcss";

// Palette: plum.* = deep forest green, ivory.* = warm cream, terracotta.* = soft lime accent (token names kept for stability).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        plum: { 950: "#12241b", 900: "#1b3a2b", 800: "#27503b", 700: "#336a4d", 600: "#3f8460", 100: "#dcebdd" },
        ivory: { DEFAULT: "#f6f4ec", 100: "#efece0", 200: "#e4e0d0", 300: "#d9d4c1" },
        terracotta: { DEFAULT: "#9cc24a", 600: "#86ac3a", 100: "#eef5d8" },
        rose: { muted: "#c98b8b" },
        charcoal: { DEFAULT: "#1e211f", 600: "#4c524e", 400: "#7b817c" },
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
