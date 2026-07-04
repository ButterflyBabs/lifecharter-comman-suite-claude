import type { Metadata } from "next";
import { Cormorant_Garamond, Open_Sans } from "next/font/google";
import "./globals.css";
import { getTheme } from "@/lib/theme/actions";

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

  return (
    <html lang="en" className={`${cormorantGaramond.variable} ${openSans.variable} ${theme === "dark" ? "dark" : ""}`}>
      <body>{children}</body>
    </html>
  );
}
