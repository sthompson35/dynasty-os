"""Engine regression harness for the Dynasty AI (ATLAS) orchestrator.

Pins the exact scorecard/verdict/next-action output of the 11-engine
pipeline (backend/app/dynasty_ai/) against three captured baseline
scenarios, so a future edit to any engine's formula fails loudly here
instead of silently drifting the live /api/dynasty-ai/analyze-deal output.

The only INTENTIONAL deviation from the pre-refactor baseline is
disposition_score: it used to be a bare alias of strategy_score (a
placeholder, not real logic - see dynasty_ai/disposition_engine/
SYSTEM_PROMPT.md). It is now risk-adjusted (multiplier 1.0/0.85/0.70 for
Low/Moderate/High risk), per that same doc's documented but previously
unapplied risk-adjustment concept. Low-risk scenarios are numerically
unaffected (1.0x); the Title/Flood Risk scenario is the one case here where
disposition_score - and its downstream cascade into intake_score and
dynasty_fit_score - legitimately differs from the original baseline. That
new value is itself pinned below, not skipped, so it can't silently drift
again either.

Run with: cd backend && pytest tests/test_dynasty_ai_regression.py -v
"""
from __future__ import annotations

import pytest

from app.dynasty_ai import DynastyAIOrchestrator, DynastyAIRequest, DynastyAIResponse


def analyze(**overrides) -> DynastyAIResponse:
    return DynastyAIOrchestrator().analyze(DynastyAIRequest(**overrides))


def action_sequence(response: DynastyAIResponse) -> list[str]:
    return [action.engine for action in response.next_actions]


# ─── Scenario 1: Strong BUY ──────────────────────────────────────────────────
# Vacant, absentee-owned single-family with a wide ARV spread and low risk.

SCENARIO_1_BUY = dict(
    property_id="test-1",
    address="123 Main St",
    city="St. Louis",
    state="MO",
    property_type="single-family",
    status="prospect",
    notes="vacant, absentee owner",
    purchase_price=120000,
    arv=220000,
    repair_costs=30000,
    holding_costs=6000,
    closing_costs=4000,
    monthly_rent=1800,
    sqft=1600,
    days_on_market=20,
    vacant=True,
    absentee_owner=True,
    market="Missouri",
)


def test_scenario_1_strong_buy():
    result = analyze(**SCENARIO_1_BUY)
    sc = result.scorecard

    assert sc.lead_score == 42
    assert sc.underwriting_score == 100
    assert sc.rehab_score == 76
    assert sc.strategy_score == 88
    assert sc.capital_score == 82
    assert sc.dynasty_fit_score == 85  # "deal score"
    assert sc.risk_score == 12

    # Disposition unaffected here: risk is Low, so the risk-adjustment
    # multiplier is 1.0x - disposition_score stays equal to strategy_score,
    # same as the pre-refactor baseline.
    assert sc.disposition_score == 88

    assert result.atlas.action == "BUY"
    assert result.atlas.recommended_exit == "Fix & Flip"
    assert result.atlas.confidence == 93

    assert action_sequence(result) == ["intake", "underwriting", "strategy", "deal"]


# ─── Scenario 2: Title/Flood Risk ────────────────────────────────────────────
# Thin/negative spread, heavy rehab, title issues + flood zone -> High risk.

SCENARIO_2_TITLE_FLOOD_RISK = dict(
    property_id="test-2",
    address="456 Oak Ave",
    city="Kansas City",
    state="MO",
    property_type="single-family",
    status="prospect",
    purchase_price=180000,
    arv=190000,
    repair_costs=75000,
    holding_costs=9000,
    closing_costs=5000,
    sqft=1400,
    days_on_market=120,
    title_issues=True,
    flood_zone=True,
    contractor_secured=False,
    market="Missouri",
)


def test_scenario_2_title_flood_risk():
    result = analyze(**SCENARIO_2_TITLE_FLOOD_RISK)
    sc = result.scorecard

    assert sc.lead_score == 12
    assert sc.underwriting_score == 0
    assert sc.rehab_score == 28
    assert sc.strategy_score == 54
    assert sc.capital_score == 42
    assert sc.risk_score == 100

    # Documented disposition correction: High risk -> 0.70x multiplier on
    # strategy_score (54), not a bare alias. Was 54 (== strategy_score)
    # before the fix; 38 is the new, intentionally-corrected value.
    assert sc.disposition_score == 38

    # Cascades from the disposition fix (intake_score blends in
    # disposition_score at 20%; dynasty_fit blends in intake_score at 55%).
    # These are the CORRECTED values, not the old 14/20 baseline.
    assert sc.intake_score == 11
    assert sc.dynasty_fit_score == 19  # "deal score"

    assert result.atlas.action == "PASS"
    assert result.atlas.recommended_exit == "Owner Finance"

    # Original 7 actions in their original order, unchanged, plus the two
    # newly-real engines (investor, operations) appended at the end.
    assert action_sequence(result) == [
        "intake", "underwriting", "strategy", "capital", "rehab", "disposition", "lead",
        "investor", "operations",
    ]


# ─── Scenario 3: Land / REVIEW ───────────────────────────────────────────────
# Land parcel, lot_size >= 0.5 makes Development exit eligible; low risk.

SCENARIO_3_LAND_REVIEW = dict(
    property_id="test-3",
    address="789 County Rd",
    city="Desloge",
    state="MO",
    property_type="land",
    status="prospect",
    lot_size=2.5,
    purchase_price=40000,
    arv=90000,
    repair_costs=5000,
    holding_costs=2000,
    closing_costs=1500,
    market="Missouri",
)


def test_scenario_3_land_review():
    result = analyze(**SCENARIO_3_LAND_REVIEW)
    sc = result.scorecard

    assert sc.lead_score == 12
    assert sc.underwriting_score == 100
    assert sc.rehab_score == 90
    assert sc.strategy_score == 73
    assert sc.capital_score == 100
    assert sc.dynasty_fit_score == 70  # "deal score"
    assert sc.risk_score == 12

    # Low risk here too -> 1.0x multiplier -> unaffected by the disposition fix.
    assert sc.disposition_score == 73

    assert result.atlas.action == "REVIEW"
    assert result.atlas.recommended_exit == "Fix & Flip"

    assert action_sequence(result) == ["intake", "underwriting", "strategy"]


# ─── Cross-scenario sanity checks ────────────────────────────────────────────

@pytest.mark.parametrize(
    "payload",
    [SCENARIO_1_BUY, SCENARIO_2_TITLE_FLOOD_RISK, SCENARIO_3_LAND_REVIEW],
)
def test_engine_trace_covers_all_eleven_engines_in_pipeline_order(payload):
    result = analyze(**payload)
    assert [entry.engine for entry in result.engine_trace] == [
        "lead", "intake", "underwriting", "strategy", "deal",
        "rehab", "capital", "investor", "disposition", "operations", "portfolio",
    ]
    for entry in result.engine_trace:
        assert entry.score is not None
        assert 0 <= entry.score <= 100
        assert entry.summary
