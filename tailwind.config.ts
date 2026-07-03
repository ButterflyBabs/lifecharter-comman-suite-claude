import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "deep-indigo": "#1F315B",
        "royal-plum": "#5E3B6C",
        "sacred-teal": "#2E7C83",
        "soft-lavender": "#CDBED6",
        "warm-gold": "#D4AF63",
        "ivory-light": "#F6F1E8",
        "soft-taupe": "#B9A9A9",
      },
    },
  },
  plugins: [],
};

export default config;
