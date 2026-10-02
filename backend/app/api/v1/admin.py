"""Admin: model registry, live policy editing (validated + hot reload), flags, detectors."""
from __future__ import annotations

import os
import tempfile

import yaml
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import state_dep
from app.core.security import Principal, require_roles
from app.db.database import session_scope
from app.db.models import AuditLog
from app.policy.engine import PolicyEngine
from app.services import model_registry
from app.services.state import AppState

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/model")
def model_info(state: AppState = Depends(state_dep), p: Principal = Depends(require_roles("analyst"))) -> dict:
    s = state.settings
    return {
        "active": state.bundle.version if state.bundle else None,
        "meta": state.bundle.meta if state.bundle else None,
        "versions": model_registry.list_versions(s.models_dir),
        "thresholds": state.policy.model_thresholds,
        "detectors": state.detectors.names if state.detectors else [],
        "detector_errors": state.detectors.load_errors if state.detectors else {},
        "degraded": state.degraded,
    }


class Activate(BaseModel):
    version: str


@router.post("/model/activate")
def activate(body: Activate, state: AppState = Depends(state_dep), p: Principal = Depends(require_roles("admin"))) -> dict:
    try:
        model_registry.set_active(state.settings.models_dir, body.version)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    state.load_model(body.version)
    with session_scope() as db:
        db.add(AuditLog(actor=p.username, event="model_activated", payload={"version": body.version}))
    return {"active": state.bundle.version if state.bundle else None, "degraded": state.degraded}


@router.get("/policy")
def get_policy(state: AppState = Depends(state_dep), p: Principal = Depends(require_roles("analyst"))) -> dict:
    path = state.policy.path
    return {"version": state.policy.version, "yaml": path.read_text(encoding="utf-8"), "parsed": state.policy.config,
            "model_thresholds": state.policy.model_thresholds}


class PolicyUpdate(BaseModel):
    yaml: str = Field(max_length=20_000)


@router.put("/policy")
def put_policy(body: PolicyUpdate, state: AppState = Depends(state_dep), p: Principal = Depends(require_roles("admin"))) -> dict:
    """Validate a new policy in isolation, then atomically replace the file and hot-reload."""
    tmp_name = None
    try:
        yaml.safe_load(body.yaml)
        with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as tmp:
            tmp.write(body.yaml)
            tmp_name = tmp.name
        PolicyEngine(tmp_name)  # raises on invalid tiers/expressions
    except Exception as exc:
        raise HTTPException(422, f"invalid policy: {exc}") from exc
    finally:
        if tmp_name:
            os.unlink(tmp_name)
    target = state.policy.path
    staging = target.with_suffix(".yaml.tmp")
    staging.write_text(body.yaml, encoding="utf-8")
    os.replace(staging, target)
    state.policy.load()
    with session_scope() as db:
        db.add(AuditLog(actor=p.username, event="policy_updated", payload={"version": state.policy.version}))
    return {"version": state.policy.version, "status": "reloaded"}


@router.post("/policy/reload")
def reload_policy(state: AppState = Depends(state_dep), p: Principal = Depends(require_roles("admin"))) -> dict:
    try:
        state.policy.load()
        state.detectors.load()
    except Exception as exc:
        raise HTTPException(422, f"reload failed, previous policy kept: {exc}") from exc
    return {"version": state.policy.version, "detectors": state.detectors.names}


@router.get("/flags")
def flags(state: AppState = Depends(state_dep)) -> dict:
    with open(state.settings.config_dir / "flags.yaml", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


@router.post("/graph/refresh")
def refresh_graph(state: AppState = Depends(state_dep), p: Principal = Depends(require_roles("admin"))) -> dict:
    snap = state.graph.refresh()
    return {"wallets": len(snap), "built_at": state.graph.snapshot_built_at}
