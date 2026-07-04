import type { Metadata } from "next";
import "./globals.css";
import { getTheme } from "@/lib/theme/actions";

export const metadata: Metadata = {
  title: "LifeCharter Command Suite",
  description: "The command center for running and building a coaching business.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getTheme();

  return (
    <html lang="en" className={theme === "dark" ? "dark" : undefined}>
      <body>{children}</body>
    </html>
  );
}
