"use client";

import { useEffect, useState } from "react";

import { Button, Card, ErrorBox, Pill, Spinner, useApi } from "@/components/ui";
import { api, health } from "@/lib/api";

interface ModelInfo {
  active: string | null;
  versions: string[];
  thresholds: Record<string, number>;
  detectors: string[];
  detector_errors: Record<string, string>;
  degraded: string[];
  meta: Record<string, unknown> | null;
}

export default function AdminPage() {
  const model = useApi(() => api<ModelInfo>("/admin/model", { role: "analyst" }));
  const policy = useApi(() => api<{ version: number; yaml: string }>("/admin/policy", { role: "analyst" }));
  const flags = useApi(() => api<Record<string, unknown>>("/admin/flags", { role: "analyst" }));
  const ready = useApi(() => health());
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (policy.data) setDraft(policy.data.yaml);
  }, [policy.data]);

  async function act(fn: () => Promise<string>) {
    setBusy(true);
    setMsg(null);
    try {
      setMsg(await fn());
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Admin: adapt without redeploying</h1>
        <p className="text-sm text-ink-2">Edit the decision policy live, switch model versions, refresh the graph. Every change is validated and audited.</p>
      </div>
      {msg && <div className="rounded-lg border border-line bg-surface p-3 text-sm text-ink" role="status">{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Decision policy (policy.yaml)" subtitle={policy.data ? `version ${policy.data.version} · hot-reloaded on save` : undefined} className="lg:col-span-2"
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" disabled={busy} onClick={() => policy.data && setDraft(policy.data.yaml)}>Reset</Button>
              <Button disabled={busy || !draft} onClick={() => act(async () => {
                const r = await api<{ version: number }>("/admin/policy", { role: "admin", method: "PUT", body: { yaml: draft } });
                policy.reload();
                return `Policy saved and live (version ${r.version}).`;
              })}>Validate &amp; save</Button>
            </div>
          }>
          {policy.loading ? <Spinner /> : policy.error ? <ErrorBox error={policy.error} /> : (
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} aria-label="Policy YAML"
              className="h-[28rem] w-full rounded-lg border border-line bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink" />
          )}
          <p className="mt-2 text-xs text-muted">
            Tip for the demo: lower <code>warn_t</code> under a segment override, save, then score the same transfer again in the customer app.
            An invalid expression or action is rejected and the running policy is kept.
          </p>
        </Card>

        <div className="space-y-4">
          <Card title="Model registry">
            {model.loading ? <Spinner /> : model.error ? <ErrorBox error={model.error} /> : model.data && (
              <div className="space-y-3 text-sm">
                <div>Active: <strong className="text-ink">{model.data.active ?? "none (rules-only)"}</strong></div>
                <div className="tabular text-xs text-ink-2">
                  thresholds: warn {model.data.thresholds.warn_t?.toFixed(4)} · hold {model.data.thresholds.hold_t?.toFixed(4)}
                </div>
                <ul className="space-y-1">
                  {model.data.versions.map((v) => (
                    <li key={v} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-ink">{v}</span>
                      {v === model.data!.active ? <Pill tone="brand">active</Pill> : (
                        <Button variant="secondary" disabled={busy} onClick={() => act(async () => {
                          await api("/admin/model/activate", { role: "admin", body: { version: v } });
                          model.reload();
                          return `Activated ${v}.`;
                        })}>Activate</Button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-1">{model.data.detectors.map((d) => <Pill key={d}>{d}</Pill>)}</div>
                {Object.keys(model.data.detector_errors).length > 0 && <ErrorBox error={JSON.stringify(model.data.detector_errors)} />}
              </div>
            )}
          </Card>

          <Card title="Operations">
            <div className="space-y-2 text-sm">
              <div>Health: <strong className="text-ink">{ready.data?.status ?? "…"}</strong> {ready.data?.degraded?.length ? `(degraded: ${ready.data.degraded.join(", ")})` : ""}</div>
              <Button variant="secondary" disabled={busy} onClick={() => act(async () => {
                const r = await api<{ wallets: number }>("/admin/graph/refresh", { role: "admin", method: "POST" });
                return `Graph snapshot rebuilt: ${r.wallets.toLocaleString()} wallets.`;
              })}>Rebuild graph snapshot</Button>
            </div>
          </Card>

          <Card title="Feature flags" subtitle="config/flags.yaml">
            {flags.data ? (
              <ul className="space-y-1 text-xs">
                {Object.entries(flags.data).map(([k, v]) => (
                  <li key={k} className="flex justify-between"><span className="text-ink-2">{k}</span><span className="text-ink">{String(v)}</span></li>
                ))}
              </ul>
            ) : <Spinner />}
          </Card>
        </div>
      </div>
    </div>
  );
}
