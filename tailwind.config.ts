/**
 * File: tailwind.config.ts
 * 행사 브랜드 색상, 글꼴, 애니메이션과 스캔 경로를 정의한다.
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#141b13",
          soft: "#1c2a1a",
          card: "#20301e",
        },
        ivory: "#f0ecd9",
        gold: {
          DEFAULT: "#e8d97a",
          soft: "#f3e9a8",
        },
        sage: "#a9b5a0",
        optionA: {
          DEFAULT: "#e8d97a",
          dim: "#8a7f45",
        },
        optionB: {
          DEFAULT: "#7fb0a0",
          dim: "#4a6d61",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        script: ["var(--font-script)", "cursive"],
      },
      backgroundImage: {
        grain: "url('/grain.svg')",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        barGrow: {
          "0%": { width: "0%" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0,0)" },
          "50%": { transform: "translate(-2%, 2%)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.6s ease-out both",
        popIn: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
        drift: "drift 18s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
