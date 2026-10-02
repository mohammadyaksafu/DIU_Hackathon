"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { health } from "@/lib/api";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/customer", label: "Customer app" },
  { href: "/analyst", label: "Analyst console" },
  { href: "/copilot", label: "SOP copilot" },
  { href: "/dashboard", label: "Impact" },
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  const path = usePathname();
  const [status, setStatus] = useState<string>("checking");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = () => health().then((h) => alive && setStatus(h.status)).catch(() => alive && setStatus("offline"));
    check();
    const t = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const dot = { ok: "bg-good", degraded: "bg-warning", checking: "bg-axis" }[status] ?? "bg-critical";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-ink" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <span>Shurokkha <span className="font-normal text-muted">সুরক্ষা</span></span>
        </Link>
        <nav className="ml-4 hidden gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm ${active ? "bg-brand-soft font-medium text-brand" : "text-ink-2 hover:bg-surface-2"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted" title="API health">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="hidden sm:inline">API {status}</span>
          <button className="ml-2 rounded-md border border-line px-2 py-1 md:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
            Menu
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line px-4 py-2 md:hidden" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-2 py-2 text-sm text-ink-2 hover:bg-surface-2">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="bg-brand-soft px-4 py-1 text-center text-[11px] text-brand">
        Demo prototype: all customers, wallets and transactions are synthetic. No real personal data.
      </div>
    </header>
  );
}
