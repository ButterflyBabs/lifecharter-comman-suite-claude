import type { Metadata } from "next";
import { Cormorant_Garamond, Open_Sans } from "next/font/google";
import "./globals.css";
import { getTheme } from "@/lib/theme/actions";
import { getAccessibilityPrefs } from "@/lib/accessibility/actions";

// Brand board (Section 3, Typography): Cormorant Garamond as the "elegant
// classic serif" for display/headings, Open Sans as the "clean, readable
// sans" for body/supporting text. next/font self-hosts and subsets these at
// build time rather than a runtime Google Fonts <link> — faster and works
// offline.
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeCharter Command Suite",
  description: "The command center for running and building a coaching business.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getTheme();
  const a11y = await getAccessibilityPrefs();

  const classes = [
    cormorantGaramond.variable,
    openSans.variable,
    theme === "dark" ? "dark" : "",
    a11y.reduce_motion ? "lc-reduce-motion" : "",
    a11y.high_contrast ? "lc-high-contrast" : "",
    a11y.large_text ? "lc-large-text" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html lang="en" className={classes}>
      <body>{children}</body>
    </html>
  );
}
