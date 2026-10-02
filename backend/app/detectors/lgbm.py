"""Supervised risk detector: LightGBM + Platt calibration + per-prediction SHAP values.

LightGBM's `pred_contrib=True` returns exact TreeSHAP contributions (log-odds space),
so explanations need no extra dependency and cost about 1 ms.
"""
from __future__ import annotations

import numpy as np

from app.detectors.base import DetectorDeps, ScoringContext, Signal


class LightGBMDetector:
    name = "lgbm"

    def __init__(self, deps: DetectorDeps) -> None:
        if deps.bundle is None or deps.bundle.booster is None:
            raise RuntimeError("no LightGBM model in registry")
        self.bundle = deps.bundle

    def vector(self, features: dict) -> np.ndarray:
        return np.array([[float(features.get(f, np.nan)) for f in self.bundle.features]], dtype=float)

    def score(self, ctx: ScoringContext) -> Signal:
        # num_threads=1: OpenMP start-up dominates single-row latency.
        raw_p = float(self.bundle.booster.predict(self.vector(ctx.features), num_threads=1)[0])
        p = float(self.bundle.calibrate(np.array([raw_p]))[0])
        return Signal(detector=self.name, score=round(p, 5), details={"raw_probability": round(raw_p, 5)})

    def explain(self, ctx: ScoringContext, signal: Signal) -> None:
        """TreeSHAP contributions; computed only for flagged transactions (lazy, saves ~half the cost)."""
        contrib = self.bundle.booster.predict(self.vector(ctx.features), pred_contrib=True, num_threads=1)[0]
        contributions = sorted(
            ({"feature": f, "value": ctx.features.get(f), "contribution": round(float(c), 4)}
             for f, c in zip(self.bundle.features, contrib[:-1])),
            key=lambda d: -abs(d["contribution"]),
        )
        signal.details.update(contributions=contributions[:10], base_value=float(contrib[-1]))
