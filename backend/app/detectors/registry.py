"""Loads enabled detectors from config/detectors.yaml (plugin registry)."""
from __future__ import annotations

import importlib
import logging
import time
from pathlib import Path

import yaml

from app.core.metrics import metrics
from app.detectors.base import DetectorDeps, ScoringContext, Signal

logger = logging.getLogger(__name__)


def _load_class(path: str):
    module_name, _, cls_name = path.partition(":")
    return getattr(importlib.import_module(module_name), cls_name)


class DetectorRegistry:
    def __init__(self, config_path: Path, deps: DetectorDeps) -> None:
        self.config_path = Path(config_path)
        self.deps = deps
        self.detectors: list = []
        self.load_errors: dict[str, str] = {}
        self.load()

    def load(self) -> None:
        with open(self.config_path, encoding="utf-8") as fh:
            cfg = yaml.safe_load(fh) or {}
        detectors, errors = [], {}
        for entry in cfg.get("detectors", []):
            if not entry.get("enabled", True):
                continue
            try:
                cls = _load_class(entry["class"])
                det = cls(self.deps, **(entry.get("params") or {}))
                det.name = entry["name"]
                detectors.append(det)
            except Exception as exc:  # a broken plugin must not take the service down
                errors[entry["name"]] = str(exc)
                logger.error("detector %s failed to load: %s", entry["name"], exc)
        self.detectors, self.load_errors = detectors, errors

    def get(self, name: str):
        return next((d for d in self.detectors if d.name == name), None)

    def explain(self, ctx: ScoringContext) -> None:
        """Run optional `explain` hooks (e.g. SHAP) after the decision, only when needed."""
        for det in self.detectors:
            sig = ctx.signals.get(det.name)
            if sig is not None and sig.ok and hasattr(det, "explain"):
                try:
                    det.explain(ctx, sig)
                except Exception:
                    logger.exception("explain failed for %s", det.name)

    @property
    def names(self) -> list[str]:
        return [d.name for d in self.detectors]

    def run(self, ctx: ScoringContext) -> dict[str, Signal]:
        for det in self.detectors:
            started = time.perf_counter()
            try:
                sig = det.score(ctx)
            except Exception as exc:
                logger.exception("detector %s failed", det.name)
                metrics.inc("detector_failures_total", detector=det.name)
                sig = Signal(detector=det.name, score=0.0, ok=False, details={"error": str(exc)})
            sig.details["latency_ms"] = round((time.perf_counter() - started) * 1000, 3)
            ctx.signals[det.name] = sig
        return ctx.signals
