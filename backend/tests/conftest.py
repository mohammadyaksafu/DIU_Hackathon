"""Test fixtures: a small, seeded dataset + model trained into a temp dir (about 1 minute, once per session)."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def trained(tmp_path_factory) -> Path:
    from pipelines.run_all import run

    root = tmp_path_factory.mktemp("shurokkha")
    shutil.copytree(BACKEND / "config", root / "config")
    run(root / "data", root / "registry", root / "config", root / "reports", customers=500, days=40, seed=7, verbose=False)
    os.environ.update(
        DATA_DIR=str(root / "data"),
        MODELS_DIR=str(root / "registry"),
        CONFIG_DIR=str(root / "config"),
        DATABASE_URL=f"sqlite:///{(root / 'test.db').as_posix()}",
        LLM_PROVIDER="none",
        SEED_ON_BOOT="true",
        AUTO_BOOTSTRAP="false",
        RATE_LIMIT_PER_MINUTE="0",
        GRAPH_REFRESH_SECONDS="3600",
        ACTIVE_MODEL="",
    )
    from app.api import deps
    from app.core.config import get_settings
    from app.db.database import reset_engine
    from app.services.state import reset_state

    get_settings.cache_clear()
    deps.get_gateway.cache_clear()
    deps.get_retriever.cache_clear()
    reset_engine()
    reset_state()
    return root


@pytest.fixture(scope="session")
def client(trained):
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


def _token(client, user: str) -> dict:
    r = client.post("/api/v1/auth/login", json={"username": user, "password": "demo123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def customer_h(client):
    return _token(client, "customer")


@pytest.fixture(scope="session")
def analyst_h(client):
    return _token(client, "analyst")


@pytest.fixture(scope="session")
def admin_h(client):
    return _token(client, "admin")
