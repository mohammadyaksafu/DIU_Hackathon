# Extending Shurokkha on-site (fast paths)

Every change below is small and testable. Commit after each step.

## Add a rule (2 min, no code)
Append to `backend/config/rules.yaml`:
```yaml
  - name: QR_MERCHANT_SCAM
    description: First payment to a merchant that is only a few days old
    when: "type_code == 2 and is_new_recipient == 1 and r_tenure_days < 7 and amount_ratio >= 3"
    score: 0.7
    reason: R_NEW_RECIPIENT
```
It is live on the next request (mtime hot-reload). Available names are every feature in `app/features/engine.py` / `registry.py`. Functions: `min`, `max`, `abs`.

## Change thresholds / tiers (1 min)
Edit `backend/config/policy.yaml` or use **Admin → Decision policy → Validate & save**. Invalid edits are rejected.

## Add a feature (10–20 min)
In `backend/app/features/registry.py`:
```python
@feature("night_cash_out")
def _night_cash_out(f: dict, tx: dict) -> float:
    return float(f["is_night"] and f["type_code"] == 1)
```
Then retrain: `python -m pipelines.run_all --skip-data` (≈2 min) and restart the API (or activate the new version in Admin).

## Add a detector (15–45 min)
1. Create `backend/app/detectors/my_detector.py`:
```python
from app.detectors.base import DetectorDeps, ScoringContext, Signal

class MyDetector:
    name = "my"
    def __init__(self, deps: DetectorDeps): ...
    def score(self, ctx: ScoringContext) -> Signal:
        s = 1.0 if ctx.features["near_limit"] and ctx.features["is_night"] else 0.0
        return Signal(detector=self.name, score=s, reason_codes=["R_STRUCTURING"] if s else [])
```
2. Register it in `backend/config/detectors.yaml`.
3. Use it in a policy tier: `my >= 0.5`.
4. Add a golden test in `backend/tests/test_api.py`.

## Add a reason-code text
Add the key to `backend/app/i18n/messages.yaml` (en + bn) and, if it maps from a model feature, to `FEATURE_REASON` and `CONDITIONS` in `app/explain/reason_codes.py`.

## Add a fraud scenario to the data
Add a block in `Generator.inject_fraud()` (`pipelines/generate_data.py`) with a new `scenario` tag, then `python -m pipelines.run_all`. The per-scenario recall appears automatically on the dashboard.

## Add a demo scenario button
Add an entry to `SCENARIOS` and a branch in `run_scenario()` in `backend/app/api/v1/simulator.py`.
