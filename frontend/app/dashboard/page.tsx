"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, ErrorBox, PageHeader, RefreshButton, Spinner, StatTile, useApi } from "@/components/ui";
import { api, fmtBDT, fmtPct } from "@/lib/api";

interface Metrics {
  model: { pr_auc: number; roc_auc: number; recall_at_1pct_fpr: number; brier: number };
  lift_table: Record<string, { pr_auc: number; roc_auc: number; recall_at_1pct_fpr: number }>;
  system: { alerts_per_day: number; precision: number; recall: number; false_positive_rate: number; hold_precision: number; decisions: Record<string, number>; test_transactions: number; test_days: number };
  per_scenario: Record<string, { n: number; recall_flagged: number; recall_hold: number }>;
  business: { victim_loss_total_bdt: number; victim_loss_flagged_bdt: number; victim_loss_flagged_share: number; estimated_prevented_bdt: number; legit_customers_warned_per_day: number; mule_cashout_value_flagged_bdt: number; assumptions: { warn_heeded_rate: number; note: string } };
  fairness: Record<string, { groups: Record<string, { fpr: number; n_legit: number }>; max_min_ratio: number; flag: boolean }>;
  thresholds: { warn_t: number; hold_t: number };
  feature_importance_top15: { feature: string; gain_share: number }[];
  data: { n_transactions: number; n_fraud: number; fraud_rate: number; n_days: number };
}

interface Impact {
  model_version: string;
  offline: Metrics;
  live: {
    scored_by_decision: Record<string, number>;
    alerts_total: number;
    alerts_by_status: Record<string, number>;
    analyst_confirmed_precision: Record<string, number | null>;
    scams_averted: number;
    amount_protected_bdt: number;
    median_time_to_decision_s: number | null;
  };
  latency_ms: { p50: number | null; p95: number | null; p99: number | null };
  system: { llm: { provider: string; model: string | null }; degraded: string[]; cache_backend: string };
}

const MODEL_LABEL: Record<string, string> = {
  rules_only: "Rules only",
  logistic_regression: "Logistic regression",
  lightgbm_no_graph_no_anomaly: "LightGBM (no graph)",
  lightgbm_full: "LightGBM + graph + anomaly",
};
const SCENARIO_LABEL: Record<string, string> = {
  S1_ato: "S1 Account takeover",
  S2_prize_scam: "S2 Prize scam",
  S3_refund_bait: "S3 Refund bait",
  S3_refund_scam: "S3 Refund scam",
  S4_mule_forward: "S4 Mule forward",
  S4_mule_cashout: "S4 Mule cash-out",
  S5_structuring: "S5 Structuring",
  S6_social_engineering: "S6 Social engineering",
};

const axisTick = { fill: "var(--muted)", fontSize: 11 };
const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, color: "var(--ink)" };
const pctFmt = (v: unknown) => `${(Number(v) * 100).toFixed(1)}%`;

export default function Dashboard() {
  const { data, error, loading, reload } = useApi(() => api<Impact>("/metrics/impact", { role: "analyst" }));
  if (loading && !data) return <Spinner label="Loading metrics" />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data?.offline?.model) return <ErrorBox error="No trained model metrics available (rules-only mode)." />;
  const m = data.offline;

  const lift = Object.entries(m.lift_table).map(([k, v]) => ({ name: MODEL_LABEL[k] ?? k, pr_auc: v.pr_auc, recall: v.recall_at_1pct_fpr }));
  const scen = Object.entries(m.per_scenario).map(([k, v]) => ({ name: SCENARIO_LABEL[k] ?? k, flagged: v.recall_flagged, n: v.n }));
  const fi = m.feature_importance_top15.slice(0, 10).map((f) => ({ name: f.feature, share: f.gain_share }));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Impact" title="Impact &amp; model quality"
        description={<>
          Held-out test window: last {m.system.test_days} days ({m.system.test_transactions.toLocaleString()} transactions), never used for training or thresholds.
          Model <code className="text-ink">{data.model_version}</code>.
        </>}
        actions={<RefreshButton onClick={reload} />} />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Headline metrics">
        <StatTile label="PR-AUC" value={m.model.pr_auc.toFixed(3)} hint={`ROC-AUC ${m.model.roc_auc.toFixed(3)}`} />
        <StatTile label="Recall @ 1% FPR" value={fmtPct(m.model.recall_at_1pct_fpr)} hint="model ranking quality" />
        <StatTile label="System precision" value={fmtPct(m.system.precision)} hint={`recall ${fmtPct(m.system.recall)}`} />
        <StatTile label="Victim loss flagged" value={fmtPct(m.business.victim_loss_flagged_share)} hint={`${fmtBDT(m.business.victim_loss_flagged_bdt)} of ${fmtBDT(m.business.victim_loss_total_bdt)}`} />
        <StatTile label="Est. loss prevented" value={fmtBDT(m.business.estimated_prevented_bdt)} hint={`assumes ${fmtPct(m.business.assumptions.warn_heeded_rate, 0)} of warnings heeded`} />
        <StatTile label="Legit customers warned" value={`${m.business.legit_customers_warned_per_day}/day`} hint={`FPR ${fmtPct(m.system.false_positive_rate, 2)}`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="AI adds value beyond rules (lift table)" subtitle="Same test set. Both measures share one 0–100% axis.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lift} layout="vertical" margin={{ left: 8, right: 44 }} barGap={2} barCategoryGap="22%">
                <CartesianGrid horizontal={false} stroke="var(--line)" />
                <XAxis type="number" domain={[0, 1]} tickFormatter={pctFmt} tick={axisTick} axisLine={{ stroke: "var(--axis)" }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={150} tick={{ ...axisTick, fill: "var(--ink-2)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={pctFmt} contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-2)" }} iconType="square" />
                <Bar dataKey="pr_auc" name="PR-AUC" fill="var(--series-1)" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="pr_auc" position="right" formatter={(v: unknown) => Number(v).toFixed(2)} style={{ fill: "var(--ink-2)", fontSize: 11 }} />
                </Bar>
                <Bar dataKey="recall" name="Recall @ 1% FPR" fill="var(--series-2)" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="recall" position="right" formatter={pctFmt} style={{ fill: "var(--ink-2)", fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="What we catch: recall by fraud scenario" subtitle="Share of each injected scenario flagged WARN or HOLD by the full system">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scen} layout="vertical" margin={{ left: 8, right: 44 }} barCategoryGap="25%">
                <CartesianGrid horizontal={false} stroke="var(--line)" />
                <XAxis type="number" domain={[0, 1]} tickFormatter={pctFmt} tick={axisTick} axisLine={{ stroke: "var(--axis)" }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={150} tick={{ ...axisTick, fill: "var(--ink-2)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={pctFmt} labelFormatter={(l, p) => `${l} (n=${p?.[0]?.payload?.n ?? "?"})`} contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
                <Bar dataKey="flagged" name="Flagged" fill="var(--series-1)" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="flagged" position="right" formatter={pctFmt} style={{ fill: "var(--ink-2)", fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Live operations (this server)" className="lg:col-span-1">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted">Scams averted (cancelled)</dt><dd className="text-lg font-semibold text-ink">{data.live.scams_averted}</dd></div>
            <div><dt className="text-xs text-muted">Amount protected</dt><dd className="text-lg font-semibold text-ink">{fmtBDT(data.live.amount_protected_bdt)}</dd></div>
            <div><dt className="text-xs text-muted">Scoring p50 / p95</dt><dd className="tabular text-ink">{data.latency_ms.p50 ?? "–"} / {data.latency_ms.p95 ?? "–"} ms</dd></div>
            <div><dt className="text-xs text-muted">Median time to decision</dt><dd className="tabular text-ink">{data.live.median_time_to_decision_s != null ? `${data.live.median_time_to_decision_s}s` : "–"}</dd></div>
            <div><dt className="text-xs text-muted">Analyst-confirmed precision</dt>
              <dd className="tabular text-ink">HOLD {fmtPct(data.live.analyst_confirmed_precision.HOLD)} · WARN {fmtPct(data.live.analyst_confirmed_precision.WARN)}</dd></div>
            <div><dt className="text-xs text-muted">Alerts</dt>
              <dd className="tabular text-ink">{Object.entries(data.live.alerts_by_status).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(" · ")}</dd></div>
            <div><dt className="text-xs text-muted">LLM</dt><dd className="text-ink">{data.system.llm.provider === "none" ? "off (template mode)" : data.system.llm.model}</dd></div>
            <div><dt className="text-xs text-muted">Cache</dt><dd className="text-ink">{data.system.cache_backend}</dd></div>
          </dl>
        </Card>

        <Card title="Top model drivers" subtitle="Share of LightGBM split gain" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fi} layout="vertical" margin={{ left: 8, right: 44 }} barCategoryGap="25%">
                <CartesianGrid horizontal={false} stroke="var(--line)" />
                <XAxis type="number" tickFormatter={pctFmt} tick={axisTick} axisLine={{ stroke: "var(--axis)" }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={170} tick={{ ...axisTick, fill: "var(--ink-2)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={pctFmt} contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
                <Bar dataKey="share" name="Gain share" fill="var(--series-1)" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="share" position="right" formatter={pctFmt} style={{ fill: "var(--ink-2)", fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Fairness audit: false-positive rate by segment"
        subtitle="Legitimate transactions flagged, per customer segment (test window). Segment attributes are not model inputs. Flag = max/min > 1.25 and max FPR > 0.5%.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(m.fairness).map(([seg, info]) => {
            const max = Math.max(...Object.values(info.groups).map((g) => g.fpr), 0.0001);
            return (
              <div key={seg} className="rounded-lg border border-line p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{seg.replace("_", " ")}</span>
                  <span className={`text-xs ${info.flag ? "font-semibold text-warning-text" : "text-muted"}`}>
                    {info.flag ? "⚠ review · " : ""}ratio {info.max_min_ratio}
                  </span>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {Object.entries(info.groups).map(([g, v]) => (
                      <tr key={g}>
                        <td className="w-28 py-0.5 text-ink-2">{g}</td>
                        <td className="py-0.5">
                          <div className="h-2 rounded-r bg-series-1" style={{ width: `${(v.fpr / max) * 100}%`, minWidth: 2 }} />
                        </td>
                        <td className="tabular w-16 py-0.5 text-right text-ink">{(v.fpr * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-2">
          Mitigation levers: segment overrides in <code>policy.yaml</code> (e.g. separate thresholds for registered merchants/sellers), merchant-account onboarding,
          and reviewing features that act as proxies. Business figures are estimates on synthetic data: {m.business.assumptions.note}
        </p>
      </Card>
    </div>
  );
}
