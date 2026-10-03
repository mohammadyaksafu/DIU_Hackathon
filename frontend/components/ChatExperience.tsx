"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { api, type Role } from "@/lib/api";

interface ChatSource {
  id: string;
  title: string;
  doc: string;
}

interface ChatReply {
  answer: string;
  citations: string[];
  sources: ChatSource[];
  source: "llm" | "retrieval" | "unavailable";
  provider?: string;
  model?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reply?: ChatReply;
}

const STORAGE_KEY = "shurokkha.ai-chat";
const CHAT_EVENT = "shurokkha-ai-chat-update";
const EXAMPLES = [
  "How can I spot a mobile wallet scam?",
  "Explain how this app decides whether to warn or hold.",
  "What should an analyst do when a SIM swap is detected?",
];

function loadMessages(role: Role): ChatMessage[] {
  try {
    const saved: unknown = JSON.parse(window.sessionStorage.getItem(`${STORAGE_KEY}.${role}`) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (item): item is ChatMessage =>
        item && typeof item === "object" &&
        ((item as ChatMessage).role === "user" || (item as ChatMessage).role === "assistant") &&
        typeof (item as ChatMessage).content === "string",
    ).slice(-40);
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[], role: Role) {
  try {
    window.sessionStorage.setItem(`${STORAGE_KEY}.${role}`, JSON.stringify(messages.slice(-40)));
    window.dispatchEvent(new Event(`${CHAT_EVENT}.${role}`));
  } catch {
    // Keep the current conversation usable when browser storage is unavailable.
  }
}

function sourceLabel(source: ChatReply["source"], provider?: string, model?: string) {
  if (source === "llm") return model ? `${provider || "AI"} · ${model}` : "AI response";
  if (source === "retrieval") return "Procedure reference · AI unavailable";
  return "AI unavailable";
}

export function ChatExperience({ compact = false, onClose, role = "analyst" }: {
  compact?: boolean; onClose?: () => void; role?: Role;
}) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventName = `${CHAT_EVENT}.${role}`;
    const sync = () => setMessages(loadMessages(role));
    sync();
    window.addEventListener(eventName, sync);
    return () => window.removeEventListener(eventName, sync);
  }, [role]);

  async function send(text = draft, event?: FormEvent) {
    event?.preventDefault();
    const message = text.trim();
    if (message.length < 1 || busy) return;

    const before = loadMessages(role);
    const next = [...before, { role: "user" as const, content: message }].slice(-40);
    setMessages(next);
    saveMessages(next, role);
    setDraft("");
    setError(null);
    setBusy(true);

    try {
      const alertMatch = pathname.match(/^\/analyst\/cases\/(\d+)/);
      const reply = await api<ChatReply>("/copilot/chat", {
        role,
        body: {
          message,
          history: before.slice(-12).map(({ role, content }) => ({ role, content })),
          page_context: pathname,
          ...(alertMatch ? { alert_id: Number(alertMatch[1]) } : {}),
        },
      });
      const complete = [...loadMessages(role), { role: "assistant" as const, content: reply.answer, reply }].slice(-40);
      setMessages(complete);
      saveMessages(complete, role);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
    saveMessages([], role);
  }

  return (
    <section className={`flex min-h-0 flex-col overflow-hidden border border-line bg-surface ${compact ? "h-full rounded-xl shadow-2xl" : "h-[min(72vh,48rem)] rounded-2xl shadow-sm"}`}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Shurokkha AI</h2>
          <p className="text-xs text-muted">AI assistant · SOP and page-aware answers</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={clearChat} className="rounded-md px-2 py-1 text-xs text-ink-2 hover:bg-surface-2">New chat</button>
          )}
          {compact && onClose && (
            <button onClick={onClose} aria-label="Close chat" className="rounded-md px-2 py-1 text-lg leading-none text-ink-2 hover:bg-surface-2">×</button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-ink">Ask a question about Shurokkha, fraud safety, or anything else.</p>
              <p className="mt-1 text-xs text-ink-2">Answers about procedures use the approved SOPs. Case pages add the current case as context.</p>
            </div>
            <div className="flex flex-col items-start gap-2">
              {EXAMPLES.map((example) => (
                <button key={example} onClick={() => void send(example)} disabled={busy}
                  className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-xs text-ink-2 hover:border-brand disabled:opacity-50">
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : messages.map((item, index) => (
          <div key={`${index}-${item.role}`} className={`max-w-[92%] rounded-xl px-3 py-2.5 ${item.role === "user" ? "ml-auto bg-brand text-brand-ink" : "mr-auto bg-surface-2 text-ink"}`}>
            <p className="whitespace-pre-wrap text-sm">{item.content}</p>
            {item.reply && (
              <>
                <p className="mt-2 text-[10px] text-muted">{sourceLabel(item.reply.source, item.reply.provider, item.reply.model)}</p>
                {item.reply.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.reply.sources.map((source) => (
                      <span key={source.id} title={source.doc}
                        className={`rounded border px-1.5 py-0.5 text-[10px] ${item.reply?.citations.includes(source.id) ? "border-brand text-brand" : "border-line text-muted"}`}>
                        {source.id} · {source.title}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {busy && <p className="text-xs text-muted" role="status">Gemini is thinking…</p>}
        {error && <p className="rounded-lg bg-critical-soft p-2 text-xs text-critical-text" role="alert">{error}</p>}
      </div>

      <form onSubmit={(event) => void send(draft, event)} className="border-t border-line p-3">
        <label htmlFor={compact ? "floating-chat-message" : "chat-message"} className="sr-only">Message Shurokkha AI</label>
        <div className="flex items-end gap-2">
          <textarea id={compact ? "floating-chat-message" : "chat-message"} value={draft} onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onInputKeyDown} maxLength={2000} rows={2} placeholder="Ask a question…"
            className="max-h-32 min-h-10 flex-1 resize-y rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink placeholder:text-muted" />
          <button type="submit" disabled={busy || draft.trim().length < 1}
            className="min-h-10 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-brand-ink disabled:opacity-50">
            {busy ? "…" : "Send"}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-muted">AI can be wrong. It cannot approve, hold, or release transactions. Avoid entering real personal or financial data.</p>
      </form>

      {!compact && (
        <div className="border-t border-line px-4 py-2 text-center text-xs text-ink-2">
          Need procedure-only answers? <Link href="/copilot" className="text-brand underline">Open SOP Q&amp;A</Link>
        </div>
      )}
    </section>
  );
}
