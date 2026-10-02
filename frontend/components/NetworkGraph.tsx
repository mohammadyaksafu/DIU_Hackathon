"use client";

import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import { useMemo, useState } from "react";

import type { WalletGraph } from "@/lib/types";

type N = SimulationNodeDatum & { id: string; kind: string; focus: boolean; community: number; in_deg: number; comm_fanin: number; fwd_ratio: number };
type L = SimulationLinkDatum<N> & { count: number; amount: number; type: string };

const W = 640;
const H = 420;

/** Force-directed money-flow neighbourhood. Shape encodes wallet kind; the focus wallet is ringed.
 *  The focus wallet's community is highlighted so a mule ring reads as one cluster. */
export function NetworkGraph({ graph }: { graph: WalletGraph }) {
  const [hover, setHover] = useState<N | null>(null);

  const { nodes, links, focusCommunity } = useMemo(() => {
    const nodes: N[] = graph.nodes.map((n) => ({ ...n }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: L[] = graph.edges
      .filter((e) => byId.has(e.source) && byId.has(e.target))
      .map((e) => ({ ...e, source: byId.get(e.source)!, target: byId.get(e.target)! }));
    const sim = forceSimulation(nodes)
      .force("link", forceLink<N, L>(links).distance(55).strength(0.6))
      .force("charge", forceManyBody().strength(-140))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide(14))
      .stop();
    for (let i = 0; i < 250; i++) sim.tick();
    for (const n of nodes) {
      n.x = Math.max(16, Math.min(W - 16, n.x ?? W / 2));
      n.y = Math.max(16, Math.min(H - 16, n.y ?? H / 2));
    }
    const focus = nodes.find((n) => n.focus);
    return { nodes, links, focusCommunity: focus && focus.community >= 0 ? focus.community : null };
  }, [graph]);

  if (!nodes.length) return <p className="text-sm text-muted">No transfers for this wallet in the last 14 days.</p>;
  const maxAmt = Math.max(...links.map((l) => l.amount), 1);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-lg bg-surface-2" role="img"
        aria-label={`Money-flow network around ${graph.wallet}: ${nodes.length} wallets, ${links.length} links`}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--axis)" />
          </marker>
        </defs>
        {links.map((l, i) => {
          const s = l.source as N;
          const t = l.target as N;
          const inRing = focusCommunity != null && s.community === focusCommunity && t.community === focusCommunity;
          return (
            <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} markerEnd="url(#arrow)"
              stroke={l.type === "cash_out" ? "var(--series-2)" : inRing ? "var(--series-1)" : "var(--axis)"}
              strokeOpacity={0.85} strokeWidth={1 + 2.5 * Math.sqrt(l.amount / maxAmt)} />
          );
        })}
        {nodes.map((n) => {
          const inRing = focusCommunity != null && n.community === focusCommunity;
          const fill = n.kind === "agent" ? "var(--series-2)" : inRing ? "var(--series-1)" : "var(--surface)";
          const stroke = n.kind === "agent" ? "var(--series-2)" : inRing ? "var(--series-1)" : "var(--ink-2)";
          return (
            <g key={n.id} transform={`translate(${n.x},${n.y})`} onPointerEnter={() => setHover(n)} onPointerLeave={() => setHover(null)}
              tabIndex={0} onFocus={() => setHover(n)} onBlur={() => setHover(null)} className="cursor-pointer outline-none">
              <circle r={14} fill="transparent" />
              {n.kind === "agent" || n.kind === "merchant" ? (
                <rect x={-6} y={-6} width={12} height={12} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} />
              ) : (
                <circle r={n.focus ? 8 : 6} fill={fill} stroke={stroke} strokeWidth={1.5} />
              )}
              {n.focus && <circle r={12} fill="none" stroke="var(--ink)" strokeWidth={2} />}
              {n.focus && <text y={-16} textAnchor="middle" className="fill-ink text-[11px] font-semibold">{n.id}</text>}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-sm">
          <div className="font-semibold text-ink">{hover.id}</div>
          <div className="text-ink-2">{hover.kind}{hover.community >= 0 ? ` · community ${hover.community}` : ""}</div>
          <div className="tabular text-ink-2">senders (14d): <span className="text-ink">{hover.in_deg}</span></div>
          <div className="tabular text-ink-2">forward ratio: <span className="text-ink">{hover.fwd_ratio.toFixed(2)}</span></div>
          <div className="tabular text-ink-2">community fan-in: <span className="text-ink">{hover.comm_fanin.toFixed(2)}</span></div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-series-1" />Same community as focus wallet</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full border border-ink-2" />Other customer wallet</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-series-2" />Agent (cash-out point)</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-series-2" />Cash-out</span>
      </div>
    </div>
  );
}
