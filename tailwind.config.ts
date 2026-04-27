// Tailwind v4 is primarily configured via CSS (@theme in globals.css).
// This file is kept for any plugins added in later phases.
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
} satisfies Config;
