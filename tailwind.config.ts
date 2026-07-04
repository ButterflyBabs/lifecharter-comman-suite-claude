import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
        // Stable across both themes — solid button fills and active-state
        // surfaces need a consistent, always-legible-with-white-text color
        // rather than flipping with the text/background palette above.
        accent: "var(--accent)",
      },
    },
  },
  plugins: [],
};

export default config;
