"""Graph view and impact dashboard metrics."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.api.deps import get_gateway, state_dep
from app.core.cache import get_cache
from app.core.metrics import metrics
from app.core.security import Principal, require_roles
from app.db.database import session_scope
from app.db.models import Alert, ScoredTransaction
from app.services.state import AppState

router = APIRouter(tags=["insights"])


@router.get("/graph/wallet/{wallet_id}")
def wallet_graph(wallet_id: str, hops: int = Query(default=2, ge=1, le=3), state: AppState = Depends(state_dep),
                 p: Principal = Depends(require_roles("analyst"))) -> dict:
    cache = get_cache()
    key = f"graph:{wallet_id}:{hops}:{state.graph.snapshot_built_at}"
    hit = cache.get(key)
    if hit is not None:
        return hit
    result = state.graph.subgraph(wallet_id, hops=hops)
    cache.set(key, result, ttl=60)
    return result


@router.get("/metrics/impact")
def impact(state: AppState = Depends(state_dep), p: Principal = Depends(require_roles("analyst"))) -> dict:
    offline = state.bundle.metrics if state.bundle else {}
    with session_scope() as db:
        by_decision = dict(db.execute(select(ScoredTransaction.decision, func.count()).group_by(ScoredTransaction.decision)).all())
        by_status = dict(db.execute(select(Alert.status, func.count()).group_by(Alert.status)).all())
        labelled = db.execute(select(Alert.decision, Alert.label, func.count()).where(Alert.label.is_not(None))
                              .group_by(Alert.decision, Alert.label)).all()
        cancelled = db.scalar(select(func.count()).select_from(Alert).where(Alert.customer_action == "cancelled")) or 0
        protected = db.scalar(select(func.coalesce(func.sum(Alert.amount), 0)).where(Alert.customer_action == "cancelled")) or 0
        ttd = db.execute(select(Alert.decided_at - Alert.opened_at).where(Alert.decided_at.is_not(None), Alert.opened_at.is_not(None))).scalars().all()
        alerts_total = db.scalar(select(func.count()).select_from(Alert)) or 0

    label_stats: dict = {}
    for decision, label, n in labelled:
        label_stats.setdefault(decision, {})[label] = n
    precision = {}
    for decision, counts in label_stats.items():
        decided = counts.get("fraud", 0) + counts.get("legit", 0)
        precision[decision] = round(counts.get("fraud", 0) / decided, 4) if decided else None
    ttd_sorted = sorted(t for t in ttd if t is not None and t >= 0)

    return {
        "model_version": state.bundle.version if state.bundle else "rules-only",
        "offline": offline,
        "live": {
            "scored_by_decision": by_decision,
            "alerts_total": alerts_total,
            "alerts_by_status": by_status,
            "analyst_labels": label_stats,
            "analyst_confirmed_precision": precision,
            "scams_averted": int(cancelled),
            "amount_protected_bdt": float(protected),
            "median_time_to_decision_s": round(ttd_sorted[len(ttd_sorted) // 2], 1) if ttd_sorted else None,
            "decisions_this_process": metrics.counters_by_label("decisions_total", "decision"),
        },
        "latency_ms": {
            "p50": metrics.percentile("score_latency_ms", 0.50),
            "p95": metrics.percentile("score_latency_ms", 0.95),
            "p99": metrics.percentile("score_latency_ms", 0.99),
        },
        "system": {
            "degraded": state.degraded,
            "llm": get_gateway().status(),
            "cache_backend": get_cache().backend,
            "policy_version": state.policy.version,
            "detectors": state.detectors.names if state.detectors else [],
        },
    }
