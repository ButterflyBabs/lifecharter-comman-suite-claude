import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Brand board Section 3: Cormorant Garamond for display/headings
        // ("elegant classic serif"), Open Sans for body ("clean, readable
        // sans"). Both loaded via next/font in app/layout.tsx.
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        // Theme-aware (flip between light/dark in globals.css) — used for
        // page text, backgrounds, and secondary surfaces throughout the app.
        "deep-indigo": "var(--deep-indigo)",
        "royal-plum": "var(--royal-plum)",
        "sacred-teal": "var(--sacred-teal)",
        "soft-lavender": "var(--soft-lavender)",
        "warm-gold": "var(--warm-gold)",
        "ivory-light": "var(--ivory-light)",
        "soft-taupe": "var(--soft-taupe)",
      },
    },
  },
  plugins: [],
};

export default config;
