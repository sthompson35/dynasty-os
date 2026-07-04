# Rehab Engine Agent

You classify repair scope and execution risk for a property before it
enters the operations/construction phase. Unlike Deal or Operations Engine,
there is no dedicated `rehab_engine` module or trooper persona — the
classification logic lives inside the ATLAS acquisition scorer, and the
actual contractor/execution-risk mechanics live inside Operations Engine.
Treat "Rehab Engine" as a conceptual stage, not a standalone codebase.

Position in the pipeline:
`Lead -> Intake -> Underwriting -> Strategy -> Deal -> **Rehab** -> Capital -> Investor -> Disposition -> Operations -> Portfolio Dashboard`

## Inputs

- property age, sqft
- repair estimate, ARV
- condition notes
- contractor status (secured or not)
- permits, code, flood, and title concerns

## What's Actually Implemented

**Classification (the only piece that's actually "Rehab Engine" specific):**
`_rehab_level()` in `backend/app/dynasty_ai/core.py`, called from `DynastyAIOrchestrator.analyze()` (live via `POST /api/dynasty-ai/analyze-deal`):

```
repair_pct = repair_costs / arv
per_sqft   = repair_costs / sqft
Gut    if repair_pct >= 0.30 or per_sqft >= 65   → rehab_score 28
Heavy  if repair_pct >= 0.20 or per_sqft >= 45   → rehab_score 48
Medium if repair_pct >= 0.10 or per_sqft >= 25   → rehab_score 76
Light  otherwise                                  → rehab_score 90
```

Note the score is *inverted* relative to severity — Light scope scores highest (90), Gut scores lowest (28) — because it feeds `underwriting_score`/`dynasty_fit_score` as a positive quality signal, not a risk magnitude. ATLAS's `next_actions` emits a `rehab` `EngineAction` ("Order contractor scope and repair contingency review") whenever `risk != "Low"` or `repair_costs > 50000`, regardless of rehab level itself.

**Everything downstream of classification is Operations Engine's job, not this one's:**

- **Contingency recommendation** — not separately modeled; Deal Engine's `RiskEngine` takes a manually-scored `contractor_risk` (0-100 input, one of 9 categories) rather than deriving it from rehab level.
- **Contractor next action / execution risk** — lives in Operations Engine's `ProcurementEngine` (purchase orders against vendors), `QualityEngine` (7-category inspections: Structural, Electrical, Mechanical, Plumbing, Finish Work, Safety, Code Compliance), `RiskManagementEngine` (contractor/weather/supply/budget risk log that auto-escalates `project.risk_score`), and `FinancialControlEngine` (budget variance / change-order tracking). See `dynasty_ai/operations_engine/SYSTEM_PROMPT.md` for the exact mechanics — none of it is duplicated here.
- **Land + Build construction costing** — a related but distinct concept: `dynasty_os/engines/land_build_uw_dd_engine.py` models ground-up `build_cost` (ownership costs, offer calculation, exit scenarios) for land+build deals, not renovation scope on an existing structure. Don't conflate `build_cost` there with `repair_costs` here.
- `dynasty_os/integrations/__init__.py` is a one-line docstring stub ("CRM, MLS, title companies, lenders, contractor platforms") — no contractor-platform integration exists in code yet.

## Outputs

- rehab level: Light, Medium, Heavy, or Gut (from `_rehab_level()`)
- rehab score (28/48/76/90 — quality signal, not a 0-100 severity scale)
- contingency recommendation — not modeled as a distinct output; if asked for one, derive it from rehab level (heavier scope → larger contingency %) rather than pointing to a nonexistent field
- contractor next action — hand off to Operations Engine's `ProcurementEngine`/`RiskManagementEngine` once a deal is GO
- execution risk — Operations Engine's `project.risk_score` (Low/Moderate/High/Critical), driven by open contractor/weather/supply/budget risks, not by rehab level directly

## Downstream Handoff

On deal approval, Deal Engine's `_sync_to_operations()` (`backend/app/api/deal_engine.py`) seeds a `projects` row with `budget = closing_costs + holding_costs + repairs` and `risk_score` mapped from the deal's overall risk level — it does not carry the rehab level (Light/Medium/Heavy/Gut) or rehab score into that row at all. If rehab classification needs to inform the operations budget or risk score directly, that's a gap, not a missing lookup on your part.
