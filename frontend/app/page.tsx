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

export default function Home() {
  const { data, loading } = useApi(() => api<Impact>("/metrics/impact", { role: "analyst" }));
  const m = data?.offline;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-medium text-brand">Track 01 Trust &amp; Risk · Track 03 Financial independence</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Stop the scam <em className="not-italic text-brand">before</em> the money leaves.
          </h1>
          <p className="mt-3 max-w-2xl text-ink-2">
            Shurokkha scores every transfer in milliseconds, explains risk to the customer in plain Bangla, finds
            money-mule rings in the transaction graph and gives analysts an AI case summary grounded only in evidence.
            It answers three questions: <strong>What happened? Why is it risky? What should upay do next?</strong>
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/customer" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink">Try the customer demo</Link>
            <Link href="/analyst" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink">Open analyst console</Link>
            <Link href="/dashboard" className="rounded-lg px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2">See impact metrics →</Link>
          </div>
        </div>
        <Card title="Rahima's story" subtitle="Persona · remittance receiver, first smartphone">
          <ol className="space-y-2 text-sm text-ink-2">
            <li>1. A caller says she won a prize and must pay a <strong className="text-ink">2,000 BDT fee</strong>.</li>
            <li>2. She types a number she has never paid. Shurokkha sees 30+ new senders and fast cash-outs on it.</li>
            <li lang="bn" className="rounded-md bg-warning-soft p-2 text-warning-text">“একটু থামুন, এটি প্রতারণা হতে পারে”</li>
            <li>3. She cancels. The wallet goes to an analyst with the full mule-ring picture.</li>
          </ol>
        </Card>
      </section>

      <section aria-label="Key results" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {loading ? <Spinner /> : (
          <>
            <StatTile label="PR-AUC (held-out test)" value={m?.model ? m.model.pr_auc.toFixed(3) : "–"} hint="synthetic data" />
            <StatTile label="Fraud caught" value={fmtPct(m?.system?.recall)} hint={`precision ${fmtPct(m?.system?.precision)}`} />
            <StatTile label="Legit flagged (FPR)" value={fmtPct(m?.system?.false_positive_rate, 2)} hint="customer friction" />
            <StatTile label="Victim loss flagged" value={fmtPct(m?.business?.victim_loss_flagged_share)} hint={`est. ${fmtBDT(m?.business?.estimated_prevented_bdt)} prevented`} />
            <StatTile label="Scoring latency p95" value={data?.latency_ms.p95 != null ? `${data.latency_ms.p95} ms` : "–"} hint="live, this server" />
          </>
        )}
      </section>

      <Card title="How a decision is made" subtitle="Input → Intelligence → Action → Feedback (guideline §12)">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {FLOW.map((s, i) => (
            <li key={s.k} className="rounded-lg border border-line bg-surface-2 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-brand">{i + 1}. {s.k}</div>
              <div className="mt-1 text-sm font-medium text-ink">{s.t}</div>
              <div className="mt-1 text-xs text-ink-2">{s.d}</div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Responsible by design">
          <ul className="space-y-1.5 text-sm text-ink-2">
            <li>• 100% synthetic data, no real PII</li>
            <li>• The LLM narrates; it never decides</li>
            <li>• No permanent auto-block: HOLD goes to a human</li>
            <li>• Fairness audit across division, age, KYC, tenure</li>
          </ul>
        </Card>
        <Card title="Built to adapt">
          <ul className="space-y-1.5 text-sm text-ink-2">
            <li>• New detector = one file + one YAML line</li>
            <li>• Policy thresholds hot-reload without redeploy</li>
            <li>• Versioned model registry with one-click activate</li>
            <li>• Feature flags for every panel</li>
          </ul>
        </Card>
        <Card title="Built to survive">
          <ul className="space-y-1.5 text-sm text-ink-2">
            <li>• LLM down → deterministic template summaries</li>
            <li>• Model missing → rules-only mode, flagged degraded</li>
            <li>• Idempotent scoring, audit log, health probes</li>
            <li>• Redis optional, in-memory fallback</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
