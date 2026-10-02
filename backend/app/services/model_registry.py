"""Versioned model registry on disk: models/registry/<version>/...

Each version holds: model.txt (LightGBM), calibrator.joblib (isotonic),
anomaly.joblib (IsolationForest + score quantiles), features.json, metrics.json, meta.json.
`ACTIVE` names the version served by default; ACTIVE_MODEL env or the admin API override it.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

import joblib
import lightgbm as lgb
import numpy as np

logger = logging.getLogger(__name__)


class PlattCalibrator:
    """Sigmoid calibration on the model's log-odds. Monotonic, so ranking (PR-AUC) is preserved."""

    def __init__(self) -> None:
        self.a = 1.0
        self.b = 0.0

    @staticmethod
    def _logit(p: np.ndarray) -> np.ndarray:
        p = np.clip(np.asarray(p, dtype=float), 1e-7, 1 - 1e-7)
        return np.log(p / (1 - p))

    def fit(self, raw: np.ndarray, y: np.ndarray) -> "PlattCalibrator":
        from sklearn.linear_model import LogisticRegression

        lr = LogisticRegression(C=1e4, max_iter=1000).fit(self._logit(raw).reshape(-1, 1), y)
        self.a, self.b = float(lr.coef_[0][0]), float(lr.intercept_[0])
        return self

    def predict(self, raw: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-(self.a * self._logit(raw) + self.b)))


@dataclass
class ModelBundle:
    version: str
    path: Path
    booster: lgb.Booster | None
    calibrator: object | None
    anomaly: dict | None
    features: list[str]
    meta: dict = field(default_factory=dict)
    metrics: dict = field(default_factory=dict)

    def calibrate(self, raw: np.ndarray) -> np.ndarray:
        if self.calibrator is None:
            return raw
        return np.clip(self.calibrator.predict(raw), 0.0, 1.0)

    @property
    def thresholds(self) -> dict:
        return self.meta.get("thresholds", {})


def list_versions(registry_dir: Path) -> list[str]:
    if not registry_dir.exists():
        return []
    return sorted(p.name for p in registry_dir.iterdir() if p.is_dir() and (p / "meta.json").exists())


def active_version(registry_dir: Path, override: str = "") -> str | None:
    if override:
        return override
    marker = registry_dir / "ACTIVE"
    if marker.exists():
        return marker.read_text(encoding="utf-8").strip() or None
    versions = list_versions(registry_dir)
    return versions[-1] if versions else None


def set_active(registry_dir: Path, version: str) -> None:
    if version not in list_versions(registry_dir):
        raise ValueError(f"unknown model version {version}")
    (registry_dir / "ACTIVE").write_text(version, encoding="utf-8")


def load_bundle(registry_dir: Path, version: str) -> ModelBundle:
    path = registry_dir / version
    meta = json.loads((path / "meta.json").read_text(encoding="utf-8"))
    features = json.loads((path / "features.json").read_text(encoding="utf-8"))
    metrics_path = path / "metrics.json"
    metrics = json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.exists() else {}
    booster = lgb.Booster(model_file=str(path / "model.txt"))
    calibrator = joblib.load(path / "calibrator.joblib") if (path / "calibrator.joblib").exists() else None
    anomaly = joblib.load(path / "anomaly.joblib") if (path / "anomaly.joblib").exists() else None
    logger.info("model bundle loaded", extra={"extra_fields": {"version": version}})
    return ModelBundle(version, path, booster, calibrator, anomaly, features, meta, metrics)
