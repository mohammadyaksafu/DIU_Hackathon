"""One command: generate data -> build features -> train/evaluate/register.

    python -m pipelines.run_all                 # full default dataset (2,000 customers, 90 days)
    python -m pipelines.run_all --fast          # small dataset for tests / CI
    python -m pipelines.run_all --skip-data     # retrain on existing data (e.g. after adding a feature)
"""
from __future__ import annotations

import argparse
from pathlib import Path

from pipelines.build_features import build
from pipelines.generate_data import generate
from pipelines.train import train

BACKEND = Path(__file__).resolve().parents[1]


def run(data_dir: Path, registry_dir: Path, config_dir: Path, reports_dir: Path,
        customers: int = 2000, days: int = 90, seed: int = 42, skip_data: bool = False, verbose: bool = True) -> dict:
    if not skip_data or not (data_dir / "raw" / "transactions.parquet").exists():
        meta = generate(data_dir / "raw", customers, days, seed)
        if verbose:
            print(f"data: {meta['n_transactions']:,} transactions, {meta['n_fraud']:,} fraud ({meta['fraud_rate']:.2%})")
    build(data_dir / "raw", data_dir, verbose=verbose)
    return train(data_dir, registry_dir, config_dir, reports_dir, seed=seed, verbose=verbose)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--customers", type=int, default=2000)
    ap.add_argument("--days", type=int, default=90)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--fast", action="store_true", help="600 customers x 45 days")
    ap.add_argument("--skip-data", action="store_true")
    a = ap.parse_args()
    customers, days = (600, 45) if a.fast else (a.customers, a.days)
    run(BACKEND / "data", BACKEND / "models" / "registry", BACKEND / "config", BACKEND / "reports",
        customers, days, a.seed, a.skip_data)
