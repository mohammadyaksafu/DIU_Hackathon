"""Deterministic rules detector (config/rules.yaml, hot-reloaded)."""
from __future__ import annotations

import logging
import os

import yaml

from app.detectors.base import DetectorDeps, ScoringContext, Signal
from app.policy.expr import compile_expr, evaluate

logger = logging.getLogger(__name__)


class RulesDetector:
    name = "rules"

    def __init__(self, deps: DetectorDeps, path: str | None = None) -> None:
        self.path = deps.config_dir / (path or "rules.yaml")
        self._mtime: float | None = None
        self.rules: list[dict] = []
        self._reload()

    def _reload(self) -> None:
        mtime = os.path.getmtime(self.path)
        if self._mtime is not None and mtime <= self._mtime:
            return
        try:
            with open(self.path, encoding="utf-8") as fh:
                rules = (yaml.safe_load(fh) or {}).get("rules", [])
            for rule in rules:
                compile_expr(rule["when"])
            self.rules = rules
        except Exception as exc:
            logger.error("rules reload failed; keeping previous rules: %s", exc)
        self._mtime = mtime

    def evaluate_features(self, features: dict) -> list[dict]:
        hits = []
        for rule in self.rules:
            if evaluate(rule["when"], features):
                hits.append(rule)
        return hits

    def score(self, ctx: ScoringContext) -> Signal:
        self._reload()
        hits = self.evaluate_features(ctx.features)
        return Signal(
            detector=self.name,
            score=max((float(h["score"]) for h in hits), default=0.0),
            reason_codes=[h["reason"] for h in hits],
            details={"hits": [h["name"] for h in hits]},
        )
