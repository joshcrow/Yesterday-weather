import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // The ledger's ink system — flat, editorial, decidedly not a sky.
        ink: {
          DEFAULT: "#0A0E15", // page canvas
          raised: "#10151E", // panels
          line: "rgba(240,243,248,0.09)", // hairlines
        },
        paper: {
          DEFAULT: "#F2F4F8", // primary text
          dim: "rgba(242,244,248,0.64)", // secondary text
          faint: "rgba(242,244,248,0.42)", // tertiary/labels
        },
        // Time-phase accents (validated for CVD + contrast on dark surface).
        past: {
          DEFAULT: "#D97706", // observed marks
          soft: "rgba(217,119,6,0.14)",
          text: "#F0A84B", // UI accent text (chips/links), not chart text
        },
        future: {
          DEFAULT: "#0284C7", // expected marks
          soft: "rgba(2,132,199,0.14)",
          text: "#53B2E8",
        },
      },
      fontFamily: {
        display: [
          "var(--font-grotesk)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        quip: ["Georgia", "Times New Roman", "serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out both",
        "slide-up": "slideUp 0.5s ease-out both",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
