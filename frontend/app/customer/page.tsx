"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button, Card, DecisionBadge, ErrorBox, Pill, ScoreBar, Spinner, useApi } from "@/components/ui";
import { api, fmtBDT } from "@/lib/api";
import type { DemoCustomer, ScoreResponse, TxPayload } from "@/lib/types";

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
const SAFETY_EXAMPLES = [
  {
    title: "পুরস্কার জিতেছেন",
    category: "Prize fee scam",
    sender: "অচেনা নম্বর",
    message: "অভিনন্দন! আপনি পুরস্কার জিতেছেন। পুরস্কার পেতে আগে ২,০০০ টাকা পাঠান।",
    warning: "পুরস্কার পাওয়ার আগে টাকা চাইছে",
    advice: "পুরস্কার পাওয়ার জন্য আগে টাকা পাঠাবেন না। পরিচিত অফিসিয়াল নম্বরে যাচাই করুন।",
    demoWallet: "DEMO-PRIZE-01",
    demoAmount: "৳ ২,০০০",
  },
  {
    title: "ভুল করে টাকা পাঠিয়েছি",
    category: "Refund scam",
    sender: "অচেনা নম্বর",
    message: "ভাই, ভুল করে টাকা গেছে। দয়া করে এই অন্য নম্বরে এখনই ফেরত দিন।",
    warning: "ভিন্ন নম্বরে টাকা ফেরত দিতে বলছে",
    advice: "অপরিচিত কারও কথায় অন্য নম্বরে টাকা পাঠাবেন না। লেনদেনের ইতিহাস দেখে অফিসিয়াল সহায়তা নিন।",
    demoWallet: "DEMO-REFUND-02",
    demoAmount: "৳ ৫,০০০",
  },
  {
    title: "OTP বা PIN জানতে চাওয়া",
    category: "Account takeover",
    sender: "ভুয়া সহায়তাকারী",
    message: "আপনার অ্যাকাউন্ট বন্ধ হবে। যাচাইয়ের জন্য OTP আর PIN বলুন।",
    warning: "OTP/PIN চাইছে বা অ্যাকাউন্ট বন্ধের ভয় দেখাচ্ছে",
    advice: "OTP, PIN বা পাসওয়ার্ড কাউকে বলবেন না। upay-এর কর্মীও এগুলো চাইবেন না।",
    demoWallet: "DEMO-FAKE-HELP-03",
    demoAmount: "৳ ১২,০০০",
  },
  {
    title: "তাড়াহুড়া করে টাকা পাঠাতে বলা",
    category: "Social engineering",
    sender: "ফোনে অপরিচিত ব্যক্তি",
    message: "এখনই টাকা পাঠান, কাউকে বলবেন না। পরে সব বুঝিয়ে বলছি।",
    warning: "গোপন রাখতে ও দ্রুত সিদ্ধান্ত নিতে চাপ দিচ্ছে",
    advice: "চাপ দিলে থামুন। প্রাপক ও নম্বর আবার যাচাই করুন, সন্দেহ হলে পাঠাবেন না।",
    demoWallet: "DEMO-UNKNOWN-04",
    demoAmount: "৳ ৮,০০০",
  },
];

export default function CustomerPage() {
  const customers = useApi(() => api<DemoCustomer[]>("/simulator/customers", { role: "customer" }));
  const [cid, setCid] = useState<string>("");
  const [tx, setTx] = useState<TxPayload | null>(null);
  const [amountInput, setAmountInput] = useState("");
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
      const amount = Math.round((customer.typical_amount ?? 500) / 10) * 10;
      setTx({ type: "send_money", amount, sender: customer.id, receiver: "", device_id: customer.device_id, geo_cell: customer.home_geo, channel: "app" });
      setAmountInput(String(amount));
      setResult(null);
      setOutcome(null);
    }
  }, [customer]);

  async function send(ev?: FormEvent) {
    ev?.preventDefault();
    const amount = Number(amountInput);
    if (!tx || !tx.receiver || !Number.isFinite(amount) || amount <= 0) return;
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const r = await api<ScoreResponse>("/score", { role: "customer", body: { ...tx, amount } });
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
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(420px,1.05fr)_minmax(360px,0.95fr)]">
      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase text-brand">upay · secure demo wallet</p>
          <h1 className="mt-1 text-xl font-semibold text-ink">আপনার ওয়ালেট</h1>
          <p className="mt-1 text-sm text-ink-2">টাকা পাঠানোর আগে প্রাপক ও পরিমাণ যাচাই করুন।</p>
        </div>
        <div className="mx-auto w-full max-w-[480px]">
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
                <input type="number" min={1} max={1000000} value={amountInput} onChange={(e) => {
                  if (!tx) return;
                  const value = e.target.value.replace(/^0+(?=\d)/, "");
                  setAmountInput(value);
                  if (value !== "") setTx({ ...tx, amount: Number(value) });
                }}
                  className="tabular mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink" required />
              </label>
              {tx?.device_id && tx.device_id !== customer?.device_id && <Pill>Using a different phone: {tx.device_id}</Pill>}
              <Button type="submit" disabled={busy || !tx?.receiver || !amountInput || Number(amountInput) <= 0} className="w-full">{busy ? "…" : lang === "bn" ? "পাঠান" : "Send"}</Button>
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
      </section>

      <section className="space-y-4" aria-labelledby="safety-title">
        <div className="border-l-4 border-warning bg-warning-soft p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase text-warning-text">নিরাপত্তা বার্তা · Safety notice</p>
          <h2 id="safety-title" className="mt-1 text-lg font-semibold text-ink">সন্দেহ হলে থামুন, যাচাই করুন</h2>
          <p lang="bn" className="mt-2 text-sm leading-6 text-ink">
            কাউকে OTP বা PIN দেবেন না। পুরস্কার, ভুল লেনদেন ফেরত, বা অ্যাকাউন্ট বাঁচানোর নামে আগে টাকা পাঠাবেন না।
            টাকা পাঠানোর আগে প্রাপকের নাম ও নম্বর নিশ্চিত করুন।
          </p>
          <p className="mt-2 text-xs text-ink-2">এই সতর্কতাগুলো শুধু শেখার জন্য। নিচের উদাহরণগুলো আপনার ওয়ালেটের তথ্য বদলায় না এবং কোনো লেনদেন শুরু করে না।</p>
        </div>

        <Card title="প্রতারণার উদাহরণ" subtitle="একটি বিষয় খুলে লক্ষণ ও করণীয় দেখুন">
          <div className="divide-y divide-line">
            {SAFETY_EXAMPLES.map((example) => (
              <details key={example.category} className="group py-3 first:pt-0 last:pb-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left">
                  <span>
                    <span className="block text-sm font-medium text-ink">{example.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">{example.category}</span>
                  </span>
                  <span aria-hidden="true" className="text-lg text-brand transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-line bg-surface-2 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink">নমুনা কথোপকথন</span>
                      <span className="text-[10px] font-medium uppercase text-muted">শুধু উদাহরণ</span>
                    </div>
                    <div className="space-y-2 rounded-md bg-surface p-3">
                      <p className="text-[11px] text-muted">{example.sender}</p>
                      <p lang="bn" className="max-w-[95%] rounded-lg rounded-tl-sm bg-brand-soft p-2.5 text-sm leading-6 text-ink">{example.message}</p>
                    </div>
                  </div>
                  <div className="border-l-2 border-warning pl-3">
                    <p className="text-xs font-semibold text-warning-text">সন্দেহের লক্ষণ</p>
                    <p lang="bn" className="mt-1 text-sm font-medium leading-6 text-ink">{example.warning}</p>
                    <p className="mt-3 text-xs font-semibold text-ink-2">আপনি কী করবেন</p>
                    <p lang="bn" className="mt-1 text-sm leading-6 text-ink-2">{example.advice}</p>
                  </div>
                  <details className="group sm:col-span-2">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-t border-line pt-3 text-left">
                      <span>
                        <span className="block text-sm font-semibold text-brand">ওয়ালেটে নমুনাটি দেখুন</span>
                        <span className="mt-0.5 block text-xs text-muted">আলাদা, নিরাপদ ডেমো · আসল ওয়ালেটের সঙ্গে যুক্ত নয়</span>
                      </span>
                      <span aria-hidden="true" className="text-lg text-brand transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <div className="mt-3 max-w-sm rounded-xl border border-warning/60 bg-surface p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink">ডেমো ওয়ালেট</span>
                        <span className="rounded bg-warning-soft px-2 py-1 text-[10px] font-bold text-warning-text">শুধু অনুশীলন</span>
                      </div>
                      <div className="space-y-3 rounded-lg bg-surface-2 p-3">
                        <div>
                          <p className="text-[11px] text-muted">নমুনা প্রাপকের নম্বর</p>
                          <p className="mt-0.5 font-mono text-sm font-semibold text-ink">{example.demoWallet}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted">পাঠাতে বলা পরিমাণ</p>
                          <p className="mt-0.5 text-lg font-semibold text-ink">{example.demoAmount}</p>
                        </div>
                        <button type="button" disabled className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink opacity-70">
                          ডেমো: টাকা পাঠানো বন্ধ
                        </button>
                      </div>
                      <p lang="bn" className="mt-2 text-xs leading-5 text-warning-text">এই নম্বর ও পরিমাণ কাল্পনিক। বোতামটি নিষ্ক্রিয়; কোনো লেনদেন হবে না।</p>
                    </div>
                  </details>
                </div>
              </details>
            ))}
          </div>
        </Card>
      </section>

      <div className="xl:col-span-2">
        <Card title="Behind the scenes" subtitle="Risk details for this transfer. The examples above are separate and never run through your wallet.">
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
