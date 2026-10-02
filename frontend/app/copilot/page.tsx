"use client";

import { FormEvent, useState } from "react";

import { Button, Card, ErrorBox, Pill } from "@/components/ui";
import { api } from "@/lib/api";

interface Answer {
  answer: string;
  citations: string[];
  sources: { id: string; title: string; doc: string }[];
  source: "llm" | "retrieval";
  model?: string;
  fallback_reason?: string;
}

const EXAMPLES = [
  "How do I handle a SIM-swap account takeover?",
  "When should I release a held transfer?",
  "How do I tell an online seller from a mule account?",
  "What counts as structuring?",
];

export default function CopilotPage() {
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<{ q: string; a: Answer }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string, ev?: FormEvent) {
    ev?.preventDefault();
    if (question.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const a = await api<Answer>("/copilot/ask", { role: "analyst", body: { question } });
      setHistory((h) => [{ q: question, a }, ...h]);
      setQ("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">SOP copilot</h1>
        <p className="text-sm text-ink-2">Answers come only from the approved procedure documents (retrieval-augmented). Each answer cites its sources.</p>
      </div>
      <form onSubmit={(e) => ask(q, e)} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} placeholder="Ask about a procedure…"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm" aria-label="Question" />
        <Button type="submit" disabled={busy || q.trim().length < 3}>{busy ? "…" : "Ask"}</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button key={e} onClick={() => ask(e)} disabled={busy} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2 hover:border-brand">
            {e}
          </button>
        ))}
      </div>
      {error && <ErrorBox error={error} />}
      {history.map(({ q, a }, i) => (
        <Card key={i} title={q} actions={<Pill tone="brand">{a.source === "llm" ? `AI · ${a.model}` : "Retrieved passage (AI unavailable)"}</Pill>}>
          <p className="whitespace-pre-line text-sm text-ink">{a.answer}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {a.sources.map((s) => (
              <span key={s.id} className={`rounded-md border px-2 py-0.5 text-xs ${a.citations.includes(s.id) ? "border-brand text-brand" : "border-line text-muted"}`}>
                {s.id} · {s.title}
              </span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
