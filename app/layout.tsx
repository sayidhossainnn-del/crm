import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flinza Works — Prospect CRM",
  description: "Acquisition pipeline for DTC fashion accessories brands",
};

export const viewport: Viewport = {
  themeColor: "#08090d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
