"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button, Card, DecisionBadge, ErrorBox, Pill, ScoreBar, Spinner, useApi } from "@/components/ui";
import { api, fmtBDT } from "@/lib/api";
import type { DemoCustomer, Scenario, ScoreResponse, TxPayload } from "@/lib/types";

type Lang = "bn" | "en";
const PERSONA_LABEL: Record<string, string> = {
  remittance_receiver: "Remittance receiver",
  garments_worker: "Garments worker",
  student: "Student",
  professional: "Professional",
  shopkeeper: "Shopkeeper",
  fcommerce_seller: "Online seller",
  freelancer: "Freelancer",
};
const TX_TYPES = ["send_money", "payment", "cash_out"];

export default function CustomerPage() {
  const customers = useApi(() => api<DemoCustomer[]>("/simulator/customers", { role: "customer" }));
  const scenarios = useApi(() => api<Scenario[]>("/simulator/scenarios", { role: "customer" }));
  const [cid, setCid] = useState<string>("");
  const [tx, setTx] = useState<TxPayload | null>(null);
  const [setup, setSetup] = useState<string[]>([]);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("bn");

  const customer = customers.data?.find((c) => c.id === cid) ?? null;

  useEffect(() => {
    if (!cid && customers.data?.length) setCid(customers.data[0].id);
  }, [customers.data, cid]);

  useEffect(() => {
    if (customer) {
      setTx({ type: "send_money", amount: Math.round((customer.typical_amount ?? 500) / 10) * 10, sender: customer.id, receiver: "", device_id: customer.device_id, geo_cell: customer.home_geo, channel: "app" });
      setResult(null);
      setOutcome(null);
      setSetup([]);
    }
  }, [customer]);

  async function runScenario(key: string) {
    if (!customer) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setOutcome(null);
    try {
      const r = await api<{ setup: string[]; transaction: TxPayload }>("/simulator/scenarios/run", { role: "customer", body: { customer_id: customer.id, scenario: key } });
      setTx(r.transaction);
      setSetup(r.setup);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function send(ev?: FormEvent) {
    ev?.preventDefault();
    if (!tx || !tx.receiver || !tx.amount) return;
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const r = await api<ScoreResponse>("/score", { role: "customer", body: tx });
      setResult(r);
      if (r.decision === "ALLOW") await confirm(r, "sent");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(r: ScoreResponse, action: "sent" | "cancelled") {
    const res = await api<{ status: string }>(`/transactions/${r.transaction_id}/confirm`, { role: "customer", body: { action } });
    setOutcome(res.status);
  }

  if (customers.loading) return <Spinner label="Loading demo customers" />;
  if (customers.error) return <ErrorBox error={customers.error} onRetry={customers.reload} />;

  const msg = result?.customer_message[lang];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      {/* ---------------- phone ---------------- */}
      <div className="mx-auto w-full max-w-[380px]">
        <div className="rounded-[2rem] border-8 border-ink/85 bg-surface shadow-xl">
          <div className="rounded-t-[1.4rem] bg-brand px-5 pb-5 pt-4 text-brand-ink">
            <div className="flex items-center justify-between text-xs opacity-90">
              <span>upay · demo wallet</span>
              <button onClick={() => setLang(lang === "bn" ? "en" : "bn")} className="rounded-full border border-current px-2 py-0.5" aria-label="Switch language">
                {lang === "bn" ? "English" : "বাংলা"}
              </button>
            </div>
            <label className="mt-3 block text-xs opacity-90" htmlFor="cust">Signed in as</label>
            <select id="cust" value={cid} onChange={(e) => setCid(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/15 px-2 py-1.5 text-sm text-brand-ink [&>option]:text-black">
              {customers.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {PERSONA_LABEL[c.persona] ?? c.persona}</option>
              ))}
            </select>
            {customer && <div className="mt-2 text-xs opacity-90">{customer.id} · {customer.division} · usual transfer ≈ {fmtBDT(customer.typical_amount)}</div>}
          </div>

          <form onSubmit={send} className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-ink">{lang === "bn" ? "টাকা পাঠান" : "Send money"}</h2>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
              {TX_TYPES.map((t) => (
                <button type="button" key={t} onClick={() => tx && setTx({ ...tx, type: t })}
                  className={`rounded-md px-2 py-1.5 text-xs ${tx?.type === t ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-2"}`}>
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
            <label className="block text-xs text-ink-2">
              {lang === "bn" ? "প্রাপকের ওয়ালেট" : "Receiver wallet"}
              <input value={tx?.receiver ?? ""} onChange={(e) => tx && setTx({ ...tx, receiver: e.target.value.trim() })}
                placeholder="e.g. C00012" className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink" required pattern="[A-Za-z0-9_\-]{2,32}" />
            </label>
            <label className="block text-xs text-ink-2">
              {lang === "bn" ? "পরিমাণ (টাকা)" : "Amount (BDT)"}
              <input type="number" min={1} max={1000000} value={tx?.amount ?? ""} onChange={(e) => tx && setTx({ ...tx, amount: Number(e.target.value) })}
                className="tabular mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink" required />
            </label>
            {tx?.device_id && tx.device_id !== customer?.device_id && <Pill>Using a different phone: {tx.device_id}</Pill>}
            <Button type="submit" disabled={busy || !tx?.receiver} className="w-full">{busy ? "…" : lang === "bn" ? "পাঠান" : "Send"}</Button>
            {error && <ErrorBox error={error} />}
          </form>

          {result && msg && (
            <div className="border-t border-line p-5" aria-live="polite">
              <div className={`rounded-xl border p-4 ${result.decision === "ALLOW" ? "border-good/40 bg-good-soft" : result.decision === "WARN" ? "border-warning/50 bg-warning-soft" : "border-critical/40 bg-critical-soft"}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 lang={lang} className="font-semibold text-ink">{msg.title}</h3>
                  <DecisionBadge decision={result.decision} />
                </div>
                {msg.reasons.length > 0 && (
                  <ul lang={lang} className="mt-2 space-y-1.5 text-sm text-ink">
                    {msg.reasons.map((r) => <li key={r}>• {r}</li>)}
                  </ul>
                )}
                <p lang={lang} className="mt-2 text-xs text-ink-2">{msg.body}</p>
                {!outcome && result.decision === "WARN" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button onClick={() => confirm(result, "cancelled")}>{lang === "bn" ? "বাতিল করুন" : "Cancel"}</Button>
                    <Button variant="secondary" onClick={() => confirm(result, "sent")}>{lang === "bn" ? "তবুও পাঠান" : "Send anyway"}</Button>
                  </div>
                )}
                {!outcome && result.decision === "HOLD" && (
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <Button onClick={() => confirm(result, "cancelled")}>{lang === "bn" ? "লেনদেন বাতিল করুন" : "Cancel this transfer"}</Button>
                    <p className="text-center text-xs text-ink-2">{lang === "bn" ? "অথবা আমাদের টিমের যাচাইয়ের জন্য অপেক্ষা করুন" : "Or wait for our team to verify it"}</p>
                  </div>
                )}
                {outcome && (
                  <p className="mt-3 text-sm font-medium text-ink">
                    {outcome === "SENT" ? (lang === "bn" ? "✓ টাকা পাঠানো হয়েছে" : "✓ Money sent") : (lang === "bn" ? "✓ বাতিল হয়েছে, আপনার টাকা নিরাপদ" : "✓ Cancelled. Your money is safe")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- demo controls + behind the scenes ---------------- */}
      <div className="space-y-4">
        <Card title="One-click demo scenarios" subtitle="Each scenario prepares realistic context, then fills the transfer form. Press Send to score it.">
          {scenarios.loading ? <Spinner /> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {scenarios.data?.map((s) => (
                <button key={s.key} onClick={() => runScenario(s.key)} disabled={busy}
                  className="rounded-lg border border-line bg-surface p-3 text-left transition hover:border-brand hover:bg-brand-soft disabled:opacity-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{s.title}</span>
                    <span className="text-[11px] text-muted">expect {s.expected}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-2">{s.description}</p>
                </button>
              ))}
            </div>
          )}
          {setup.length > 0 && (
            <div className="mt-3 rounded-lg bg-surface-2 p-3 text-xs text-ink-2">
              <strong className="text-ink">Context applied:</strong> {setup.join(" · ")}
            </div>
          )}
        </Card>

        <Card title="Behind the scenes" subtitle="What the risk engine saw. Customers see only the plain-language card.">
          {!result ? (
            <p className="text-sm text-muted">Send a transfer to see the decision trace.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <DecisionBadge decision={result.decision} size="lg" />
                <span className="tabular text-sm text-ink-2">risk <strong className="text-ink">{result.risk_score.toFixed(3)}</strong></span>
                <span className="tabular text-sm text-ink-2">latency <strong className="text-ink">{result.latency_ms} ms</strong></span>
                <Pill>model {result.model_version}</Pill>
                <Pill>policy v{result.policy_version}</Pill>
                {result.degraded && <Pill>degraded: {result.degraded_reasons.join(", ")}</Pill>}
              </div>
              <div className="space-y-2">
                {result.signals.map((s) => (
                  <ScoreBar key={s.detector} label={`${s.detector}${s.ok ? "" : " (failed)"}`} value={s.score}
                    threshold={s.detector === "lgbm" ? result.policy.variables.warn_t : undefined} />
                ))}
                <p className="text-[11px] text-muted">Tick on the lgbm bar = WARN threshold for this customer segment{result.policy.overrides.length ? ` (override: ${result.policy.overrides.join(", ")})` : ""}.</p>
              </div>
              <div>
                <div className="text-xs font-medium text-ink-2">Reason codes</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {result.reason_codes.length ? result.reason_codes.map((r) => <Pill key={r} tone="brand">{r}</Pill>) : <span className="text-xs text-muted">none (allowed)</span>}
                </div>
              </div>
              <div className="text-xs text-ink-2">
                Policy tier matched: <code className="rounded bg-surface-2 px-1 py-0.5 text-ink">{result.policy.matched}</code>
              </div>
              {result.alert_id && (
                <a href={`/analyst/cases/${result.alert_id}`} className="inline-block text-sm font-medium text-brand underline">
                  Open alert #{result.alert_id} in the analyst console →
                </a>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
