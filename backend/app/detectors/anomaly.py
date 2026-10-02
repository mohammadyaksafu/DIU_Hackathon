"""Behavioural anomaly detector (Isolation Forest on per-user deviation features).

Unsupervised, so it can flag *novel* patterns with no labels. Its percentile score is
written back into the feature vector and consumed by the LightGBM model.
"""
from __future__ import annotations

import numpy as np

from app.detectors.base import DetectorDeps, ScoringContext, Signal

ANOMALY_FEATURES = [
    "amount_z",
    "amount_ratio",
    "s_hour_freq",
    "is_new_recipient",
    "is_new_device",
    "s_out_cnt_24h",
    "s_distinct_recv_24h",
    "hrs_since_sim_swap",
    "hrs_since_pwd_reset",
    "geo_changed",
    "s_inflow_ratio_24h",
    "s_mins_since_inflow",
]
_LOG_COLS = {"amount_ratio", "hrs_since_sim_swap", "hrs_since_pwd_reset", "s_mins_since_inflow", "s_inflow_ratio_24h"}


def anomaly_matrix(rows: list[dict] | "object") -> np.ndarray:
    """rows: list of feature dicts, or a pandas DataFrame."""
    if hasattr(rows, "loc"):
        cols = [np.log1p(rows[c].astype(float).clip(lower=0)) if c in _LOG_COLS else rows[c].astype(float) for c in ANOMALY_FEATURES]
        return np.column_stack(cols)
    out = np.empty((len(rows), len(ANOMALY_FEATURES)))
    for i, f in enumerate(rows):
        for j, c in enumerate(ANOMALY_FEATURES):
            v = float(f.get(c, 0.0))
            out[i, j] = np.log1p(max(v, 0.0)) if c in _LOG_COLS else v
    return out


def to_percentile(raw: np.ndarray, quantiles: np.ndarray) -> np.ndarray:
    return np.searchsorted(quantiles, raw, side="right") / len(quantiles)


class CompiledIsolationForest:
    """Single-row scorer equivalent to -IsolationForest.score_samples, about 10x faster.

    sklearn's per-call validation/chunking dominates single-row latency; here each tree is
    flattened to arrays once and walked directly. Verified equal to sklearn in tests.
    """

    def __init__(self, model) -> None:
        from sklearn.ensemble._iforest import _average_path_length

        self.trees = []
        for est, feats in zip(model.estimators_, model.estimators_features_):
            t = est.tree_
            depth = np.zeros(t.node_count)
            for node in range(t.node_count):  # parents always precede children
                for child in (t.children_left[node], t.children_right[node]):
                    if child != -1:
                        depth[child] = depth[node] + 1
            leaf_value = depth + _average_path_length(t.n_node_samples)
            self.trees.append((t.children_left.tolist(), t.children_right.tolist(), t.feature.tolist(),
                               t.threshold.tolist(), leaf_value.tolist(), np.asarray(feats)))
        self.denominator = len(model.estimators_) * float(_average_path_length([model.max_samples_])[0])

    def score_one(self, x: np.ndarray) -> float:
        total = 0.0
        for left, right, feature, threshold, leaf_value, feats in self.trees:
            # sklearn compares float32 inputs against float64 thresholds; mirror that exactly.
            xs = x[feats].astype(np.float32).astype(np.float64).tolist()
            node = 0
            while left[node] != -1:
                node = left[node] if xs[feature[node]] <= threshold[node] else right[node]
            total += leaf_value[node]
        return float(2.0 ** (-total / self.denominator))


class AnomalyDetector:
    name = "anomaly"

    def __init__(self, deps: DetectorDeps) -> None:
        if deps.bundle is None or deps.bundle.anomaly is None:
            raise RuntimeError("no anomaly model in registry")
        self.model = CompiledIsolationForest(deps.bundle.anomaly["model"])
        self.quantiles = deps.bundle.anomaly["quantiles"]

    def score(self, ctx: ScoringContext) -> Signal:
        raw = np.array([self.model.score_one(anomaly_matrix([ctx.features])[0])])
        pct = float(to_percentile(raw, self.quantiles)[0])
        ctx.features["anomaly_score"] = pct
        reasons = ["R_BEHAVIOUR_ANOMALY"] if pct >= 0.995 else []
        return Signal(detector=self.name, score=pct, reason_codes=reasons, details={"raw": float(raw[0])})
