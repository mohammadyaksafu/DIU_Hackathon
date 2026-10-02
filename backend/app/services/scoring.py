"""Hot path: features -> detectors -> policy -> explanation -> persisted decision."""
from __future__ import annotations

import logging
import time
import uuid
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.core.metrics import metrics
from app.db.database import session_scope
from app.db.models import Alert, AuditLog, IdempotencyRecord, ScoredTransaction
from app.detectors.base import ScoringContext
from app.explain.reason_codes import customer_message, select_reasons
from app.features.engine import TX_TYPES
from app.features.registry import build_features
from app.services.state import AppState

logger = logging.getLogger(__name__)
WalletId = Field(min_length=2, max_length=32, pattern=r"^[A-Za-z0-9_\-]+$")


class ScoreRequest(BaseModel):
    tx_id: str | None = Field(default=None, max_length=64, pattern=r"^[A-Za-z0-9_\-]+$")
    type: Literal[tuple(TX_TYPES)] = "send_money"  # type: ignore[valid-type]
    amount: float = Field(gt=0, le=1_000_000)
    sender: str = WalletId
    receiver: str = WalletId
    device_id: str | None = Field(default=None, max_length=64)
    geo_cell: str | None = Field(default=None, max_length=16)
    channel: Literal["app", "ussd", "api"] = "app"
    ts: float | None = Field(default=None, description="Epoch seconds; defaults to the simulation clock")
    memo: str | None = Field(default=None, max_length=280, description="Untrusted free text; never interpreted")


class SecurityEvent(BaseModel):
    wallet: str = WalletId
    event: Literal["sim_swap", "password_reset"]
    ts: float | None = None


def _signal_names(ctx: ScoringContext) -> tuple[dict, set[str]]:
    names = dict(ctx.features)
    for name, sig in ctx.signals.items():
        names[name] = sig.score if sig.ok else 0.0
    rules = ctx.signals.get("rules")
    hits = set(rules.details.get("hits", [])) if rules and rules.ok else set()
    return names, hits


def score_transaction(state: AppState, req: ScoreRequest, actor: str = "system", persist: bool = True,
                      idempotency_key: str | None = None) -> dict:
    started = time.perf_counter()
    key = idempotency_key or (f"tx:{req.tx_id}" if req.tx_id else None)
    if persist and key:
        with session_scope() as db:
            rec = db.get(IdempotencyRecord, key)
            if rec is not None:
                metrics.inc("idempotent_replays_total")
                return {**rec.response, "idempotent_replay": True}

    tx = req.model_dump()
    tx["tx_id"] = req.tx_id or f"L{uuid.uuid4().hex[:15]}"
    tx["ts"] = float(req.ts) if req.ts else state.sim_now()

    with state.lock:
        features = build_features(state.engine, tx, state.graph.snapshot)
    ctx = ScoringContext(tx=tx, features=features)
    state.detectors.run(ctx)
    names, rule_hits = _signal_names(ctx)
    decision = state.policy.decide(names, rule_hits)
    if decision.action != "ALLOW":
        state.detectors.explain(ctx)
    reasons = select_reasons(ctx.features, ctx.signals) if decision.action != "ALLOW" else []
    latency_ms = (time.perf_counter() - started) * 1000

    failed = [n for n, s in ctx.signals.items() if not s.ok]
    degraded_reasons = list(state.degraded) + [f"detector:{n}" for n in failed]
    if latency_ms > state.settings.latency_budget_ms:
        degraded_reasons.append("latency_budget_exceeded")
        metrics.inc("latency_budget_exceeded_total")
    lgbm = ctx.signals.get("lgbm")
    risk = lgbm.score if lgbm and lgbm.ok else max((s.score for s in ctx.signals.values() if s.ok), default=0.0)

    response = {
        "transaction_id": tx["tx_id"],
        "decision": decision.action,
        "risk_score": round(float(risk), 5),
        "signals": [{"detector": s.detector, "score": round(s.score, 5), "ok": s.ok, "reason_codes": s.reason_codes}
                    for s in ctx.signals.values()],
        "reason_codes": reasons,
        "customer_message": customer_message(decision.action, reasons, ctx.features),
        "model_version": state.bundle.version if state.bundle else "rules-only",
        "policy_version": state.policy.version,
        "policy": {"matched": decision.tier_expr, "variables": decision.variables, "overrides": decision.overrides_applied},
        "latency_ms": round(latency_ms, 2),
        "degraded": bool(degraded_reasons),
        "degraded_reasons": degraded_reasons,
        "simulated_ts": tx["ts"],
    }

    metrics.observe_ms("score_latency_ms", latency_ms)
    metrics.inc("decisions_total", decision=decision.action)
    if degraded_reasons:
        metrics.inc("degraded_decisions_total")
    if persist:
        _persist(state, tx, ctx, response, actor, key)
    return response


def _persist(state: AppState, tx: dict, ctx: ScoringContext, response: dict, actor: str, key: str | None) -> None:
    with session_scope() as db:
        alert_id = None
        if response["decision"] in ("WARN", "HOLD"):
            alert = Alert(
                tx_id=tx["tx_id"], tx_ts=tx["ts"], tx_type=tx["type"], sender=tx["sender"], receiver=tx["receiver"],
                amount=float(tx["amount"]), decision=response["decision"], risk_score=response["risk_score"],
                reason_codes=response["reason_codes"],
                signals={n: s.model_dump() for n, s in ctx.signals.items()},
                features={k: v for k, v in ctx.features.items()}, model_version=response["model_version"],
                policy_version=response["policy_version"], source="live",
            )
            db.add(alert)
            db.flush()
            alert_id = alert.id
            response["alert_id"] = alert_id
        stored_tx = {k: tx[k] for k in ("tx_id", "ts", "type", "amount", "sender", "receiver", "device_id", "geo_cell", "channel")}
        db.merge(ScoredTransaction(tx_id=tx["tx_id"], payload=stored_tx, decision=response["decision"],
                                   risk_score=response["risk_score"], alert_id=alert_id, latency_ms=response["latency_ms"]))
        db.add(AuditLog(actor=actor, event="decision", tx_id=tx["tx_id"], alert_id=alert_id,
                        payload={"decision": response["decision"], "risk": response["risk_score"],
                                 "model_version": response["model_version"], "policy_version": response["policy_version"],
                                 "reasons": response["reason_codes"], "degraded": response["degraded_reasons"]}))
        if key:
            db.merge(IdempotencyRecord(key=key, response=response))


def ingest_committed(state: AppState, tx: dict) -> None:
    """A transaction that actually happened becomes history for future features."""
    with state.lock:
        state.engine.update(tx)
        state.graph.add_edge(tx)


def confirm_transaction(state: AppState, tx_id: str, action: Literal["sent", "cancelled"], actor: str) -> dict:
    with session_scope() as db:
        st = db.get(ScoredTransaction, tx_id)
        if st is None:
            raise HTTPException(404, "unknown transaction")
        if st.status != "PENDING":
            return {"transaction_id": tx_id, "status": st.status, "unchanged": True}
        if action == "sent" and st.decision == "HOLD":
            raise HTTPException(409, "transaction is on hold pending analyst review")
        st.status = "SENT" if action == "sent" else "CANCELLED"
        if st.alert_id:
            alert = db.get(Alert, st.alert_id)
            if alert:
                alert.customer_action = action
        db.add(AuditLog(actor=actor, event=f"customer_{action}", tx_id=tx_id, alert_id=st.alert_id,
                        payload={"decision": st.decision}))
        payload, decision = dict(st.payload), st.decision
    if action == "sent":
        ingest_committed(state, payload)
    elif decision in ("WARN", "HOLD"):
        metrics.inc("scams_averted_total")
    metrics.inc("customer_actions_total", action=action, decision=decision)
    return {"transaction_id": tx_id, "status": "SENT" if action == "sent" else "CANCELLED", "decision": decision}


def release_held(state: AppState, alert: Alert) -> bool:
    """Analyst marked a held transaction legitimate: complete it."""
    with session_scope() as db:
        st = db.get(ScoredTransaction, alert.tx_id)
        if st is None or st.status != "PENDING":
            return False
        st.status = "SENT"
        payload = dict(st.payload)
    ingest_committed(state, payload)
    return True


def ingest_event(state: AppState, ev: SecurityEvent, actor: str) -> dict:
    ts = float(ev.ts) if ev.ts else state.sim_now()
    with state.lock:
        state.engine.ingest_event({"wallet": ev.wallet, "event": ev.event, "ts": ts})
    with session_scope() as db:
        db.add(AuditLog(actor=actor, event=f"security_{ev.event}", payload={"wallet": ev.wallet, "ts": ts}))
    return {"wallet": ev.wallet, "event": ev.event, "ts": ts}
