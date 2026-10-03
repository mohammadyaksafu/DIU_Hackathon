"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ChatExperience } from "@/components/ChatExperience";
import type { Role } from "@/lib/api";

export function ChatLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const role: Role = pathname.startsWith("/customer") ? "customer" : "analyst";

  if (pathname === "/chat") return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      {open && (
        <div className="mb-3 h-[min(72vh,42rem)] w-[min(92vw,26rem)]">
          <ChatExperience compact role={role} onClose={() => setOpen(false)} />
          <Link href={role === "customer" ? "/chat?audience=customer" : "/chat"} onClick={() => setOpen(false)}
            className="mt-2 block rounded-lg border border-line bg-surface px-3 py-2 text-center text-xs font-medium text-brand shadow">
            Open full chat
          </Link>
        </div>
      )}
      <button onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close AI chat" : "Open AI chat"}
        className="ml-auto flex min-h-12 items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-brand-ink shadow-lg hover:opacity-90">
        <span aria-hidden>✦</span>{open ? "Close chat" : "Ask AI"}
      </button>
    </div>
  );
}
