"use client";

import Link from "next/link";

import { Card, Spinner, StatTile, useApi } from "@/components/ui";
import { api, fmtBDT, fmtPct } from "@/lib/api";

interface Impact {
  model_version: string;
  offline: {
    model?: { pr_auc: number; recall_at_1pct_fpr: number };
    system?: { precision: number; recall: number; false_positive_rate: number; alerts_per_day: number };
    business?: { victim_loss_flagged_share: number; estimated_prevented_bdt: number };
  };
  live: { scams_averted: number; alerts_total: number };
  latency_ms: { p95: number | null };
}

const FLOW = [
  { k: "Input", t: "Transfer request", d: "Customer app / partner API calls /score before money moves." },
  { k: "Features", t: "Point-in-time features", d: "Velocity, novelty, device, SIM-swap, fan-in, graph community." },
  { k: "Detectors", t: "4 plug-in detectors", d: "Rules · Isolation Forest · LightGBM · mule-graph risk." },
  { k: "Policy", t: "YAML policy engine", d: "Business rules turn calibrated scores into ALLOW / WARN / HOLD." },
  { k: "Explain", t: "SHAP reason codes", d: "Only true reasons, rendered in Bangla and English." },
  { k: "Action", t: "Customer & analyst", d: "Scam interrupt, human review, AI case summary grounded in evidence." },
  { k: "Feedback", t: "Labels → retrain", d: "Analyst labels feed the model registry and threshold tuning." },
];

const CHECK = "M5 12l5 5L20 7";

const PILLARS = [
  {
    title: "Responsible by design",
    icon: "M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3zM9 12l2 2 4-4",
    items: ["100% synthetic data, no real PII", "The LLM narrates; it never decides", "No permanent auto-block: HOLD goes to a human", "Fairness audit across division, age, KYC, tenure"],
  },
  {
    title: "Built to adapt",
    icon: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4",
    items: ["New detector = one file + one YAML line", "Policy thresholds hot-reload without redeploy", "Versioned model registry with one-click activate", "Feature flags for every panel"],
  },
  {
    title: "Built to survive",
    icon: "M22 12h-4l-3 9L9 3l-3 9H2",
    items: ["LLM down → deterministic template summaries", "Model missing → rules-only mode, flagged degraded", "Idempotent scoring, audit log, health probes", "Redis optional, in-memory fallback"],
  },
];

function Glyph({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export default function Home() {
  const { data, loading } = useApi(() => api<Impact>("/metrics/impact", { role: "analyst" }));
  const m = data?.offline;

  return (
    <div className="space-y-12">
      {/* ---------------- hero ---------------- */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-raised">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
        <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex flex-wrap items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              Track 01 Trust &amp; Risk · Track 03 Financial independence
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl">
              Stop the scam <span className="text-gradient">before</span> the money leaves.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2">
              Shurokkha scores every transfer in milliseconds, explains risk to the customer in plain Bangla, finds
              money-mule rings in the transaction graph and gives analysts an AI case summary grounded only in evidence.
            </p>
            <ul className="mt-5 grid max-w-xl gap-2 text-sm text-ink sm:grid-cols-3">
              {["What happened?", "Why is it risky?", "What should upay do next?"].map((q) => (
                <li key={q} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/70 px-3 py-2">
                  <Glyph d={CHECK} className="h-4 w-4 shrink-0 text-brand" />
                  {q}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/customer" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink shadow-raised transition hover:brightness-110 active:scale-[0.98]">
                Try the customer demo
                <Glyph d="M5 12h14M13 6l6 6-6 6" className="h-4 w-4" />
              </Link>
              <Link href="/analyst" className="inline-flex items-center rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:border-axis hover:bg-surface-2">
                Open analyst console
              </Link>
              <Link href="/dashboard" className="inline-flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 transition hover:text-brand">
                See impact metrics →
              </Link>
            </div>
          </div>

          {/* Preview of what Rahima sees on her phone. */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand/25 via-transparent to-critical/20 blur-2xl" aria-hidden />
            <figure className="relative rounded-[1.75rem] border border-line bg-surface p-5 shadow-float">
              <figcaption className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted">
                <span className="font-medium text-ink-2">Rahima&apos;s story</span>
                <span>remittance receiver · first smartphone</span>
              </figcaption>
              <div className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm text-ink-2">
                A caller says she won a prize and must pay a <strong className="text-ink">2,000 BDT fee</strong> to a number she has never paid.
              </div>
              <div className="mt-3 rounded-2xl border border-critical/40 bg-critical-soft p-4">
                <div className="flex items-start justify-between gap-2">
                  <span lang="bn" className="font-semibold text-ink">একটু থামুন, এটি প্রতারণা হতে পারে</span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-critical/40 bg-surface px-2 py-0.5 text-xs font-semibold text-critical-text">
                    <span aria-hidden>■</span>Hold
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-ink-2">
                  <li>• 30+ new senders paid this number recently</li>
                  <li>• Money on it is cashed out fast</li>
                  <li>• You have never paid this number before</li>
                </ul>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-good-soft px-3 py-2 text-sm font-medium text-good-text">
                <Glyph d={CHECK} className="h-4 w-4 shrink-0" />
                She cancels. An analyst gets the full mule-ring picture.
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* ---------------- key results ---------------- */}
      <section aria-labelledby="results-title">
        <h2 id="results-title" className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Results on held-out data</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {loading ? <Spinner /> : (
            <>
              <StatTile label="PR-AUC (held-out test)" value={m?.model ? m.model.pr_auc.toFixed(3) : "–"} hint="synthetic data" />
              <StatTile label="Fraud caught" value={fmtPct(m?.system?.recall)} hint={`precision ${fmtPct(m?.system?.precision)}`} />
              <StatTile label="Legit flagged (FPR)" value={fmtPct(m?.system?.false_positive_rate, 2)} hint="customer friction" />
              <StatTile label="Victim loss flagged" value={fmtPct(m?.business?.victim_loss_flagged_share)} hint={`est. ${fmtBDT(m?.business?.estimated_prevented_bdt)} prevented`} />
              <StatTile label="Scoring latency p95" value={data?.latency_ms.p95 != null ? `${data.latency_ms.p95} ms` : "–"} hint="live, this server" />
            </>
          )}
        </div>
      </section>

      {/* ---------------- pipeline ---------------- */}
      <section aria-labelledby="flow-title">
        <div className="mb-4">
          <h2 id="flow-title" className="text-xl font-semibold tracking-tight text-ink">How a decision is made</h2>
          <p className="text-sm text-muted">Input → Intelligence → Action → Feedback (guideline §12)</p>
        </div>
        <div className="relative">
          <div className="absolute inset-x-0 top-[1.1rem] hidden h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent lg:block" aria-hidden />
          <ol className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {FLOW.map((s, i) => (
              <li key={s.k} className="flex flex-col">
                <span className="mb-3 grid h-9 w-9 place-items-center rounded-full border border-brand/30 bg-surface text-sm font-semibold text-brand shadow-card">
                  {i + 1}
                </span>
                <div className="flex-1 rounded-2xl border border-line bg-surface p-3.5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-raised">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-brand">{s.k}</div>
                  <div className="mt-1 text-sm font-semibold text-ink">{s.t}</div>
                  <div className="mt-1 text-xs leading-relaxed text-ink-2">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- pillars ---------------- */}
      <section className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => (
          <Card key={p.title}>
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Glyph d={p.icon} />
            </div>
            <h2 className="font-semibold tracking-tight text-ink">{p.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-2">
              {p.items.map((it) => (
                <li key={it} className="flex gap-2">
                  <Glyph d={CHECK} className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  {it}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>
    </div>
  );
}
