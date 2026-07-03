import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeCharter Command Suite",
  description: "The command center for running and building a coaching business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
