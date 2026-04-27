import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f1d2b",
        cream: "#fff7ec",
        mint: "#7ed7c1",
        coral: "#ff7a7a",
        sun: "#ffd166",
        sky: "#7ec4ff",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        chunky: "1.25rem",
      },
      boxShadow: {
        chunky: "0 6px 0 0 rgba(31, 29, 43, 0.85)",
      },
    },
  },
  plugins: [],
} satisfies Config;
