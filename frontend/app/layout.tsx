import type { Metadata, Viewport } from "next";

import { Nav } from "@/components/Nav";

import "./globals.css";

export const metadata: Metadata = {
  title: "Shurokkha · AI Trust Copilot",
  description: "Real-time scam interruption, mule-ring detection and an evidence-grounded investigation copilot for MFS.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-page text-ink">
        <Nav />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-muted">
          Shurokkha prototype · AI DEV FEST 2026 · DIU CPC × upay hackathon · synthetic data only
        </footer>
      </body>
    </html>
  );
}
