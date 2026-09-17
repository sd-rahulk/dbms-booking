import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#F7F5F0",
        charcoal: "#171717",
        amber: "#D99A38",
        ash: "#858585",
        line: "#DEDCD5",
        paper: "#EFEEE8",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
      },
      boxShadow: {
        editorial: "0 18px 48px rgba(23,23,23,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
