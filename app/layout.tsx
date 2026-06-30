import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flinza Works — Prospect CRM",
  description: "Acquisition pipeline for DTC fashion accessories brands",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
