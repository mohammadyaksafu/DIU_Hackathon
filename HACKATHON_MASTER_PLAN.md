# AI DEV FEST 2026 — AI Hackathon (DIU CPC × upay)
# Master Plan & Winning Solution Blueprint

> **Sources studied:**
> 1. `AI_DEV_FEST_2026_AI_Hackathon_Rulebook.pdf` (the official rules)
> 2. `AI_Hackathon_2026_DIU_CPC_x_upay_Student_Guideline_Official_docx.pdf` (upay's project guideline and innovation playbook)
>
> **Goal of this document:** one place that holds every rule, every deliverable, the recommended solution, its architecture (**adaptable, scalable, reliable, fast**), a 72-hour plan, an on-site playbook and judging prep.

---

## Table of Contents

0. [TL;DR: The Plan on One Page](#0-tldr--the-plan-on-one-page)
1. [Rules Digest (What We MUST Do)](#1-rules-digest-what-we-must-do)
2. [How We Get Scored, and How to Maximize Every Mark](#2-how-we-get-scored--and-how-to-maximize-every-mark)
3. [Track Analysis & Solution Choice](#3-track-analysis--solution-choice)
4. [The Solution: Shurokkha (সুরক্ষা)](#4-the-solution-shurokkha-সুরক্ষা)
5. [System Architecture](#5-system-architecture)
6. [Data Strategy (Synthetic, Privacy-Safe)](#6-data-strategy-synthetic-privacy-safe)
7. [AI/ML Design](#7-aiml-design)
8. [GenAI Layer (Grounded, Guard-railed)](#8-genai-layer-grounded-guard-railed)
9. [Adaptability: Built for the On-Site Twist](#9-adaptability--built-for-the-on-site-twist)
10. [Scalability](#10-scalability)
11. [Reliability & Graceful Degradation](#11-reliability--graceful-degradation)
12. [Performance Targets & How We Hit Them](#12-performance-targets--how-we-hit-them)
13. [Security & Responsible AI](#13-security--responsible-ai)
14. [Tech Stack](#14-tech-stack)
15. [Repository Structure](#15-repository-structure)
16. [API Contract](#16-api-contract)
17. [Testing & Quality Gates](#17-testing--quality-gates)
18. [Deployment](#18-deployment)
19. [Team Roles](#19-team-roles-3-members)
20. [72-Hour Execution Plan](#20-72-hour-execution-plan)
21. [Git & Commit Discipline](#21-git--commit-discipline)
22. [Deliverables: README, Report, Video](#22-deliverables--readme-report-video)
23. [On-Site Final-Day Playbook](#23-on-site-final-day-playbook)
24. [Judge Q&A Preparation](#24-judge-qa-preparation)
25. [Risk Register](#25-risk-register)
26. [Plan B: If the T+0 Brief Points Elsewhere](#26-plan-b--if-the-t0-brief-points-elsewhere)
27. [Master Checklists](#27-master-checklists)

---

## 0. TL;DR: The Plan on One Page

| Item | Decision |
|---|---|
| **Product** | **Shurokkha (সুরক্ষা = "protection")**: an AI trust and financial-safety copilot for upay |
| **Primary track** | Track 01: Trust & Risk Intelligence, with Track 03 (customer empowerment / inclusive UX) built into the customer experience |
| **Core idea** | Score every transfer in real time (< 100 ms). Catch account takeover, scams and money-mule rings. **Warn the customer in plain Bangla before money leaves.** Give analysts an evidence-grounded AI investigation copilot. |
| **The "Good Project Test"** | **What happened?** (signals) → **Why is it risky?** (SHAP reason codes + graph evidence) → **What should upay do next?** (policy action: allow / warn / hold-for-human) |
| **AI depth** | LightGBM (supervised) + Isolation Forest (behavioural anomaly) + graph ML (mule rings) + SHAP (explainability) + LLM with RAG (grounded narratives, Bangla) |
| **Architecture pillars** | Plugin **detectors** + YAML **policy engine** + **feature registry** + **model registry** + **LLM gateway with fallbacks**, so new on-site requirements become new modules rather than rewrites |
| **Stack** | Python · FastAPI · LightGBM · scikit-learn · NetworkX · SHAP · PostgreSQL · Redis · Next.js · Docker · GitHub Actions |
| **Deploy** | Backend on Render/Railway (Docker), frontend on Vercel, DB on Neon/Supabase, Redis on Upstash. **First deploy at hour 24, not hour 70.** |
| **Biggest risks** | Scope creep, a late deploy, a missing commit history, an LLM outage during the demo. All four have mitigations below. |

> ⚠️ **Integrity rule (Rulebook 4.3 / 9.3):** this document is a *plan*. **Do not write challenge-specific code before T+0.** Before T+0 you may prepare only **general-purpose** components (repo template, CI config, Docker boilerplate, a generic LLM adapter, UI kit) and you must disclose them if asked. Everything challenge-specific is built and committed between T+0 and T+72.

---

## 1. Rules Digest (What We MUST Do)

### 1.1 Format & schedule
| Stage | Timing | What happens |
|---|---|---|
| Requirements published | **T+0** | Problem/theme released (exact time announced separately) |
| Initial development | **T+0 → T+72 h** | Ideate, build, test, prepare submission |
| Initial submission | **By T+72 h** | Video demo, project report, public GitHub link, project materials. **Code pushed within this period.** |
| First evaluation | After submission, before the final | Pre-evaluation of project, video, report and materials (**counts toward the final score**) |
| On-site final | **7 October 2026, Daffodil International University** | New requirements/updates given **based on our pre-evaluation**, implemented in the allotted time |
| Second evaluation | **Last 90 minutes** of on-site contest | Demo the updated project, explain new changes, answer judges |
| Winners | Marks from **both** evaluations | Weighting announced by organizers |

### 1.2 Team
- 1–3 members, all **officially registered**. **No substitutions** with unregistered people.
- **Bring your own devices** (laptops, chargers, extension cord, mobile hotspot as an internet backup).

### 1.3 Development rules
- AI models, APIs, pretrained models, frameworks, OSS libraries and public datasets are **allowed** unless the brief restricts them.
- General-purpose pre-existing components are allowed. **A pre-built challenge-specific solution is not.**
- Disclose significant external datasets, APIs, services and components **when asked** (keep a `DISCLOSURES.md` anyway).
- **Every member must be able to explain the design, implementation and AI components.**

### 1.4 GitHub (strictly checked)
- **Public** repository.
- **Clear, continuous commit history** across *both* the 72 h phase *and* the on-site phase.
- Commit bug fixes, features and improvements **step by step**. ❌ A single final upload fails rule 5.3.
- Repo must contain source, prototype/project files and a complete `README.md`.
- Initial code pushed by T+72. On-site updates pushed within the on-site period.

### 1.5 Mandatory README.md sections (Rule 6.2)
`Project overview` · `Features (incl. how AI is used)` · `Technology stack` · `Requirements` · `Installation & setup (step-by-step)` · `Environment variables (placeholders only!)` · `Run & build commands` · **`Live deployment URL`** · `Testing instructions` · `Other configuration`

### 1.6 Submission (Rule 7)
- **Video**: how the idea works, features, AI components, real-life impact.
- **Project report**: problem, idea, implemented solution, key features, AI approach, real-life impact.
- Public GitHub link, prototype files, any presentation requested.

### 1.7 Disqualification triggers
Copying another team's work, misrepresenting external components as our own, a pre-built challenge-specific solution, unregistered member substitution.

---

## 2. How We Get Scored, and How to Maximize Every Mark

upay's guideline publishes these evaluation weights. The rulebook says the final weighting will be announced, so treat these as the best available signal.

| Criterion | Weight | What judges want | **How Shurokkha earns it** |
|---|---|---|---|
| Problem relevance | **20%** | Real, meaningful customer or business problem | Scams and account takeover are the #1 threat to wallet trust. Trust is "foundational to wallet adoption and transaction growth" (upay's own words). Persona-driven problem statement. |
| AI/ML depth | **20%** | AI is material and credible | 4 complementary techniques (GBM + anomaly + graph + LLM-RAG), calibrated scores, time-based validation, SHAP. The LLM **never** makes the decision. |
| Business/customer impact | **20%** | Measurable value, plausible economics | Metrics: BDT loss prevented at a fixed alert budget, false-positive rate, analyst minutes saved, scams averted by the warning. Live impact dashboard. |
| Prototype quality | **15%** | Working end-to-end, not slides | Live URL: customer wallet simulator, real-time scoring, analyst console, graph view, copilot, metrics |
| Innovation | **10%** | Distinctive insight | **Pre-transaction Bangla "scam interrupt"** with cooling-off. Mule-ring discovery. Evidence-grounded investigation narratives. |
| Scalability & integration | **10%** | Path to real systems and data | Event-driven design, plugin detectors, versioned APIs, model registry, "prototype → production" table, real-data validation plan |
| Responsible AI & security | **5%** | Privacy, explainability, fairness, safety | Synthetic data only, reason codes, fairness report across segments, human-in-the-loop for holds, prompt-injection defense, audit log |

**Product readiness checklist (guideline §13).** We tick every box:
- [x] Problem is frequent and economically meaningful (fraud loss + trust erosion)
- [x] AI adds value beyond a deterministic rule (we show rules-only vs ML lift)
- [x] Clear action after the prediction (allow / warn / hold / escalate)
- [x] Benefit is measurable (loss caught, FPR, time saved)
- [x] Can be validated with future real data (shadow-mode plan)
- [x] Privacy, fairness, explainability, security addressed
- [x] Integrates into a real workflow (pre-authorization scoring hook + analyst case queue)

---

## 3. Track Analysis & Solution Choice

| Track | AI depth potential | Measurable impact | Demo-ability | Risk of looking generic | Verdict |
|---|---|---|---|---|---|
| 01 Trust & Risk | ★★★★★ | ★★★★★ | ★★★★★ | Low | **Primary** |
| 02 Customer Intelligence | ★★★★ | ★★★★ | ★★★ | Medium (churn is common) | — |
| 03 Financial Independence (flagship) | ★★★ | ★★★ | ★★★★★ | **High** (chatbot risk) | **Merged in** as the customer-facing layer |
| 04 Growth & Campaign | ★★★★★ (uplift) | ★★★★ | ★★ | Medium | — |
| 05 Merchant & Agent | ★★★★ | ★★★★ | ★★★ | Medium | Agent-risk detector is a **ready on-site extension** |
| 06 Operations & Service | ★★★ | ★★★★ | ★★★★ | High (RAG chatbot) | Investigation copilot **covers** this |
| 07 Open Innovation | varies | varies | varies | — | — |

**Why this combination wins:**
1. Track 01 offers the most rigorous AI and the most measurable outcomes.
2. Adding Track 03's "empower the customer" layer (Bangla warnings, a plain-language "why", protection for first-time and vulnerable users) answers the guideline's open-innovation prompt *"What would make digital finance safer for first-time or vulnerable users?"*
3. Track 06's "AI investigation assistant" is explicitly listed under Track 01, so we cover three tracks with one coherent product, not three half-products.

---

## 4. The Solution: Shurokkha (সুরক্ষা)

### 4.1 Problem statement (guideline template)
> **For** first-time and low-digital-literacy upay users and upay's risk-operations team, **social-engineering scams, account takeovers and money-mule networks** cause **irreversible money loss, customer distrust and slow manual investigations**. **We will build** Shurokkha, an AI trust copilot that **uses** synthetic transaction, device, behavioural and network signals **to** score every transfer in real time, interrupt likely scams with a plain-Bangla warning before money leaves, and give analysts evidence-grounded case narratives. **Success is measured by** fraud loss caught at a fixed alert budget (recall @ 1% FPR), PR-AUC, false-positive rate on legitimate users, and analyst time-to-decision.

### 4.2 Personas
| Persona | Pain | What Shurokkha gives them |
|---|---|---|
| **Rahima**, 45, garments worker, first smartphone | Gets a call: "You won a prize, send 2,000 to claim it" | A Bangla warning *before* she sends: "This number received money from 37 new people today. upay never asks for fees for prizes." With a 30-min cooling-off and a "call upay" button. |
| **Tanvir**, 22, student | SIM swapped. Attacker drains the wallet at 3 AM from a new device. | Transaction held; OTP re-verification. Tanvir gets an alert. |
| **Analyst Nusrat**, upay risk ops | 400 alerts/day, 15 min each, mostly false positives | Ranked queue, reason codes, graph view, a one-click AI case summary. Target: under 4 min per case. |
| **Agent Karim** (extension) | Unusual cash-out spikes he can't explain | Agent-risk benchmarking against peers |

### 4.3 Live-demo user journey (memorize this)
1. **Customer app (mobile view):** Rahima sends 2,000 BDT to an unknown number.
2. Scoring takes **under 100 ms**. Risk 0.91. Policy says **WARN + cooling-off**.
3. Rahima sees a Bangla card with 3 reasons in plain language and an option to cancel. She cancels: **scam averted** (counter increments on the dashboard).
4. **Analyst console:** the recipient wallet appears in the queue. Click → **graph view** shows a fan-in of 37 new senders → rapid cash-out at 2 agents (a **mule ring** highlighted by community detection).
5. Click **"Generate case summary"**. The LLM writes the narrative **grounded only in the evidence JSON**, with citations to reason codes and SOP clauses (RAG). The analyst confirms → **feedback stored** → label flows into retraining.
6. **Impact dashboard:** PR-AUC, recall@1% FPR, BDT protected, FPR by segment (fairness), p95 latency, model version.
7. **Adaptability flex:** edit a threshold in `policy.yaml` → hot-reload → behaviour changes live, with no redeploy.

### 4.4 Feature list
**MVP (must ship by T+72)**
- F1 Real-time transaction risk scoring API (`POST /api/v1/score`)
- F2 Hybrid decision engine: rules + ML + policy tiers (ALLOW / WARN / HOLD / BLOCK_PENDING_REVIEW)
- F3 SHAP reason codes → plain-language explanation (Bangla + English)
- F4 Customer wallet simulator with the pre-transaction scam interrupt
- F5 Analyst console: alert queue, case detail, feedback (confirm fraud / false positive)
- F6 Mule-ring network view (graph + community detection)
- F7 AI investigation copilot (LLM + RAG over SOP docs, grounded in evidence)
- F8 Impact and model dashboard (metrics, fairness, latency, drift)
- F9 Synthetic data generator with documented, injected fraud scenarios

**Stretch (only if MVP is green by hour 56)**
- S1 Bangla voice warning (TTS)
- S2 Agent-risk detector (peer benchmarking)
- S3 Batch CSV scoring upload
- S4 Shadow-mode / A-B model comparison view

---

## 5. System Architecture

### 5.1 Reference flow (matches guideline §12: Input → Intelligence → Action → Feedback)

```mermaid
flowchart LR
    subgraph INPUT
        A[Synthetic data generator] --> B[(PostgreSQL<br/>entities, tx, cases, audit)]
        C[Customer app / Partner API<br/>transfer request] --> D
    end
    subgraph INTELLIGENCE
        D[FastAPI Gateway<br/>/api/v1/score] --> E[Feature Service<br/>registry + online features]
        E <--> R[(Redis<br/>velocity counters, cache)]
        E --> F[Detector Registry]
        F --> F1[Rules detector]
        F --> F2[LightGBM detector]
        F --> F3[Anomaly detector<br/>Isolation Forest]
        F --> F4[Graph detector<br/>mule-ring features]
        F1 & F2 & F3 & F4 --> G[Policy Engine<br/>policy.yaml]
        G --> H[Explainer<br/>SHAP → reason codes]
    end
    subgraph ACTION
        H --> I[Decision: ALLOW / WARN / HOLD]
        I --> J[Customer warning<br/>Bangla / English]
        I --> K[Analyst case queue]
        K --> L[LLM Gateway + RAG<br/>case narrative]
    end
    subgraph FEEDBACK
        K --> M[Analyst label]
        M --> N[Retraining pipeline<br/>Model Registry]
        N --> F2
        I --> O[Audit log + metrics<br/>/metrics dashboard]
    end
```

### 5.2 Design principles (each maps to a guideline expectation)
| Principle | Implementation | Guideline ref |
|---|---|---|
| Separate data prep from inference | `pipelines/` (offline training, feature backfill) vs `app/` (online scoring) | §12 |
| Business rules distinct from ML | `policy.yaml` + rules detector are separate from model detectors | §12 |
| Traceable, explainable outputs | Every decision stores `model_version`, `feature_snapshot`, `reason_codes`, `policy_version` | §12 |
| API ready for a real backend | Versioned REST, OpenAPI spec, idempotency keys, Pydantic schemas | §12 |
| No sensitive logic in an LLM prompt | LLM only **narrates** a decision already made by ML + policy | §12, §14 |

### 5.3 Hot path vs. cold path
| Path | Latency budget | What runs |
|---|---|---|
| **Hot (sync)** | p95 < 100 ms | Feature lookup (Redis) → detectors (in-process models) → policy → reason codes (precomputed SHAP via `TreeExplainer`, fast for trees) |
| **Warm (async)** | seconds | LLM case narrative, notifications, audit write-behind |
| **Cold (batch)** | minutes | Graph recompute (community detection), retraining, drift report, fairness report |

---

## 6. Data Strategy (Synthetic, Privacy-Safe)

> Guideline §11: **No production data. Never use real PII.** Data must be realistic, **clearly synthetic**, with **injected known patterns**, **documented assumptions** and a **clean test set**.

### 6.1 Entities
| Table | Volume (default seed) | Key fields |
|---|---|---|
| `customers` | 5,000 | id, persona, age_band, division, kyc_level, signup_date, home_device_id |
| `merchants` | 300 | id, category (grocery, pharmacy, utility…), location |
| `agents` | 150 | id, division, float_capacity |
| `devices` | ~6,500 | id, os, first_seen |
| `transactions` | ~500k over 90 days | id, ts, type (send_money, cash_in, cash_out, payment, mobile_recharge, bill_pay), amount, sender, receiver, device_id, channel, geo_cell, label, scenario_tag |
| `cases` / `feedback` | generated at runtime | alert_id, analyst_decision, notes |

Names are generated with **Faker (bn_BD)** and phone numbers with a reserved fake prefix. Everything is marked `is_synthetic=true`.

### 6.2 Normal behaviour model
- Persona-specific monthly cycles: salary/remittance inflow at the start of the month, bills mid-month, a month-end squeeze (this also makes Track 03 insights realistic).
- Diurnal pattern (peaks 10:00–13:00 and 18:00–22:00), Eid/festival spikes, Friday effects.
- Amount distributions: log-normal per persona, round-number bias (500, 1000, 2000).

### 6.3 Injected fraud scenarios (labelled, about 0.8% of transactions)
| # | Scenario | Signature injected |
|---|---|---|
| S1 | **Account takeover (ATO)** | SIM-swap event → new device → password reset → rapid drain to new recipients at odd hours |
| S2 | **Prize / lottery scam** | Victim sends a round amount to a never-seen recipient. Recipient has high fan-in from new senders. |
| S3 | **"Wrong send" refund scam** | Fake incoming notification → victim "refunds" to a third wallet |
| S4 | **Money-mule ring** | 5–15 wallets, fan-in from many victims → fast forward → cash-out within minutes at a few agents |
| S5 | **Agent collusion / split cash-out** | Structuring: many just-below-limit cash-outs at one agent |
| S6 | **OTP / social-engineering drain** | Device unchanged, but behaviour (amount, recipient, time) deviates sharply |

### 6.4 Evaluation hygiene
- **Time-based split:** days 1–70 train, 71–80 validation (thresholds and calibration), **81–90 held-out test, never touched until the final report.**
- **Entity-disjoint check:** mule-ring members in test are not in train (tests generalization, not memorization).
- Generator is **seeded and deterministic** (`--seed 42`), so anyone can reproduce the exact dataset.
- `docs/DATA_ASSUMPTIONS.md` lists every assumption (rates, distributions, scenario logic).

---

## 7. AI/ML Design

### 7.1 Feature catalogue (registered in a feature registry)
| Group | Examples |
|---|---|
| Velocity | tx count / sum in last 1 h, 24 h, 7 d. Distinct recipients in 24 h. |
| Amount behaviour | amount z-score vs the user's 30-day history, round-amount flag, % of balance sent |
| Recipient novelty | first time paying this recipient, recipient account age, recipient fan-in from *new* senders in 24 h |
| Device / session | new device, device age, SIM-swap recency, password reset in last 24 h, geo-cell jump |
| Time | hour deviation from the user's normal hours, night flag |
| Network (graph) | recipient PageRank, community fraud ratio, hops to known fraud, in/out ratio, cash-out latency after cash-in |
| Persona context | kyc_level, account tenure (also used in fairness slicing) |

### 7.2 Models
| Detector | Algorithm | Why |
|---|---|---|
| **Supervised risk** | **LightGBM**, `is_unbalance` / focal weighting, **isotonic calibration** | Best-in-class on tabular data, fast (< 2 ms), native SHAP support |
| **Behavioural anomaly** | **Isolation Forest** on per-user deviation features | Catches **novel** fraud with no labels (S6). Its score also feeds LightGBM as a feature. |
| **Network risk** | NetworkX graph + **Louvain communities** + PageRank + fan-in/out → features. Optional: Node2Vec embeddings. | Mule rings are invisible per transaction and only visible as a network (S4) |
| **Rules** | Deterministic, YAML-defined (e.g. SIM-swap < 24 h AND new device AND amount > 80% balance) | Regulator-friendly guardrails, cold-start coverage, a baseline to show ML lift |
| **Ensemble** | Policy engine combines `max(rule_hits)`, calibrated ML probability and the anomaly percentile | Transparent, tunable, no black-box stacking |

### 7.3 Training & selection
- Baselines first: rules-only → logistic regression → LightGBM. **Show the lift table in the report.**
- Hyperparameter tuning: Optuna, 30 trials, optimizing **PR-AUC** (not accuracy, given heavy class imbalance).
- **Threshold selection by cost:** choose the WARN and HOLD thresholds that maximize `BDT saved − (FP × friction cost)` at a fixed analyst capacity (e.g. 200 alerts/day).
- Store artifacts in `models/registry/<version>/` with `model.txt`, `metrics.json`, `features.json` and `data_hash`.

### 7.4 Metrics we report
| Type | Metric |
|---|---|
| Model | PR-AUC, ROC-AUC, **recall @ 1% FPR**, precision@k (k = daily alert capacity), calibration (Brier) |
| Per-scenario | Recall per injected scenario S1–S6 (shows *what* we catch) |
| Business | BDT loss prevented (test window), alerts/day, analyst minutes saved, scam-interrupt cancel rate (simulated) |
| Fairness | FPR and alert rate by `division`, `age_band`, `kyc_level`, new vs tenured users. Flag any gap > 1.25×. |
| System | p50/p95/p99 scoring latency, throughput (RPS), error rate |

### 7.5 Explainability
- `shap.TreeExplainer` → top 3 contributing features → **reason codes** (`R_NEW_RECIPIENT_HIGH_FANIN`, `R_SIM_SWAP_RECENT`, …).
- Each reason code maps to a **template** in `i18n/bn.yaml` and `i18n/en.yaml`, for example:
  - `R_NEW_RECIPIENT_HIGH_FANIN` → "এই নম্বরে আজ ৩৭ জন নতুন মানুষ টাকা পাঠিয়েছেন।" ("37 new people sent money to this number today.")
- Templates are deterministic, so the customer-facing warning **never depends on the LLM**.

---

## 8. GenAI Layer (Grounded, Guard-railed)

### 8.1 Where the LLM is used (and where it is not)
| ✅ Used for | ❌ Never used for |
|---|---|
| Analyst case narrative ("What happened / why risky / next step") | Making the allow/hold decision |
| Q&A over SOP and policy docs (RAG) | Producing numbers that aren't in the evidence |
| Optional: richer Bangla customer explanation (with template fallback) | Anything on the hot path |

### 8.2 Grounding pattern
1. Build an **evidence JSON**: transaction, features, reason codes, SHAP values, graph stats, related alerts.
2. Retrieve the top-k SOP chunks (synthetic upay-style fraud SOPs) from a local vector store (FAISS or Chroma, multilingual embeddings).
3. Prompt: *"Use ONLY the evidence. Cite reason codes and SOP ids. If unknown, say so."* Ask for **structured JSON output** (`summary`, `risk_factors[]`, `recommended_action`, `citations[]`).
4. **Validate** the output with Pydantic. Reject numbers not present in the evidence (a simple numeric-consistency checker).

### 8.3 LLM gateway (provider-agnostic)
- One `LLMClient` interface → providers: Anthropic Claude (e.g. `claude-haiku-4-5` for speed, `claude-sonnet-5-5` for quality), Gemini or Groq free tiers, or a local Ollama model.
- **Timeout 8 s**, 2 retries with exponential backoff, **circuit breaker**, response cache keyed by evidence hash.
- **Fallback:** if every provider fails, return a template-generated narrative from reason codes. The UI shows "AI summary unavailable — showing rule-based summary". **The demo never breaks.**

### 8.4 Prompt-injection & data-leak defense
- Transaction memos and user text are wrapped as `<untrusted_data>` and the system prompt says to treat them as data only.
- Strip and limit memo length. No tools or actions available to the LLM.
- PII minimization: send pseudonymous IDs, never names or phones.

---

## 9. Adaptability: Built for the On-Site Twist

> The on-site round gives **new requirements based on our pre-evaluation**, with limited time. Architecture decides whether a change takes **20 minutes or 3 hours**.

### 9.1 Extension points
| Extension point | How to add something new | Typical time |
|---|---|---|
| **Detector plugin** | New file in `app/detectors/` implementing `Detector.score(ctx) -> Signal`, plus one line in `detectors.yaml` | 15–45 min |
| **Feature registry** | `@feature("recipient_fanin_24h")` decorated function, auto-discovered | 10–20 min |
| **Policy engine** | Edit `policy.yaml` (thresholds, tiers, segment overrides). **Hot-reload** without redeploy. | 2 min |
| **Reason codes / i18n** | Add a key to `i18n/*.yaml` | 2 min |
| **Model registry** | `make train` → new version → set `ACTIVE_MODEL` env or call the admin endpoint | 10 min |
| **Feature flags** | `flags.yaml` toggles new UI panels and detectors | 1 min |
| **Schemas** | Pydantic models with optional fields and `/api/v2` if a contract must break | 15 min |
| **Frontend panels** | Config-driven dashboard cards (`dashboard.config.ts`) | 15–30 min |

### 9.2 Core interface (sketch)
```python
# app/detectors/base.py
class Signal(BaseModel):
    detector: str
    score: float            # 0..1, calibrated
    reason_codes: list[str]
    details: dict = {}

class Detector(Protocol):
    name: str
    def score(self, ctx: "ScoringContext") -> Signal: ...

# app/detectors/registry.py — loads enabled detectors from detectors.yaml
# A new on-site requirement such as "detect QR-merchant scams" = one new Detector + one YAML line.
```

```yaml
# config/policy.yaml (hot-reloaded)
version: 3
tiers:
  - action: HOLD_FOR_REVIEW
    when: "ml >= 0.85 or any_rule('ATO_COMBO')"
  - action: WARN
    when: "ml >= 0.55 or anomaly_pct >= 0.99 or graph_risk >= 0.7"
  - action: ALLOW
    when: "true"
segment_overrides:
  first_30_days_users: { warn_threshold: 0.45 }   # protect new/vulnerable users
limits:
  max_daily_alerts: 200
```

### 9.3 Likely on-site requirements, pre-thought
| Likely ask from judges | Our ready answer |
|---|---|
| "Add a new fraud type" (QR scam, fake merchant, loan scam) | New detector + scenario in generator + retrain (`make data train`) |
| "Reduce false positives for X segment" | Segment override in `policy.yaml` + fairness report rerun |
| "Support bulk / batch scoring (CSV upload)" | `/api/v1/score/batch` reusing the same pipeline (stub prepared) |
| "Add merchant / agent risk" | Agent-risk detector (peer z-scores), already scoped as S2 |
| "Add a feedback loop / retraining" | Feedback table exists → `make retrain` → new registry version |
| "Add role-based access / auth" | JWT with `customer` / `analyst` / `admin` roles via FastAPI dependencies |
| "Notify via SMS / push" | `Notifier` interface with a console/mock provider |
| "Explain a decision to a customer in Bangla voice" | TTS on the existing template text |
| "Show impact over time / new KPI" | Add dashboard card + metrics query |
| "Make it faster / handle more load" | Show the load-test result, enable Redis cache, add a worker replica |
| "Add a dispute flow" | Case state machine already has `OPEN → INVESTIGATING → RESOLVED`. Add `DISPUTED`. |

---

## 10. Scalability

### 10.1 Prototype → production path (show this table to judges)
| Concern | Hackathon prototype | Production at upay scale |
|---|---|---|
| Ingestion | REST `POST /score` | Kafka / Redpanda event stream, partitioned by wallet id |
| Online features | Redis sorted sets / counters | Redis Cluster or a feature store (Feast) |
| Model serving | In-process LightGBM (stateless API) | Same, horizontally scaled pods, or ONNX Runtime / Triton |
| Graph | NetworkX batch every N min | Neo4j / TigerGraph or Spark GraphFrames, incremental |
| Storage | PostgreSQL (time-partitioned tx table) | Postgres partitions + data lake (Parquet) for training |
| LLM | Hosted API + cache | Private/hosted model, request quotas, cost monitoring |
| Deploy | Docker on Render/Railway | Kubernetes + HPA, blue/green, model shadow mode |

### 10.2 Scalability tactics we actually implement
- **Stateless API**: any replica can serve any request (state lives in Postgres/Redis).
- **Async FastAPI + uvicorn workers**. Heavy work (LLM, graph) goes to a background worker.
- **Pagination** on every list endpoint. **Indexes** on `(sender_id, ts)`, `(receiver_id, ts)`.
- **Caching**: recipient graph features cached in Redis (TTL 5 min). LLM responses cached by evidence hash.
- **Load test** with Locust/k6 in `tests/load/` and the result in the README (e.g. "N RPS at p95 X ms on 1 vCPU": **report what we measure, don't invent**).

---

## 11. Reliability & Graceful Degradation

### 11.1 Degradation ladder (no single failure breaks the product)
| Failure | Behaviour |
|---|---|
| LLM provider down or slow | Circuit breaker → template narrative. UI badge shows "AI summary unavailable". |
| ML model fails to load | **Rules-only mode** + alert in `/health`. The decision still happens. |
| Redis unavailable | In-memory LRU fallback for counters (per instance). Logged as degraded. |
| Scoring exceeds latency budget (150 ms) | Return the rules result + `degraded=true`, never hang the payment |
| DB write fails | Decision still returned. Audit event queued and retried (write-behind). |
| Free-tier cold start | Warm-up ping (GitHub Action cron / UptimeRobot) before judging + local Docker backup |

### 11.2 Engineering safeguards
- **Health endpoints**: `/health/live`, `/health/ready` (checks DB, Redis, model loaded, policy version).
- **Idempotency key** on `/score`: retries never double-create alerts.
- **Input validation**: Pydantic with strict types, amount bounds, enum types.
- **Structured JSON logs** with `request_id`, plus a `/metrics` Prometheus endpoint (latency histogram, decisions by tier, fallback counts).
- **Immutable audit log** of every decision (who/what/model_version/policy_version).
- **Deterministic seed data on startup** (`SEED_ON_BOOT=true`): the live URL is never empty.
- **Pinned dependencies** (`uv.lock` / `requirements.txt` with hashes, `package-lock.json`).
- **Backups for demo day**: local `docker compose up` copy, recorded video, screenshots in `docs/`.

---

## 12. Performance Targets & How We Hit Them

| Target | Value | Technique |
|---|---|---|
| Score latency | **p95 < 100 ms** (server-side) | In-process LightGBM, precomputed graph features, Redis lookups, no LLM in the hot path |
| Explanation latency | < 20 ms | `TreeExplainer` on a single row, limited to top-3 |
| Case narrative | < 8 s, cached afterwards | Async + cache + fast model |
| Frontend | LCP < 2.5 s | Next.js static where possible, lazy-load the graph viz, skeleton loaders |
| Model quality (synthetic test) | PR-AUC and recall@1%FPR clearly above the rules-only baseline | Feature engineering + graph features + tuning |
| Training time | < 5 min on a laptop | LightGBM, sampled tuning |

Measure everything with `tests/load/` and `/metrics`. **Put the real numbers in the README and report.**

---

## 13. Security & Responsible AI

### 13.1 Responsible AI (guideline §14 minimums → our implementation)
| Principle | Implementation |
|---|---|
| **Privacy** | 100% synthetic data, Faker-generated identities, `is_synthetic` flag, pseudonymous IDs to the LLM |
| **Explainability** | SHAP reason codes on every decision, plain-language templates, analyst sees feature values |
| **Fairness** | `reports/fairness.md`: FPR and alert rate by division, age band, KYC level, tenure. Segment features *not* used as direct model inputs where avoidable. |
| **Security** | Prompt-injection isolation, input validation, rate limiting (`slowapi`), JWT roles, secrets via env vars only, CORS allow-list, dependency scan (`pip-audit`, `npm audit`) |
| **Human oversight** | HOLD decisions require analyst review. Analysts can override, and overrides are logged. |
| **Transparency** | UI clearly separates **Prediction** (score), **Assumptions** (policy) and **AI-generated text** (labelled "AI-generated") |
| **No harmful automation** | No permanent auto-block. Highest tier = temporary hold + human review. Customer-facing warnings empower and never manipulate (Track 03 rule). |

### 13.2 Secrets
- `.env.example` with placeholders only. `.env` is in `.gitignore` **from commit #1**.
- Add a `gitleaks` pre-commit hook or GitHub Action to block accidental key pushes.

---

## 14. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Language | Python 3.11, TypeScript | ML ecosystem + typed frontend |
| Data | Pandas / Polars, Faker (bn_BD), NumPy | Fast synthetic generation |
| ML | LightGBM, scikit-learn (IsolationForest, calibration), SHAP, Optuna | Strong on tabular data, explainable |
| Graph | NetworkX, `python-louvain` (community), optional `node2vec` | Mule-ring detection |
| GenAI | Provider-agnostic gateway (Claude / Gemini / Groq / Ollama), FAISS or Chroma, multilingual embeddings (`intfloat/multilingual-e5-small`) | Grounded narratives, Bangla support |
| API | FastAPI, Pydantic v2, uvicorn, SQLAlchemy 2 + Alembic, slowapi | Async, typed, auto OpenAPI docs |
| Storage | PostgreSQL (Neon/Supabase), Redis (Upstash) | Managed free tiers |
| Frontend | Next.js 14+, Tailwind, shadcn/ui, Recharts, react-force-graph / Cytoscape.js | Fast to build, polished |
| Ops | Docker, docker-compose, GitHub Actions, Prometheus-format metrics, structlog | Reproducible and observable |
| Testing | pytest, httpx, hypothesis (optional), Playwright (smoke), Locust/k6 | Full pyramid |

---

## 15. Repository Structure

```
shurokkha/
├── README.md                    # Rule 6.2 compliant
├── DISCLOSURES.md               # external datasets/APIs/components (Rule 4.4)
├── LICENSE
├── .env.example
├── docker-compose.yml           # api + worker + web + postgres + redis
├── Makefile                     # make data | train | eval | run | test | load
├── .github/workflows/ci.yml     # lint, tests, model quality gate, gitleaks
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, routers, middleware
│   │   ├── api/v1/              # score, alerts, cases, copilot, metrics, admin
│   │   ├── core/                # config, logging, security, idempotency
│   │   ├── features/            # feature registry + online feature store
│   │   ├── detectors/           # base.py, registry.py, rules.py, lgbm.py, anomaly.py, graph.py
│   │   ├── policy/              # engine.py (hot reload), policy.yaml
│   │   ├── explain/             # shap_explainer.py, reason_codes.py
│   │   ├── genai/               # llm_gateway.py, rag.py, prompts/, guards.py
│   │   ├── i18n/                # bn.yaml, en.yaml
│   │   ├── db/                  # models, migrations (alembic)
│   │   └── workers/             # graph refresh, narratives, audit write-behind
│   ├── pipelines/
│   │   ├── generate_data.py     # seeded synthetic generator + scenarios S1–S6
│   │   ├── build_features.py
│   │   ├── train.py             # baselines → LightGBM → calibration → registry
│   │   ├── evaluate.py          # metrics, per-scenario recall, fairness, lift
│   │   └── graph_build.py
│   ├── models/registry/         # versioned artifacts (small) or download script
│   ├── knowledge/sop/           # synthetic SOP docs for RAG
│   └── tests/                   # unit, api, golden scenarios, load/
├── frontend/
│   ├── app/(customer)/          # wallet simulator (mobile view)
│   ├── app/(analyst)/           # queue, case detail, graph, copilot
│   ├── app/(admin)/             # dashboard, model/policy view
│   └── lib/api.ts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA_ASSUMPTIONS.md
│   ├── MODEL_CARD.md
│   ├── REPORT.pdf
│   └── screenshots/
└── reports/                     # metrics.json, fairness.md, load_test.md
```

---

## 16. API Contract

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/score` | Score one transaction (sync, idempotent) |
| POST | `/api/v1/score/batch` | Batch scoring (CSV/JSON) |
| GET | `/api/v1/alerts?status=&page=` | Analyst queue (paginated, ranked) |
| GET | `/api/v1/cases/{id}` | Case detail: evidence, reasons, graph neighbourhood |
| POST | `/api/v1/cases/{id}/feedback` | Analyst label (fraud / legit / unsure) |
| POST | `/api/v1/copilot/case-summary/{id}` | LLM narrative (async-capable, cached) |
| POST | `/api/v1/copilot/ask` | RAG Q&A over SOPs |
| GET | `/api/v1/graph/wallet/{id}` | k-hop subgraph for visualization |
| GET | `/api/v1/metrics/impact` | Business + model + fairness metrics |
| POST | `/api/v1/admin/policy/reload` | Hot-reload policy (admin role) |
| GET | `/health/live`, `/health/ready`, `/metrics` | Ops |

**Example: `/score` response**
```json
{
  "transaction_id": "tx_000123",
  "decision": "WARN",
  "risk_score": 0.91,
  "signals": [
    {"detector": "lgbm", "score": 0.91},
    {"detector": "graph", "score": 0.78},
    {"detector": "rules", "score": 0.0}
  ],
  "reason_codes": ["R_NEW_RECIPIENT_HIGH_FANIN", "R_ROUND_AMOUNT_NEW_PAYEE", "R_UNUSUAL_HOUR"],
  "customer_message": {"bn": "...", "en": "..."},
  "model_version": "lgbm-2026-10-03-v4",
  "policy_version": 3,
  "latency_ms": 23,
  "degraded": false
}
```

---

## 17. Testing & Quality Gates

| Layer | What | Tool |
|---|---|---|
| Unit | Features, detectors, policy evaluation, reason-code mapping | pytest |
| API | Every endpoint: happy path, validation errors, auth, idempotency | pytest + httpx |
| **Golden scenarios** | One fixed example per scenario S1–S6 **must** produce WARN/HOLD. Three normal examples **must** ALLOW. | pytest |
| **Model quality gate (CI)** | Fail the build if PR-AUC < baseline + margin, or any scenario recall drops > 10% | `evaluate.py --gate` |
| Fallbacks | LLM down → template. Model missing → rules-only. Redis down → in-memory. | pytest with mocks |
| E2E smoke | Customer sends → warning appears → analyst sees alert | Playwright |
| Load | 1-, 10-, 50-user ramps, record p95 | Locust / k6 |
| Security | `pip-audit`, `npm audit`, gitleaks | CI |

`make test` runs everything except load. The README's "Testing instructions" section points to it (Rule 6.2).

---

## 18. Deployment

### 18.1 Recommended (free-tier friendly)
| Component | Host |
|---|---|
| API + worker (Docker) | Render / Railway / Fly.io |
| Frontend | Vercel |
| PostgreSQL | Neon or Supabase |
| Redis | Upstash |
| Uptime / warm-up | UptimeRobot or GitHub Actions cron hitting `/health/live` |

### 18.2 Rules
- **First deploy by hour 24** (even an ugly one). Deploy problems found at hour 70 kill teams.
- CI deploys `main` automatically. Tag `v1.0-initial-submission` at T+72.
- Keep model artifacts small (LightGBM text model is in the KB–MB range). Commit them or download on boot.
- One-command local run: `docker compose up --build` → http://localhost:3000

---

## 19. Team Roles (3 members)

| Member | Primary | Secondary | Owns deliverable |
|---|---|---|---|
| **A: ML/Data Lead** | Data generator, features, models, evaluation, fairness | Graph detector | `MODEL_CARD.md`, metrics in report |
| **B: Backend/Platform Lead** | FastAPI, detector registry, policy engine, DB, Redis, CI/CD, deploy, load test | LLM gateway reliability | README (setup/run/env/test sections), `ARCHITECTURE.md` |
| **C: Product/Frontend/GenAI Lead** | Next.js (3 apps), RAG copilot, Bangla i18n, UX | Problem framing, personas | Report, video, pitch, demo script |

> Everyone must be able to explain **every** component (Rule 4.5 / 9.4). Run a 20-minute "teach-back" session at hour 60.

**Solo or 2-person team?** Cut S1–S4, use Streamlit instead of Next.js for the analyst console, and skip Redis (in-memory + Postgres).

---

## 20. 72-Hour Execution Plan

> Work in **4-hour blocks**. Keep **one person awake** at a time during nights (staggered 5–6 h sleep). Commit at the end of **every** task.

| Hours | A: ML/Data | B: Backend/Platform | C: Product/Frontend/GenAI | Milestone |
|---|---|---|---|---|
| **0–3** | Read brief together → map to this plan → write problem statement → **go/no-go on the idea** | Create public repo, `.gitignore`, `.env.example`, skeleton, CI, Docker | Personas, user journey, wireframes | Repo live, plan frozen |
| **3–8** | Data schema + generator v1 (normal behaviour) | FastAPI skeleton, DB models, `/health`, detector & policy interfaces | Next.js scaffold, layout, mock API | First commits ×15+ |
| **8–16** | Inject scenarios S1–S6, time split, `DATA_ASSUMPTIONS.md` | Feature registry + online features (Redis), `/score` with rules detector | Customer wallet simulator + warning card (mock) | **E2E with rules only** |
| **16–24** | Baselines → LightGBM v1 → calibration → registry | Plug LGBM detector, idempotency, audit log, **deploy v0** | Analyst queue + case detail | 🚀 **Live URL v0** |
| **24–32** | SHAP → reason codes, Isolation Forest detector | Async worker, pagination, error handling, logs/metrics | i18n bn/en templates, wire real API | Explanations live |
| **32–40** | Graph build, Louvain, graph features, retrain v2 | `/graph` endpoint, cache, fallbacks (rules-only, Redis) | Graph visualization, RAG ingest of SOPs | Mule-ring demo works |
| **40–48** | `evaluate.py`: lift table, per-scenario recall, **fairness report** | LLM gateway (timeouts, breaker, cache, template fallback), auth roles | Copilot UI, impact dashboard | **Feature-complete MVP** |
| **48–56** | Threshold tuning by cost, model card | Tests: unit/API/golden/fallback, CI quality gate, load test | Polish UX, empty/loading/error states, mobile check | 🔒 **Feature freeze at 56** |
| **56–64** | Final metrics → report numbers | Hardening, deploy v1, warm-up cron, `docker compose` verified on a clean machine | **Report draft**, demo script, video storyboard | Stable release candidate |
| **64–69** | Report review, Q&A prep | **README final** (all Rule 6.2 items), DISCLOSURES | **Record + edit video** (3–5 min) | All deliverables ready |
| **69–72** | Buffer: fix only critical bugs. Tag `v1.0-initial-submission`. **Submit by T+70** (2 h safety margin). | | | ✅ Submitted |

**Between submission and the final (~2–3 days):** don't add features, because pre-evaluation judges what was submitted. Use the time to:
- rehearse the demo and Q&A,
- prepare **extension stubs** for the likely asks in §9.3 (as notes and design only; actual on-site changes must be committed on-site),
- re-read our own code so every member can explain it.

---

## 21. Git & Commit Discipline

- **Conventional commits:** `feat(detector): add graph fan-in feature`, `fix(api): handle missing device_id`, `test(golden): add ATO scenario`, `docs(readme): add env vars`.
- **Small and frequent:** aim for **80–150 commits** in 72 h across all members, each with a real message. No `update`, no `final`, no `asdf`.
- Feature branches → PR → merge to `main` (shows teamwork and review). Squash only within a branch if it's noisy, and **never squash the whole history**.
- Each member commits **from their own GitHub account** (configure `user.name` / `user.email` correctly on every laptop before T+0).
- Tags: `v0.1-rules-e2e`, `v0.5-ml`, `v1.0-initial-submission`, `v1.1-onsite`.
- On-site: create branch `onsite/<requirement>` per requirement, commit every 15–20 min, merge and **push before the deadline**.
- Never commit `.env`, raw large datasets (> 50 MB) or keys. Commit the **generator** and a **small sample**.

---

## 22. Deliverables: README, Report, Video

### 22.1 README.md template (covers every Rule 6.2 item)
```markdown
# Shurokkha (সুরক্ষা): AI Trust & Financial-Safety Copilot for upay
**Live demo:** https://<frontend-url>  ·  **API docs:** https://<api-url>/docs  ·  **Video:** <link>
Demo credentials: analyst@demo / <given in submission form>  (synthetic, demo only)

## 1. Project Overview        (problem, solution, purpose, persona)
## 2. Features                (F1–F9; for each: how AI is used)
## 3. Architecture            (diagram + hot/warm/cold paths)
## 4. Technology Stack        (languages, frameworks, AI models, APIs, libraries, services)
## 5. Requirements            (Python 3.11, Node 20, Docker 24+, 4 GB RAM, optional LLM API key)
## 6. Installation & Setup    (step-by-step: clone → env → data → train → run)
## 7. Environment Variables   (table: NAME | purpose | example placeholder)
## 8. Run & Build Commands    (docker compose up --build | make data train run | npm run build)
## 9. Live Deployment URL     (frontend, API, health endpoint)
## 10. Testing Instructions   (make test, golden scenarios, load test, manual demo script)
## 11. Other Configuration    (policy.yaml, detectors.yaml, flags.yaml, model registry, seeding)
## 12. Results                (real measured metrics, fairness summary, latency)
## 13. Responsible AI         (privacy, fairness, human oversight, limitations)
## 14. Disclosures            (link to DISCLOSURES.md)
## 15. Team                   (names, roles)
```

**Env vars table example:**
| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Postgres connection | `postgresql://user:pass@host:5432/shurokkha` |
| `REDIS_URL` | Online features/cache (optional) | `redis://localhost:6379/0` |
| `LLM_PROVIDER` | `anthropic` \| `gemini` \| `groq` \| `ollama` \| `none` | `anthropic` |
| `LLM_API_KEY` | Provider key | `<your-key-here>` |
| `ACTIVE_MODEL` | Model registry version | `lgbm-v4` |
| `SEED_ON_BOOT` | Load demo data on start | `true` |
| `JWT_SECRET` | Auth signing | `<random-32-bytes>` |
| `CORS_ORIGINS` | Allowed frontends | `http://localhost:3000` |

### 22.2 Project report outline (Rule 7.3), 8–12 pages
1. **Problem**: persona, context, why it matters to upay, baseline pain (stated as assumptions)
2. **Proposed idea**: the "What happened / Why risky / What next" product, problem-statement template
3. **Implemented solution**: architecture, user journeys, screenshots
4. **Key features**: F1–F9
5. **AI approach**: data generation, features, models, baselines vs final (lift table), explainability, GenAI grounding, evaluation methodology, **per-scenario recall**, fairness
6. **Real-life impact**: customer impact, business impact (clearly labelled estimates with assumptions), operational impact
7. **Scalability & integration**: prototype → production table, validation plan with real upay data (shadow mode → controlled pilot), matching guideline §13 stages
8. **Responsible AI & security**
9. **Limitations & future work** (honesty earns trust)
10. **Disclosures & team**

### 22.3 Video script (3–5 min; Rule 7.2)
| Time | Content |
|---|---|
| 0:00–0:30 | Hook: Rahima gets a "you won a prize" call. Money sent this way is often never recovered. |
| 0:30–1:00 | Problem + persona + our one-line solution |
| 1:00–2:30 | **Live demo**: customer warning (Bangla) → analyst queue → graph mule ring → AI case summary → feedback |
| 2:30–3:30 | AI components: LightGBM + anomaly + graph + SHAP + grounded LLM. Architecture diagram. Metrics. |
| 3:30–4:15 | Real-life impact, responsible AI (human oversight, synthetic data, fairness) |
| 4:15–4:45 | Scalability path + how upay could validate it. Close with the team. |

Record in 1080p with clear audio, show captions and a visible cursor. Keep a **backup copy** on Drive and YouTube (unlisted).

---

## 23. On-Site Final-Day Playbook

**Bring:** laptops + chargers, extension board, mobile hotspot (data pack), HDMI/USB-C adapters, printed architecture diagram, local Docker images pre-pulled, `.env` files offline (never in git), water and snacks.

| Phase | Action |
|---|---|
| **T₀ + 0–15 min** | Read the new requirements together. Decompose each into: *detector? feature? policy? UI? data?* (use §9.1). Estimate and prioritize **must-have first**. |
| **T₀ + 15 min** | Assign owners. Create `onsite/<req>` branches. Write the plan in `docs/ONSITE_CHANGES.md`. |
| **Build loop** | Implement behind a **feature flag** → test → commit (every 15–20 min) → merge → deploy. Keep `main` always demo-able. |
| **Midpoint** | Deploy to live URL and verify. If something is risky, demo it locally while the live URL keeps the stable version. |
| **Last 30 min before evaluation** | **Code freeze.** Final push. Verify the GitHub commit timestamps are inside the window. Rehearse the 5-min demo of the *new* requirements. |
| **Second evaluation (90 min)** | Show: (1) new requirement working, (2) where it plugged into the architecture, (3) the tests for it, (4) the commit history. Every member speaks. |

**Golden rule:** a smaller requirement done well, tested, committed and explained beats a bigger one half-done.

---

## 24. Judge Q&A Preparation

| Question | Answer outline |
|---|---|
| Why not just rules? | Show the lift table: rules-only vs LightGBM vs full ensemble. Rules miss novel patterns and network fraud. |
| How do you handle class imbalance? | Class weighting, PR-AUC as the metric, threshold by cost, calibrated probabilities |
| How do you avoid leakage? | Time-based split, features computed only from past events (point-in-time), entity-disjoint test for rings |
| Is synthetic data meaningful? | Documented generator, injected known patterns, per-scenario recall. **Honest:** real validation needed, and we propose shadow mode on governed upay data. |
| Why use an LLM at all? | Analyst productivity: it narrates evidence. It **doesn't decide**, it's grounded and validated, and it falls back to templates. |
| What if the LLM hallucinates? | Evidence-only prompt, structured output, numeric consistency check, citations, "AI-generated" label |
| Fairness? | Show the FPR-by-segment table and the mitigation (segment thresholds, removing proxy features) |
| How would this scale to millions of tx/day? | Stateless scoring, stream ingestion, Redis features, horizontal pods, batch graph refresh (§10.1) |
| What happens if your model service fails during a payment? | Degradation ladder: rules-only, a latency budget and never blocking silently (§11.1) |
| How would upay integrate it? | Pre-authorization hook calls `/score`. Case queue integrates with the existing case-management system through the API. Shadow mode first. |
| What is the business value? | BDT protected at a fixed alert budget, analyst time saved, trust → retention. Give estimates **with assumptions**. |
| Who built what? | Each member explains their part **and** one other part |

---

## 25. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| T+0 brief restricts the theme/track | Medium | High | §26 Plan B: the platform pattern is reusable |
| Scope creep | High | High | MVP list frozen at hour 3, feature freeze at hour 56 |
| Deploy fails late | Medium | High | Deploy v0 at hour 24, CI auto-deploy, local Docker backup |
| LLM quota/outage | Medium | Medium | Gateway fallback + cache + multiple providers |
| Free-tier cold start during judging | High | Medium | Warm-up cron, open the URL 5 min before |
| Weak commit history | Medium | **Disqualifying-level** | Commit discipline §21. Check `git log` at hours 24, 48 and 70. |
| Member can't explain a component | Medium | High | Teach-back session, `ARCHITECTURE.md`, pair on critical parts |
| Secret leaked to public repo | Low | High | `.gitignore` from commit 1, gitleaks in CI, rotate immediately if it happens |
| Internet down on-site | Medium | High | Mobile hotspot, local Docker stack, offline LLM fallback (templates) |
| Synthetic results look "too good" | Medium | Medium | Add noise and label noise, report honest limitations, show failure cases |

---

## 26. Plan B: If the T+0 Brief Points Elsewhere

The architecture is a **generic decision-intelligence platform**:
`data → feature registry → detector/model plugins → policy engine → explainer → action UI → feedback → retrain`.

Only the *detectors, data scenarios and UI copy* change:

| If the brief is… | Reuse | Swap in |
|---|---|---|
| Track 02: Churn / NBA | Everything | LightGBM churn model, SHAP drivers, NBA policy rules, retention-action UI |
| Track 03: Financial health coach | Everything + Bangla i18n + LLM gateway | Cash-flow forecast (Prophet/LightGBM), savings planner (constraint solver), coach UI. LLM explains, never sells. |
| Track 04: Campaign / uplift | Registry, policy, dashboard | T-learner/X-learner uplift models (`causalml`), budget optimizer (OR-Tools), treatment/control synthetic data |
| Track 05: Merchant / agent | Graph, anomaly, dashboard | Demand/liquidity forecasting, peer benchmarking, location intelligence map |
| Track 06: Ops / service | RAG copilot, LLM gateway, case queue | Complaint classifier + topic clustering, dispute event reconstruction, routing recommender |

Decision rule at hour 0–3: **pick the problem with the clearest action after the prediction and the most measurable outcome.**

---

## 27. Master Checklists

### Before T+0 (allowed prep: general-purpose only)
- [ ] All members registered. Confirm the T+0 release time and submission channel/format.
- [ ] GitHub accounts set up, `git config user.name/email` on each laptop
- [ ] Accounts created: Render/Railway, Vercel, Neon/Supabase, Upstash, LLM provider key
- [ ] Generic templates ready (FastAPI + Next.js + Docker + CI skeleton, **not** challenge-specific). List them in DISCLOSURES.
- [ ] Learn/refresh: LightGBM, SHAP, NetworkX communities, FastAPI, RAG basics
- [ ] Screen recorder + mic tested

### At T+72 submission
- [ ] Public repo, continuous commit history, tag `v1.0-initial-submission`
- [ ] README has **all 10** Rule 6.2 items, incl. a **working live URL**
- [ ] `.env.example` with placeholders. No secrets in history.
- [ ] Video (how it works, features, AI components, real-life impact)
- [ ] Report (problem, idea, solution, features, AI approach, impact)
- [ ] DISCLOSURES.md, MODEL_CARD.md, DATA_ASSUMPTIONS.md, fairness report
- [ ] Live URL tested from a phone on mobile data (incognito)
- [ ] Submitted **≥ 2 h before** the deadline

### On-site day (7 Oct 2026)
- [ ] Hardware, hotspot, adapters, offline Docker stack
- [ ] Requirements decomposed in the first 15 min, owners assigned
- [ ] Feature-flagged changes, commits every 15–20 min, pushed before the deadline
- [ ] Code freeze 30 min before the evaluation, live URL verified
- [ ] Demo of new requirements rehearsed. Every member can explain every part.

---

### Final word
**Win condition = real problem × credible AI × measurable impact × a working live demo × clean engineering that adapts on-site.**
Build the smallest thing that answers *What happened? Why is it risky? What should upay do next?* Then make it reliable, explainable and easy to extend.
