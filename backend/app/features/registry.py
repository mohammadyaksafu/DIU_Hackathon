"""Feature registry: one place that assembles the full feature vector.

Extension point (plan section 9.1): to add a feature during the on-site round, write

    @feature("my_new_feature")
    def my_new_feature(f: dict, tx: dict) -> float:
        return ...

It is computed for training and serving alike; retrain to let the model use it.
"""
from __future__ import annotations

from typing import Callable

from app.features.engine import CASH_OUT_LIMIT, STREAM_FEATURES, FeatureEngine
from app.graph.snapshot import GRAPH_FEATURES, graph_features_for

DerivedFn = Callable[[dict, dict], float]
_DERIVED: dict[str, DerivedFn] = {}


def feature(name: str):
    def deco(fn: DerivedFn) -> DerivedFn:
        _DERIVED[name] = fn
        return fn

    return deco


@feature("amount_to_limit")
def _amount_to_limit(f: dict, tx: dict) -> float:
    return round(f["amount"] / CASH_OUT_LIMIT, 4)


@feature("recent_device")
def _recent_device(f: dict, tx: dict) -> float:
    """1 if the phone is new to this wallet, or was first used on it within 24h."""
    return float(f["is_new_device"] == 1 or (f["s_device_age_hrs"] < 24 and f["s_device_count"] >= 2))


@feature("night_new_recipient")
def _night_new_recipient(f: dict, tx: dict) -> float:
    return float(f["is_night"] * f["is_new_recipient"])


@feature("new_device_new_recipient")
def _new_device_new_recipient(f: dict, tx: dict) -> float:
    return float(_recent_device(f, tx) * f["is_new_recipient"])


# Computed (for rules/explanations) but not used as model inputs: raw clock hour is a
# dataset artefact; the model uses the behavioural s_hour_freq / is_night instead.
NON_MODEL_FEATURES = {"hour"}


def all_feature_names() -> list[str]:
    return STREAM_FEATURES + GRAPH_FEATURES + list(_DERIVED)


def model_feature_names() -> list[str]:
    return [f for f in all_feature_names() if f not in NON_MODEL_FEATURES]


def build_features(engine: FeatureEngine, tx: dict, snapshot: dict) -> dict:
    f = engine.compute(tx)
    f.update(graph_features_for(snapshot, tx["sender"], tx["receiver"]))
    for name, fn in _DERIVED.items():
        f[name] = fn(f, tx)
    return f
