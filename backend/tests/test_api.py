"""API, golden-scenario, fallback and model-quality-gate tests against a freshly trained small model."""
from __future__ import annotations

import json

import pytest


def _customer(client, customer_h, persona):
    custs = client.get("/api/v1/simulator/customers", headers=customer_h).json()
    return next(c for c in custs if c["persona"] == persona)


def _run(client, customer_h, cid, scenario):
    r = client.post("/api/v1/simulator/scenarios/run", headers=customer_h, json={"customer_id": cid, "scenario": scenario})
    assert r.status_code == 200, r.text
    s = client.post("/api/v1/score", headers=customer_h, json=r.json()["transaction"])
    assert s.status_code == 200, s.text
    return s.json()


# ------------------------------------------------------------------- health/auth
def test_health(client):
    r = client.get("/health/ready")
    assert r.status_code == 200
    body = r.json()
    assert body["checks"]["database"] == "ok"
    assert set(body["checks"]["detectors"]) == {"rules", "anomaly", "lgbm", "graph"}


def test_auth_and_roles(client, customer_h, analyst_h):
    assert client.get("/api/v1/alerts").status_code == 401
    assert client.get("/api/v1/alerts", headers=customer_h).status_code == 403
    assert client.get("/api/v1/alerts", headers=analyst_h).status_code == 200
    assert client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrong"}).status_code == 401


def test_input_validation(client, customer_h):
    bad = {"type": "send_money", "amount": -5, "sender": "C1", "receiver": "C2"}
    assert client.post("/api/v1/score", headers=customer_h, json=bad).status_code == 422
    bad = {"type": "teleport", "amount": 5, "sender": "C1", "receiver": "C2"}
    assert client.post("/api/v1/score", headers=customer_h, json=bad).status_code == 422
    bad = {"type": "send_money", "amount": 5, "sender": "C1;DROP TABLE", "receiver": "C2"}
    assert client.post("/api/v1/score", headers=customer_h, json=bad).status_code == 422


# ------------------------------------------------------------- golden scenarios
@pytest.mark.parametrize("scenario", ["normal_contact", "merchant_payment"])
def test_golden_normal_is_allowed(client, customer_h, scenario):
    c = _customer(client, customer_h, "professional")
    res = _run(client, customer_h, c["id"], scenario)
    assert res["decision"] == "ALLOW", res
    assert res["latency_ms"] < 500


@pytest.mark.parametrize("scenario,persona", [
    ("prize_scam", "remittance_receiver"),
    ("refund_scam", "garments_worker"),
    ("account_takeover", "student"),
    ("structuring", "shopkeeper"),
])
def test_golden_fraud_is_intercepted(client, customer_h, scenario, persona):
    c = _customer(client, customer_h, persona)
    res = _run(client, customer_h, c["id"], scenario)
    assert res["decision"] in ("WARN", "HOLD"), res
    assert res["reason_codes"], "a flagged decision must carry reasons"
    msg = res["customer_message"]
    assert msg["bn"]["reasons"] and msg["en"]["reasons"]


def test_ato_is_held_with_ato_reason(client, customer_h):
    c = _customer(client, customer_h, "freelancer")
    res = _run(client, customer_h, c["id"], "account_takeover")
    assert res["decision"] == "HOLD"
    assert "R_ATO_COMBO" in res["reason_codes"]


# ------------------------------------------------------ customer & analyst flow
def test_hold_cannot_be_sent_and_feedback_releases(client, customer_h, analyst_h):
    c = _customer(client, customer_h, "student")
    res = _run(client, customer_h, c["id"], "account_takeover")
    assert res["decision"] == "HOLD"
    tx = res["transaction_id"]
    assert client.post(f"/api/v1/transactions/{tx}/confirm", headers=customer_h, json={"action": "sent"}).status_code == 409
    fb = client.post(f"/api/v1/cases/{res['alert_id']}/feedback", headers=analyst_h, json={"label": "legit"}).json()
    assert fb["status"] == "RESOLVED" and fb["released"] is True


def test_cancel_counts_as_scam_averted(client, customer_h, analyst_h):
    before = client.get("/api/v1/metrics/impact", headers=analyst_h).json()["live"]["scams_averted"]
    c = _customer(client, customer_h, "remittance_receiver")
    res = _run(client, customer_h, c["id"], "prize_scam")
    r = client.post(f"/api/v1/transactions/{res['transaction_id']}/confirm", headers=customer_h, json={"action": "cancelled"})
    assert r.json()["status"] == "CANCELLED"
    after = client.get("/api/v1/metrics/impact", headers=analyst_h).json()["live"]["scams_averted"]
    assert after == before + 1


def test_idempotency(client, customer_h):
    body = {"tx_id": "IDEMPOTENT-1", "type": "payment", "amount": 300, "sender": "C00001", "receiver": "M0001"}
    a = client.post("/api/v1/score", headers=customer_h, json=body).json()
    b = client.post("/api/v1/score", headers=customer_h, json=body).json()
    assert b.get("idempotent_replay") is True and a["decision"] == b["decision"]


def test_analyst_case_flow(client, analyst_h):
    items = client.get("/api/v1/alerts?status=OPEN&size=5", headers=analyst_h).json()["items"]
    assert items, "seeded alerts expected"
    aid = items[0]["id"]
    case = client.get(f"/api/v1/cases/{aid}", headers=analyst_h).json()
    assert case["reasons"] and case["signals"]
    summary = client.post(f"/api/v1/copilot/case-summary/{aid}", headers=analyst_h).json()
    assert summary["source"] == "template"  # LLM_PROVIDER=none => deterministic fallback
    assert summary["what_happened"] and summary["recommended_actions"]
    graph = client.get(f"/api/v1/graph/wallet/{case['receiver']}", headers=analyst_h).json()
    assert any(n["focus"] for n in graph["nodes"])
    ans = client.post("/api/v1/copilot/ask", headers=analyst_h, json={"question": "how to release a hold?"}).json()
    assert ans["citations"]


def test_batch_csv(client, analyst_h):
    csv = "type,amount,sender,receiver\nsend_money,1000,C00002,C00003\npayment,abc,C00002,M0001\n"
    r = client.post("/api/v1/score/batch/csv", headers=analyst_h, files={"file": ("tx.csv", csv, "text/csv")})
    assert r.status_code == 200
    assert r.json()["count"] == 1 and r.json()["errors"]


# ------------------------------------------------------------- adaptability
def test_policy_put_validates_and_hot_reloads(client, admin_h, analyst_h):
    current = client.get("/api/v1/admin/policy", headers=analyst_h).json()
    bad = client.put("/api/v1/admin/policy", headers=admin_h, json={"yaml": "version: 99\ntiers:\n  - {action: NOPE, when: 'true'}\n"})
    assert bad.status_code == 422
    new_yaml = current["yaml"].replace(f"version: {current['version']}", f"version: {current['version'] + 1}")
    ok = client.put("/api/v1/admin/policy", headers=admin_h, json={"yaml": new_yaml})
    assert ok.status_code == 200 and ok.json()["version"] == current["version"] + 1
    assert client.put("/api/v1/admin/policy", headers=analyst_h, json={"yaml": new_yaml}).status_code == 403


# ---------------------------------------------------------------- fallbacks
def test_rules_only_mode_when_model_missing(trained):
    """If the ML model cannot load, scoring still works (rules + graph) and is flagged degraded."""
    from app.core.config import get_settings
    from app.detectors.base import DetectorDeps
    from app.detectors.registry import DetectorRegistry
    from app.services.scoring import ScoreRequest, score_transaction
    from app.services.state import get_state

    state = get_state()
    saved_bundle, saved_detectors, saved_degraded = state.bundle, state.detectors, list(state.degraded)
    try:
        state.bundle = None
        state.detectors = DetectorRegistry(get_settings().config_dir / "detectors.yaml", DetectorDeps(None, get_settings().config_dir))
        state.degraded = ["model"]
        assert set(state.detectors.load_errors) == {"anomaly", "lgbm"}
        res = score_transaction(state, ScoreRequest(type="send_money", amount=800, sender="C00004", receiver="C00005"), persist=False)
        assert res["degraded"] and res["model_version"] == "rules-only" and res["decision"] in ("ALLOW", "WARN", "HOLD")
    finally:
        state.bundle, state.detectors, state.degraded = saved_bundle, saved_detectors, saved_degraded


def test_llm_gateway_circuit_breaker_opens():
    from app.core.config import Settings
    from app.genai.llm_gateway import LLMGateway, LLMUnavailable

    gw = LLMGateway(Settings(llm_provider="anthropic", anthropic_api_key="test"))

    def boom(*a, **k):
        raise RuntimeError("provider down")

    gw._call_anthropic = boom
    for _ in range(3):
        with pytest.raises(LLMUnavailable):
            gw.generate_json("s", "u", {"type": "object"})
    assert gw.breaker.state == "open"
    with pytest.raises(LLMUnavailable, match="circuit open"):
        gw.generate_json("s", "u", {"type": "object"})


def test_copilot_uses_llm_output_when_grounded_and_rejects_hallucination():
    from app.genai.copilot import Copilot

    evidence = {"alert": {"alert_id": 1, "decision": "WARN", "risk_score": 0.8, "transaction_type": "send_money",
                          "amount_bdt": 2000, "sender": "C1", "receiver": "C2", "time_dhaka": "x"},
                "reasons": [{"code": "R_NEW_RECIPIENT", "text": "new"}], "key_facts": {"recipient_new_senders_24h": 37},
                "sop_excerpts": [{"id": "SOP-02#1"}]}

    class FakeGateway:
        model = "fake"
        provider = "fake"

        def __init__(self, payload):
            self.payload = payload

        def generate_json(self, *a, **k):
            return self.payload

    good = {"summary": "2000 BDT to a wallet with 37 new senders", "what_happened": "w", "why_risky": [],
            "recommended_actions": ["see SOP-02"], "citations": ["R_NEW_RECIPIENT"]}
    assert Copilot(FakeGateway(good), None).case_summary(evidence)["source"] == "llm"
    bad = dict(good, summary="Customer lost 90,000 BDT")
    out = Copilot(FakeGateway(bad), None).case_summary(evidence)
    assert out["source"] == "template" and "ungrounded" in out["fallback_reason"]


# ---------------------------------------------------------- model quality gate
def test_model_quality_gate(trained):
    """CI gate: the ML model must clearly beat the rules baseline and catch every scenario family."""
    metrics = json.loads((trained / "reports" / "metrics.json").read_text())
    lift = metrics["lift_table"]
    assert lift["lightgbm_full"]["pr_auc"] >= lift["rules_only"]["pr_auc"] + 0.3
    assert metrics["system"]["false_positive_rate"] < 0.02
    # The S3 *bait* (stranger -> victim, small) is supporting context, not a loss event;
    # the victim's 'refund' (S3_refund_scam) is what must be intercepted.
    for scen, m in metrics["per_scenario"].items():
        if m["n"] >= 10 and scen != "S3_refund_bait":
            assert m["recall_flagged"] >= 0.5, (scen, m)
