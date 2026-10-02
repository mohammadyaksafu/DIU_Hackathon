"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";

import type { Decision } from "@/lib/types";

export function Card({ title, subtitle, actions, children, className = "" }: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

const DECISION_STYLE: Record<Decision, { cls: string; icon: string; label: string }> = {
  ALLOW: { cls: "bg-good-soft text-good-text border-good/40", icon: "✓", label: "Allow" },
  WARN: { cls: "bg-warning-soft text-warning-text border-warning/50", icon: "!", label: "Warn" },
  HOLD: { cls: "bg-critical-soft text-critical-text border-critical/40", icon: "■", label: "Hold" },
};

/** Status colour always paired with an icon + text label (never colour alone). */
export function DecisionBadge({ decision, size = "sm" }: { decision: Decision; size?: "sm" | "lg" }) {
  const s = DECISION_STYLE[decision];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${s.cls} ${size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" }) {
  const cls = tone === "brand" ? "bg-brand-soft text-brand" : "bg-surface-2 text-ink-2";
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function Button({ children, onClick, variant = "primary", disabled, type = "button", className = "" }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean; type?: "button" | "submit"; className?: string;
}) {
  const styles = {
    primary: "bg-brand text-brand-ink hover:opacity-90",
    secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
    danger: "bg-critical text-white hover:opacity-90",
    ghost: "text-ink-2 hover:bg-surface-2",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-2">{hint}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label}…
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-critical/40 bg-critical-soft p-3 text-sm text-critical-text" role="alert">
      <strong>Something went wrong.</strong> {error}
      {onRetry && (
        <button onClick={onRetry} className="ml-2 underline">Retry</button>
      )}
    </div>
  );
}

/** Horizontal meter for a 0..1 score; value is always printed next to the bar. */
export function ScoreBar({ value, label, threshold }: { value: number; label: string; threshold?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2 text-xs">
      <span className="text-ink-2">{label}</span>
      <div className="relative h-2 rounded-full bg-surface-2">
        <div className="h-2 rounded-full bg-series-1" style={{ width: `${pct}%` }} />
        {threshold != null && (
          <div className="absolute -top-1 h-4 w-px bg-ink-2" style={{ left: `${threshold * 100}%` }} title={`threshold ${threshold.toFixed(3)}`} />
        )}
      </div>
      <span className="tabular text-right text-ink">{value.toFixed(3)}</span>
    </div>
  );
}

/** Small data-loading hook with retry. */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    run()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [run]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}
