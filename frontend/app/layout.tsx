import type { Metadata, Viewport } from "next";

import { ChatLauncher } from "@/components/ChatLauncher";
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
        <main className="animate-rise mx-auto max-w-7xl px-4 py-8">{children}</main>
        <ChatLauncher />
        <footer className="border-t border-line/70">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted">
            <span><strong className="font-semibold text-ink-2">Shurokkha</strong> prototype · AI DEV FEST 2026 · DIU CPC × upay hackathon</span>
            <span>Synthetic data only · The AI explains, humans decide</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
