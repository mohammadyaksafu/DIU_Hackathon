"""Scoring, customer confirmation, security events, batch scoring."""
from __future__ import annotations

import csv
import io
from typing import Literal

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field, ValidationError

from app.api.deps import state_dep
from app.core.security import Principal, require_roles
from app.services.scoring import ScoreRequest, SecurityEvent, confirm_transaction, ingest_event, score_transaction
from app.services.state import AppState

router = APIRouter(tags=["scoring"])
MAX_BATCH = 1000


@router.post("/score")
def score(req: ScoreRequest, idempotency_key: str | None = Header(default=None, max_length=128),
          state: AppState = Depends(state_dep), p: Principal = Depends(require_roles("customer", "analyst"))) -> dict:
    """Score one transaction in real time (idempotent via Idempotency-Key header or tx_id)."""
    return score_transaction(state, req, actor=p.username, idempotency_key=idempotency_key)


class ConfirmRequest(BaseModel):
    action: Literal["sent", "cancelled"]


@router.post("/transactions/{tx_id}/confirm")
def confirm(tx_id: str, body: ConfirmRequest, state: AppState = Depends(state_dep),
            p: Principal = Depends(require_roles("customer"))) -> dict:
    """Customer decision after seeing the result. Only sent transfers become history."""
    return confirm_transaction(state, tx_id, body.action, p.username)


@router.post("/events")
def security_event(ev: SecurityEvent, state: AppState = Depends(state_dep),
                   p: Principal = Depends(require_roles("customer", "analyst"))) -> dict:
    """Ingest SIM-swap / password-reset events (from telco or auth systems)."""
    return ingest_event(state, ev, p.username)


class BatchRequest(BaseModel):
    transactions: list[ScoreRequest] = Field(max_length=MAX_BATCH)


def _batch(state: AppState, items: list[ScoreRequest]) -> dict:
    results = [score_transaction(state, r, persist=False) for r in items]
    slim = [{k: r[k] for k in ("transaction_id", "decision", "risk_score", "reason_codes", "latency_ms")} for r in results]
    counts = {d: sum(1 for r in results if r["decision"] == d) for d in ("ALLOW", "WARN", "HOLD")}
    return {"count": len(results), "decisions": counts, "results": slim}


@router.post("/score/batch")
def score_batch(body: BatchRequest, state: AppState = Depends(state_dep),
                p: Principal = Depends(require_roles("analyst"))) -> dict:
    """Score up to 1,000 transactions without side effects (what-if / back-testing)."""
    return _batch(state, body.transactions)


@router.post("/score/batch/csv")
async def score_batch_csv(file: UploadFile = File(...), state: AppState = Depends(state_dep),
                          p: Principal = Depends(require_roles("analyst"))) -> dict:
    """CSV with columns: type,amount,sender,receiver[,device_id,geo_cell,channel,tx_id]."""
    raw = await file.read(5_000_000)
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    items, errors = [], []
    for i, row in enumerate(reader):
        if len(items) >= MAX_BATCH:
            break
        try:
            items.append(ScoreRequest(**{k: v for k, v in row.items() if v not in (None, "")}))
        except ValidationError as exc:
            errors.append({"row": i + 2, "error": exc.errors()[0]["msg"]})
    if not items:
        raise HTTPException(422, {"message": "no valid rows", "errors": errors[:20]})
    return {**_batch(state, items), "errors": errors[:50]}
