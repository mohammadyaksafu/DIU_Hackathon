"""Transaction-graph snapshots for money-mule / ring detection.

A snapshot is computed from a trailing window of edges (default 14 days) and gives
each wallet structural features:
  in_deg        distinct wallets that sent it money
  pr_pct        PageRank percentile (money-flow centrality)
  comm          Louvain community id (customer-to-customer transfer graph)
  comm_size     size of that community
  comm_fanin    distinct *external* senders into the community / community size
  comm_cashout  community cash-out amount / community inflow amount
  fwd_ratio     wallet outflow (send + cash-out) / inflow

Mule rings show up as small, young communities with many external senders and
almost everything cashed out quickly. Snapshots are recomputed periodically (cold path).
"""
from __future__ import annotations

from collections import defaultdict

import networkx as nx

GRAPH_FEATURES = [
    "r_g_in_deg",
    "r_g_pr_pct",
    "r_g_comm_size",
    "r_g_comm_fanin",
    "r_g_comm_cashout",
    "r_g_fwd",
    "s_g_comm_fanin",
    "s_g_comm_cashout",
    "s_g_fwd",
]

GRAPH_EDGE_TYPES = {"send_money", "cash_out", "cash_in", "disbursement"}


def compute_snapshot(edges: list[tuple], seed: int = 42) -> dict[str, dict]:
    """edges: iterable of (ts, src, dst, amount, type). Returns wallet -> metrics."""
    inflow: dict[str, float] = defaultdict(float)
    outflow: dict[str, float] = defaultdict(float)
    cashout: dict[str, float] = defaultdict(float)
    senders: dict[str, set] = defaultdict(set)
    flow = nx.DiGraph()
    p2p = nx.Graph()

    for _, src, dst, amount, ttype in edges:
        if ttype not in GRAPH_EDGE_TYPES:
            continue
        inflow[dst] += amount
        outflow[src] += amount
        if ttype == "cash_out":
            cashout[src] += amount
        if ttype in ("send_money", "disbursement"):
            senders[dst].add(src)
        w = flow.get_edge_data(src, dst, {"weight": 0.0})["weight"]
        flow.add_edge(src, dst, weight=w + amount)
        if ttype == "send_money":
            pw = p2p.get_edge_data(src, dst, {"weight": 0.0})["weight"]
            p2p.add_edge(src, dst, weight=pw + amount)

    if flow.number_of_nodes() == 0:
        return {}

    try:
        pr = nx.pagerank(flow, weight="weight", max_iter=50, tol=1e-4)
    except nx.PowerIterationFailedConvergence:
        pr = {n: 0.0 for n in flow.nodes}
    ranked = sorted(pr, key=pr.get)
    n = max(1, len(ranked) - 1)
    pr_pct = {node: i / n for i, node in enumerate(ranked)}

    comm_of: dict[str, int] = {}
    members: dict[int, list] = {}
    if p2p.number_of_nodes():
        for cid, comm in enumerate(nx.community.louvain_communities(p2p, weight="weight", seed=seed)):
            members[cid] = list(comm)
            for node in comm:
                comm_of[node] = cid

    comm_stats: dict[int, tuple[float, float]] = {}
    for cid, nodes in members.items():
        node_set = set(nodes)
        ext = set()
        for node in nodes:
            ext |= senders.get(node, set()) - node_set
        c_in = sum(inflow[x] for x in nodes)
        c_out = sum(cashout[x] for x in nodes)
        comm_stats[cid] = (len(ext) / len(nodes), (c_out / c_in) if c_in > 0 else 0.0)

    snap: dict[str, dict] = {}
    for node in flow.nodes:
        cid = comm_of.get(node, -1)
        fanin, c_cash = comm_stats.get(cid, (0.0, 0.0))
        snap[node] = {
            "in_deg": len(senders.get(node, ())),
            "pr_pct": round(pr_pct.get(node, 0.0), 4),
            "comm": cid,
            "comm_size": len(members.get(cid, [node])),
            "comm_fanin": round(fanin, 4),
            "comm_cashout": round(min(c_cash, 2.0), 4),
            "fwd_ratio": round(min(outflow[node] / inflow[node], 5.0), 4) if inflow[node] > 0 else 0.0,
        }
    return snap


_EMPTY = {"in_deg": 0, "pr_pct": 0.0, "comm": -1, "comm_size": 0, "comm_fanin": 0.0, "comm_cashout": 0.0, "fwd_ratio": 0.0}


def graph_features_for(snapshot: dict, sender: str, receiver: str) -> dict:
    r = snapshot.get(receiver, _EMPTY)
    s = snapshot.get(sender, _EMPTY)
    return {
        "r_g_in_deg": r["in_deg"],
        "r_g_pr_pct": r["pr_pct"],
        "r_g_comm_size": r["comm_size"],
        "r_g_comm_fanin": r["comm_fanin"],
        "r_g_comm_cashout": r["comm_cashout"],
        "r_g_fwd": r["fwd_ratio"],
        "s_g_comm_fanin": s["comm_fanin"],
        "s_g_comm_cashout": s["comm_cashout"],
        "s_g_fwd": s["fwd_ratio"],
    }
