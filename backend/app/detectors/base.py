"""Detector plugin contract.

Every detector turns a ScoringContext into a Signal. The policy engine combines signals;
detectors never decide the action themselves.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

from pydantic import BaseModel


class Signal(BaseModel):
    detector: str
    score: float  # 0..1, calibrated / normalised
    reason_codes: list[str] = []
    details: dict[str, Any] = {}
    ok: bool = True  # False => detector failed and was skipped (degraded mode)


@dataclass
class ScoringContext:
    tx: dict
    features: dict
    signals: dict[str, Signal] = field(default_factory=dict)


@dataclass
class DetectorDeps:
    bundle: Any  # app.services.model_registry.ModelBundle | None
    config_dir: Path


class Detector(Protocol):
    name: str

    def score(self, ctx: ScoringContext) -> Signal: ...
