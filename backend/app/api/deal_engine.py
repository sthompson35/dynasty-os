"""Deal Engine API — ARV, MAO, Risk, Stress-Test, Exit Analysis, Approve."""
from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db import get_supabase

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

router = APIRouter(prefix="/api/deal", tags=["Deal Engine"])


# ─── Models ──────────────────────────────────────────────────────────────────

class ARVInput(BaseModel):
    address: str
    sqft: float
    beds: float
    baths: float
    condition: str = "Average"          # Superior / Average / Below Average
    comps: list[dict] = []              # [{sale_price, sqft, beds, baths, condition}]


class MAOInput(BaseModel):
    arv: float
    repair_costs: float
    desired_profit: float = 0.0
    rule: str = "70"                    # "70" | "65" | "custom"
    custom_multiplier: float = 0.70


class RiskInput(BaseModel):
    deal_id: Optional[str] = None
    purchase_price: float
    arv: float
    repair_costs: float
    days_on_market: int = 0
    title_issues: bool = False
    flood_zone: bool = False
    permits_required: bool = True
    contractor_secured: bool = False
    market_trend: str = "Stable"        # Rising / Stable / Declining


class StressTestInput(BaseModel):
    purchase_price: float
    arv: float
    repair_costs: float
    holding_costs: float = 0.0
    closing_costs: float = 0.0
    selling_costs: float = 0.0


class ExitAnalysisInput(BaseModel):
    purchase_price: float
    arv: float
    repair_costs: float
    holding_costs: float = 0.0
    closing_costs: float = 0.0
    selling_costs: float = 0.0
    monthly_rent: float = 0.0


class DealApproveRequest(BaseModel):
    deal_id: str
    decision: str                       # GO | GO_WITH_CONDITIONS | KILL
    approved_by: str
    notes: Optional[str] = None
    investor_id: Optional[str] = None   # required when decision is GO / GO_WITH_CONDITIONS


class RiskScoreOverrides(BaseModel):
    """Optional manual overrides for the 9 risk categories (0-100 each);
    unspecified categories default to the stored risk_scores row for this
    deal, or 0 if none exists yet."""
    market_risk: Optional[int] = None
    property_risk: Optional[int] = None
    contractor_risk: Optional[int] = None
    legal_risk: Optional[int] = None
    title_risk: Optional[int] = None
    capital_risk: Optional[int] = None
    execution_risk: Optional[int] = None
    tenant_risk: Optional[int] = None
    economic_risk: Optional[int] = None


class IntelligenceRequest(BaseModel):
    target_margin: float = 0.30
    target_roi: float = 0.15
    risk_overrides: Optional[RiskScoreOverrides] = None


class IntelligenceResponse(BaseModel):
    deal_id: str
    outcome: str                    # GO | GO_WITH_CONDITIONS | RENEGOTIATE | HOLD | KILL
    outcome_label: str
    analysis: dict                  # full DealEngine.analyze() payload, passthrough
    reasoning: list[str]            # "why Charlie says this"
    analyzed_at: str
    persisted: bool                 # whether outputs were written back to Supabase


class DealCreate(BaseModel):
    property_id: Optional[str] = None
    seller: Optional[str] = None
    asking_price: Optional[float] = None
    arv: Optional[float] = None
    repairs: Optional[float] = None
    beds: Optional[float] = None
    baths: Optional[float] = None
    sqft: Optional[float] = None
    rent: Optional[float] = None
    taxes: Optional[float] = None
    insurance: Optional[float] = None
    zoning: Optional[str] = None
    flood_status: Optional[str] = None
    title_status: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _arv_from_comps(subject_sqft: float, comps: list[dict]) -> float:
    """Weighted average $/sqft from comps, adjusted by condition."""
    if not comps:
        return 0.0
    adjustments = {"Superior": 0.97, "Similar": 1.0, "Inferior": 1.04}
    price_per_sqfts = []
    for c in comps:
        sp = float(c.get("sale_price", 0))
        sq = float(c.get("sqft", 1))
        cond = c.get("condition", "Similar")
        adj = adjustments.get(cond, 1.0)
        price_per_sqfts.append((sp / sq) * adj if sq > 0 else 0)
    avg_ppsf = sum(price_per_sqfts) / len(price_per_sqfts)
    return round(avg_ppsf * subject_sqft, 2)


def _risk_components(
    roi: float, pp: float, arv: float, repair: float,
    dom: int, title: bool, flood: bool, permits: bool,
    contractor: bool, trend: str,
) -> dict:
    market   = 15 if trend == "Declining" else (5 if trend == "Stable" else 0)
    property_ = 20 if flood else (10 if dom > 90 else 5)
    legal    = 25 if title else 0
    capital  = 20 if roi < 0.10 else (10 if roi < 0.20 else 0)
    exec_    = 15 if not contractor else (5 if not permits else 0)
    total    = min(market + property_ + legal + capital + exec_, 100)
    level    = "CRITICAL" if total >= 75 else "HIGH" if total >= 50 else "MODERATE" if total >= 25 else "LOW"
    return {
        "market_risk": market, "property_risk": property_, "legal_risk": legal,
        "capital_risk": capital, "execution_risk": exec_,
        "total_score": total, "risk_level": level,
    }


# ─── Charlie Deal Intelligence helpers ──────────────────────────────────────

_RISK_CATEGORIES = [
    "market_risk", "property_risk", "contractor_risk", "legal_risk",
    "title_risk", "capital_risk", "execution_risk", "tenant_risk", "economic_risk",
]

_EXIT_PROFIT_KEYS = {
    "Wholesale": "wholesale_profit", "Flip": "flip_profit", "BRRRR": "brrrr_cash_returned",
    "Rental": "rental_cash_flow_annual", "Development": "development_profit",
}

_OUTCOME_SUMMARY = {
    "GO": "All checks passed — Charlie recommends proceeding to acquisition.",
    "GO_WITH_CONDITIONS": "Elevated risk profile — Charlie recommends proceeding only with "
                           "risk mitigation (e.g. contractor secured, title cleared) before close.",
    "RENEGOTIATE": "Price exceeds MAO and risk is elevated — Charlie recommends renegotiating "
                    "price or terms before proceeding.",
    "HOLD": "Deal is inconclusive under current numbers — Charlie recommends holding for "
            "better comps, updated repair estimate, or market conditions.",
    "KILL": "Deal does not meet Dynasty OS minimum criteria — Charlie recommends killing this deal.",
}

# Mirrors TrooperCharlie._label() (dynasty_os/ai_troopers/trooper_charlie.py)
# so GET /intelligence can produce the same short label without needing a
# live TrooperCharlie instance for a read-only reconstruction.
_OUTCOME_LABELS = {
    "GO": "Deal approved — execute acquisition",
    "GO_WITH_CONDITIONS": "Deal approved with risk mitigation conditions",
    "RENEGOTIATE": "Price/terms need renegotiation",
    "HOLD": "Hold for market conditions or further analysis",
    "KILL": "Deal does not meet Dynasty OS criteria",
}


def _outcome_label(outcome: str) -> str:
    return _OUTCOME_LABELS.get(outcome, outcome)


# StrategyEngine.process() constants (dynasty_os/engines/deal_engine) — timeline
# and risk are static per strategy name, not deal-dependent, so they can be
# reconstructed exactly on read. capital_required is deal-dependent but uses
# the exact same formulas as StrategyEngine, given the same deal inputs.
def _reconstruct_strategy_ranking(exit_row: dict[str, Any], asking_price: float, repairs: float) -> dict[str, Any]:
    strategies = [
        {"strategy": "Wholesale", "profit": exit_row.get("wholesale_profit"), "timeline_months": 1,
         "capital_required": 5000, "risk": "LOW"},
        {"strategy": "Flip", "profit": exit_row.get("flip_profit"), "timeline_months": 6,
         "capital_required": repairs + asking_price * 0.25, "risk": "MODERATE"},
        {"strategy": "BRRRR", "profit": exit_row.get("brrrr_cash_returned"), "timeline_months": 8,
         "capital_required": repairs + asking_price * 0.20, "risk": "MODERATE"},
        {"strategy": "Rental", "profit": exit_row.get("rental_cash_flow"), "timeline_months": 24,
         "capital_required": asking_price * 0.25 + repairs, "risk": "LOW"},
        {"strategy": "Development", "profit": exit_row.get("development_profit"), "timeline_months": 18,
         "capital_required": asking_price + repairs * 2, "risk": "HIGH"},
    ]
    ranked = sorted(
        [s for s in strategies if s["profit"] is not None],
        key=lambda s: s["profit"], reverse=True,
    )
    return {
        "deal_id": None,
        "ranked_strategies": ranked,
        "recommended": ranked[0]["strategy"] if ranked else "None",
    }

# risk_scores.risk_level is uppercase (LOW/MODERATE/HIGH/CRITICAL); projects.risk_score
# is Title Case (Low/Moderate/High/Critical) — mismatch would silently fail the
# projects CHECK constraint on sync.
_RISK_LEVEL_TO_OPS_LABEL = {
    "LOW": "Low", "MODERATE": "Moderate", "HIGH": "High", "CRITICAL": "Critical",
}


def _risk_score_to_ops_label(risk_level: Optional[str]) -> str:
    return _RISK_LEVEL_TO_OPS_LABEL.get((risk_level or "").upper(), "Low")


def _deal_row_to_dealdata_dict(row: dict[str, Any], payload: "IntelligenceRequest") -> dict[str, Any]:
    """Map a Supabase `deals` row (with nested risk_scores(*) from the select)
    into the flat dict TrooperCharlie.analyze_deal() expects."""
    existing_risk_rows = row.get("risk_scores") or []
    existing_risk = existing_risk_rows[0] if isinstance(existing_risk_rows, list) and existing_risk_rows else (
        existing_risk_rows if isinstance(existing_risk_rows, dict) else {}
    )

    overrides = payload.risk_overrides.model_dump() if payload.risk_overrides else {}
    risk_scores = {
        cat: overrides.get(cat) if overrides.get(cat) is not None
        else existing_risk.get(cat) if existing_risk.get(cat) is not None
        else 0
        for cat in _RISK_CATEGORIES
    }

    # row.get(key, default) only falls back when the key is *absent* — a
    # Supabase NULL column still comes through as an explicit `None` value,
    # which `.get()` happily returns instead of the default. Every numeric
    # field must be coalesced explicitly or TrooperCharlie's float(...) calls
    # blow up on the first NULL column.
    def num(key: str) -> float:
        return row.get(key) if row.get(key) is not None else 0

    def text(key: str, default: str = "") -> str:
        return row.get(key) if row.get(key) is not None else default

    return {
        "deal_id": text("deal_id"),
        "property_id": text("property_id"),
        "seller": text("seller"),
        "asking_price": num("asking_price"),
        "arv": num("arv"),
        "repairs": num("repairs"),
        "beds": num("beds"),
        "baths": num("baths"),
        "sqft": num("sqft"),
        "rent": num("rent"),
        "taxes": num("taxes"),
        "insurance": num("insurance"),
        "zoning": text("zoning"),
        "flood_status": text("flood_status", "Unknown"),
        "title_status": text("title_status", "Unknown"),
        "risk_scores": risk_scores,
        "target_margin": payload.target_margin,
        "target_roi": payload.target_roi,
    }


def _build_reasoning(analysis: dict[str, Any]) -> list[str]:
    """Deterministic 'why Charlie says this' text, one sentence per decision
    point, following the same reasoning.append() pattern as score_lead()."""
    reasoning: list[str] = []
    acq = analysis.get("acquisition", {})
    risk = analysis.get("risk", {})
    stress = analysis.get("stress_test", {})
    kill = analysis.get("kill_switch", {})
    exit_ = analysis.get("exit", {})

    if acq.get("meets_mao"):
        reasoning.append(
            f"Asking price (${acq.get('asking_price', 0):,.0f}) is at or below MAO "
            f"(${acq.get('mao', 0):,.0f}) — deal has built-in margin."
        )
    else:
        spread = acq.get("asking_price", 0) - acq.get("mao", 0)
        reasoning.append(
            f"Asking price (${acq.get('asking_price', 0):,.0f}) exceeds MAO "
            f"(${acq.get('mao', 0):,.0f}) by ${spread:,.0f} — seller is asking more than "
            f"the {int(acq.get('target_margin', 0.3) * 100)}% margin target allows."
        )

    level = risk.get("risk_level")
    if level in ("HIGH", "CRITICAL"):
        reasoning.append(
            f"Risk score is {risk.get('total_score')} ({level}) — "
            f"above the threshold for an unconditional GO."
        )
    elif level == "LOW":
        reasoning.append(f"Risk score is {risk.get('total_score')} (LOW) — no elevated risk factors.")
    else:
        reasoning.append(f"Risk score is {risk.get('total_score')} (MODERATE) — within acceptable range.")

    if stress.get("passes_stress_test"):
        reasoning.append(
            f"Deal survives stress testing: worst-case ROI is "
            f"{stress.get('worst_case_roi', 0) * 100:.1f}%, above the "
            f"{stress.get('target_roi', 0) * 100:.0f}% target."
        )
    else:
        reasoning.append(
            f"Deal fails stress testing: worst-case ROI is "
            f"{stress.get('worst_case_roi', 0) * 100:.1f}%, below the "
            f"{stress.get('target_roi', 0) * 100:.0f}% target — a 20% ARV drop or "
            f"25% repair overrun would erase the margin."
        )

    if kill.get("decision") == "KILL":
        failed = ", ".join(kill.get("failed_checks", []))
        reasoning.append(
            f"KILL SWITCH TRIPPED: {kill.get('fail_count')} critical checks failed "
            f"({failed}) — automatic kill threshold is 3."
        )

    if exit_.get("recommended_exit"):
        profit_key = _EXIT_PROFIT_KEYS.get(exit_["recommended_exit"])
        reasoning.append(
            f"Best exit strategy is {exit_['recommended_exit']} "
            f"(${exit_.get(profit_key, 0):,.0f} projected profit)."
        )

    outcome = analysis.get("outcome")
    reasoning.append(_OUTCOME_SUMMARY.get(outcome, f"Outcome: {outcome}"))
    return reasoning


def _persist_analysis(db, deal_id: str, analysis: dict[str, Any], outcome: str) -> None:
    """Upsert DealEngine.analyze() output back into the same tables
    GET /api/deal/{deal_id} already joins against, so Charlie's numbers show
    up there with zero changes to that route."""
    acq = analysis.get("acquisition", {})
    financing = analysis.get("financing", {})
    risk = analysis.get("risk", {})
    exit_ = analysis.get("exit", {})
    stress = analysis.get("stress_test", {})

    db.table("property_analysis").upsert({
        "deal_id": deal_id,
        "mao": acq.get("mao"),
        "target_margin": acq.get("target_margin"),
    }, on_conflict="deal_id").execute()

    db.table("underwriting").upsert({
        "deal_id": deal_id,
        "cash_needed": financing.get("cash_needed"),
        "closing_costs": financing.get("closing_costs"),
        "holding_costs": financing.get("holding_cost_est"),
        "interest_rate": financing.get("interest_rate"),
        "profit": stress.get("base_profit"),
    }, on_conflict="deal_id").execute()

    def as_int(value: Any) -> Optional[int]:
        return int(round(value)) if value is not None else None

    db.table("risk_scores").upsert({
        "deal_id": deal_id,
        **{cat: as_int(risk.get("category_scores", {}).get(cat)) for cat in _RISK_CATEGORIES},
        # RiskEngine.total_score is an average (e.g. 60.0), but the column is INT.
        "total_score": as_int(risk.get("total_score")),
        "risk_level": risk.get("risk_level"),
    }, on_conflict="deal_id").execute()

    db.table("exit_models").upsert({
        "deal_id": deal_id,
        "wholesale_profit": exit_.get("wholesale_profit"),
        "flip_profit": exit_.get("flip_profit"),
        "rental_equity": exit_.get("rental_equity"),
        "rental_cash_flow": exit_.get("rental_cash_flow_annual"),  # column has no _annual suffix
        "brrrr_cash_returned": exit_.get("brrrr_cash_returned"),
        "development_profit": exit_.get("development_profit"),
        "recommended_exit": exit_.get("recommended_exit"),
    }, on_conflict="deal_id").execute()

    db.table("stress_tests").upsert({
        "deal_id": deal_id,
        "arv_drop_10_profit": stress.get("arv_drop_10_profit"),
        "arv_drop_20_profit": stress.get("arv_drop_20_profit"),
        "repairs_up_15_profit": stress.get("repairs_up_15_profit"),
        "repairs_up_25_profit": stress.get("repairs_up_25_profit"),
        "hold_time_doubled_profit": stress.get("hold_time_doubled_profit"),
        "worst_case_roi": stress.get("worst_case_roi"),
        "target_roi": stress.get("target_roi"),
        "passes_stress_test": stress.get("passes_stress_test"),
    }, on_conflict="deal_id").execute()

    db.table("deals").update({"status": outcome}).eq("deal_id", deal_id).execute()


def _sync_to_capital(db, deal: dict[str, Any], investor_id: str) -> tuple[Optional[dict], Optional[str]]:
    try:
        underwriting = db.table("underwriting").select("cash_needed").eq(
            "deal_id", deal["deal_id"]
        ).maybe_single().execute()
        amount = (underwriting.data or {}).get("cash_needed") or deal.get("asking_price") or 0
        result = db.table("commitments").insert({
            "investor_id": investor_id,
            "deal_id": deal["deal_id"],
            "amount": amount,
            "status": "Pending",
        }).execute()
        return (result.data[0] if result.data else None), None
    except Exception as exc:  # noqa: BLE001 - fan-out step must not raise
        return None, f"Capital sync failed: {exc}"


def _sync_to_operations(db, deal: dict[str, Any], risk_level: Optional[str]) -> tuple[Optional[dict], Optional[str]]:
    try:
        underwriting = db.table("underwriting").select("closing_costs,holding_costs").eq(
            "deal_id", deal["deal_id"]
        ).maybe_single().execute()
        uw = underwriting.data or {}
        budget = (uw.get("closing_costs") or 0) + (uw.get("holding_costs") or 0) + (deal.get("repairs") or 0)
        result = db.table("projects").insert({
            "deal_id": deal["deal_id"],
            "property_id": deal.get("property_id"),
            "status": "Planning",
            "budget": budget,
            "actual_cost": 0,
            "completion_percent": 0,
            "risk_score": _risk_score_to_ops_label(risk_level),
        }).execute()
        return (result.data[0] if result.data else None), None
    except Exception as exc:  # noqa: BLE001
        return None, f"Operations (Rehab) sync failed: {exc}"


def _sync_to_disposition(db, deal: dict[str, Any]) -> tuple[Optional[dict], Optional[str]]:
    try:
        result = db.table("property_marketing").insert({
            "property_id": deal.get("property_id"),
            "channels": [],
            "assets": {},
            "status": "Draft",
        }).execute()
        return (result.data[0] if result.data else None), None
    except Exception as exc:  # noqa: BLE001
        return None, f"Disposition sync failed: {exc}"


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("")
def list_deals(
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    db = get_supabase()
    q = db.table("deals").select(
        "*, risk_scores(risk_level, total_score), exit_models(recommended_exit), stress_tests(passes_stress_test)"
    )
    if status:
        q = q.eq("status", status)
    result = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"deals": result.data or [], "offset": offset}


@router.post("", status_code=201)
def create_deal(payload: DealCreate):
    db = get_supabase()
    result = db.table("deals").insert(payload.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create deal")
    return result.data[0]


@router.get("/{deal_id}")
def get_deal(deal_id: UUID):
    db = get_supabase()
    result = db.table("deals").select(
        "*, property_analysis(*), underwriting(*), risk_scores(*), exit_models(*), stress_tests(*)"
    ).eq("deal_id", str(deal_id)).single().execute()
    if not result.data:
        raise HTTPException(404, "Deal not found")
    return result.data


@router.post("/{deal_id}/analyze", response_model=IntelligenceResponse)
def analyze_deal_intelligence(deal_id: UUID, payload: IntelligenceRequest = IntelligenceRequest()):
    """Run the full Charlie/DealEngine brain against a saved deal and persist
    the results. This is what the Intelligence Panel calls on 'Run Analysis'."""
    db = get_supabase()
    row = db.table("deals").select("*, risk_scores(*)").eq("deal_id", str(deal_id)).single().execute()
    if not row.data:
        raise HTTPException(404, "Deal not found")

    deal_data = _deal_row_to_dealdata_dict(row.data, payload)

    from dynasty_os.ai_troopers.trooper_charlie import TrooperCharlie
    charlie = TrooperCharlie()
    result = charlie.analyze_deal(deal_data)

    reasoning = _build_reasoning(result["analysis"])
    _persist_analysis(db, str(deal_id), result["analysis"], result["outcome"])

    return IntelligenceResponse(
        deal_id=str(deal_id),
        outcome=result["outcome"],
        outcome_label=result["outcome_label"],
        analysis=result["analysis"],
        reasoning=reasoning,
        analyzed_at=result["analyzed_at"],
        persisted=True,
    )


@router.get("/{deal_id}/intelligence", response_model=IntelligenceResponse)
def get_deal_intelligence(deal_id: UUID):
    """Read-only: reconstruct the most recently persisted Charlie analysis for
    a deal from Supabase, without re-running the engine. Used on Panel page
    load so navigating to the Panel does not silently mutate stored numbers."""
    db = get_supabase()
    row = db.table("deals").select(
        "*, property_analysis(*), underwriting(*), risk_scores(*), exit_models(*), stress_tests(*)"
    ).eq("deal_id", str(deal_id)).single().execute()
    if not row.data:
        raise HTTPException(404, "Deal not found")

    d = row.data
    prop_analysis = (d.get("property_analysis") or [{}])[0] if isinstance(d.get("property_analysis"), list) else (d.get("property_analysis") or {})
    underwriting = (d.get("underwriting") or [{}])[0] if isinstance(d.get("underwriting"), list) else (d.get("underwriting") or {})
    risk = (d.get("risk_scores") or [{}])[0] if isinstance(d.get("risk_scores"), list) else (d.get("risk_scores") or {})
    exit_ = (d.get("exit_models") or [{}])[0] if isinstance(d.get("exit_models"), list) else (d.get("exit_models") or {})
    stress = (d.get("stress_tests") or [{}])[0] if isinstance(d.get("stress_tests"), list) else (d.get("stress_tests") or {})

    if not risk and not exit_:
        raise HTTPException(404, "No Charlie analysis has been run for this deal yet — POST /analyze first")

    analysis = {
        "deal_id": str(deal_id),
        "outcome": d.get("status"),
        "acquisition": {
            "mao": prop_analysis.get("mao"),
            "target_margin": prop_analysis.get("target_margin"),
            "asking_price": d.get("asking_price"),
            "meets_mao": (d.get("asking_price") or 0) <= (prop_analysis.get("mao") or 0),
        },
        "financing": underwriting,
        "risk": risk,
        "exit": exit_,
        "strategy": _reconstruct_strategy_ranking(
            exit_, float(d.get("asking_price") or 0), float(d.get("repairs") or 0)
        ),
        "stress_test": stress,
        "kill_switch": {"decision": "KILL" if d.get("status") == "KILL" else "CONTINUE"},
    }
    reasoning = _build_reasoning(analysis)

    return IntelligenceResponse(
        deal_id=str(deal_id),
        outcome=d.get("status", "PENDING"),
        outcome_label=_outcome_label(d.get("status", "PENDING")),
        analysis=analysis,
        reasoning=reasoning,
        analyzed_at=datetime.utcnow().isoformat(),
        persisted=True,
    )


@router.get("/{deal_id}/investor-matches")
def get_investor_matches(deal_id: UUID):
    """Candidate investors for the Approve-flow picker, using the same
    matching rule as InvestorEngine (available_capital >= 20% of asking price)."""
    db = get_supabase()
    deal_row = db.table("deals").select("*").eq("deal_id", str(deal_id)).single().execute()
    if not deal_row.data:
        raise HTTPException(404, "Deal not found")

    investors_rows = db.table("investors").select("*").execute()
    investors = investors_rows.data or []

    from dynasty_os.engines.deal_engine import DealData, InvestorEngine

    deal = DealData(
        deal_id=str(deal_id),
        property_id=deal_row.data.get("property_id", ""),
        seller=deal_row.data.get("seller", ""),
        asking_price=float(deal_row.data.get("asking_price") or 0),
        arv=float(deal_row.data.get("arv") or 0),
        repairs=float(deal_row.data.get("repairs") or 0),
    )
    exit_row = db.table("exit_models").select("flip_profit").eq("deal_id", str(deal_id)).maybe_single().execute()
    profit = (exit_row.data or {}).get("flip_profit") or 0

    match = InvestorEngine().process(deal, profit, investors)
    matched_ids = set(match["investors"])
    return {
        "deal_id": str(deal_id),
        "matched_investors": [inv for inv in investors if inv.get("investor_id") in matched_ids],
        "all_investors": investors,
    }


@router.post("/arv")
def calculate_arv(payload: ARVInput):
    """Calculate ARV from provided comps using $/sqft methodology."""
    estimated = _arv_from_comps(payload.sqft, payload.comps)
    if not payload.comps:
        return {
            "arv": None,
            "method": "No comps provided",
            "comps_used": 0,
        }
    return {
        "arv": estimated,
        "price_per_sqft": round(estimated / payload.sqft, 2) if payload.sqft else 0,
        "comps_used": len(payload.comps),
        "method": "Weighted $/sqft — condition-adjusted",
        "subject": {"address": payload.address, "sqft": payload.sqft},
    }


@router.post("/mao")
def calculate_mao(payload: MAOInput):
    """Calculate Maximum Allowable Offer."""
    multipliers = {"70": 0.70, "65": 0.65}
    mult = multipliers.get(payload.rule, payload.custom_multiplier)

    mao_standard = payload.arv * mult - payload.repair_costs
    mao_with_profit = payload.arv * mult - payload.repair_costs - payload.desired_profit

    return {
        "mao": round(mao_standard, 2),
        "mao_with_desired_profit": round(mao_with_profit, 2),
        "rule_used": f"{int(mult * 100)}% Rule",
        "arv": payload.arv,
        "repair_costs": payload.repair_costs,
        "desired_profit": payload.desired_profit,
        "all_in_max": round(payload.arv * mult, 2),
    }


@router.post("/risk")
def score_risk(payload: RiskInput):
    """Multi-factor risk score for a deal."""
    total_cost = payload.purchase_price + payload.repair_costs
    roi = (payload.arv - total_cost) / total_cost if total_cost else 0

    components = _risk_components(
        roi, payload.purchase_price, payload.arv, payload.repair_costs,
        payload.days_on_market, payload.title_issues, payload.flood_zone,
        payload.permits_required, payload.contractor_secured, payload.market_trend,
    )

    if payload.deal_id:
        try:
            db = get_supabase()
            db.table("risk_scores").upsert(
                {"deal_id": payload.deal_id, **components},
                on_conflict="deal_id",
            ).execute()
        except Exception:
            pass

    return {"deal_id": payload.deal_id, **components}


@router.post("/stress-test")
def stress_test(payload: StressTestInput):
    """Run 5 stress scenarios against a deal."""
    pp  = payload.purchase_price
    arv = payload.arv
    rep = payload.repair_costs
    hld = payload.holding_costs
    cls = payload.closing_costs
    sll = payload.selling_costs

    base_cost = pp + rep + hld + cls + sll

    def scenario(arv_mult: float = 1.0, rep_mult: float = 1.0, hld_mult: float = 1.0) -> dict:
        s_arv = arv * arv_mult
        s_rep = rep * rep_mult
        s_hld = hld * hld_mult
        s_total = pp + s_rep + s_hld + cls + sll
        s_profit = s_arv - s_total - s_arv * 0.06
        s_roi = s_profit / s_total if s_total else 0
        return {
            "profit": round(s_profit, 2),
            "roi": round(s_roi, 4),
            "passes": s_roi >= 0.20,
        }

    arv_10 = scenario(0.90)
    arv_20 = scenario(0.80)
    rep_15 = scenario(1.0, 1.15)
    rep_25 = scenario(1.0, 1.25)
    worst  = scenario(0.80, 1.25, 2.0)

    return {
        "base_profit": round(arv - base_cost - arv * 0.06, 2),
        "arv_drop_10pct": arv_10,
        "arv_drop_20pct": arv_20,
        "repairs_up_15pct": rep_15,
        "repairs_up_25pct": rep_25,
        "worst_case": worst,
        "passes_all": all(s["passes"] for s in [arv_10, arv_20, rep_15, rep_25]),
        "worst_case_roi": worst["roi"],
    }


@router.post("/exit-analysis")
def exit_analysis(payload: ExitAnalysisInput):
    """Model all exit strategies and return ranked disposition matrix."""
    pp    = payload.purchase_price
    arv   = payload.arv
    rep   = payload.repair_costs
    hld   = payload.holding_costs
    cls   = payload.closing_costs
    sll   = payload.selling_costs
    rent  = payload.monthly_rent

    total = pp + rep + hld + cls + sll

    wholesale_fee  = max(0, arv * 0.70 - rep - pp)
    flip_profit    = max(0, arv - total - arv * 0.06)
    brrrr_refi     = max(0, arv * 0.75 - total)
    rental_annual  = max(0, rent * 12 - total * 0.012) if rent else max(0, arv * 0.009 * 12 - total * 0.012)
    dev_profit     = max(0, arv * 1.45 - total)
    subject_to     = max(0, arv * 0.85 - total)

    strategies = [
        {"strategy": "Wholesale",      "profit": round(wholesale_fee), "timeline": "1–4 weeks",    "risk": "Low",     "roi": round(wholesale_fee / total, 4) if total else 0},
        {"strategy": "Fix & Flip",     "profit": round(flip_profit),   "timeline": "3–6 months",   "risk": "Moderate","roi": round(flip_profit / total, 4) if total else 0},
        {"strategy": "BRRRR",          "profit": round(brrrr_refi),    "timeline": "6–12 months",  "risk": "Moderate","roi": round(brrrr_refi / total, 4) if total else 0},
        {"strategy": "Hold / Rental",  "profit": round(rental_annual), "timeline": "Long-term",    "risk": "Low",     "roi": round(rental_annual / total, 4) if total else 0},
        {"strategy": "Subject-To",     "profit": round(subject_to),    "timeline": "2–8 weeks",    "risk": "Low",     "roi": round(subject_to / total, 4) if total else 0},
        {"strategy": "Development",    "profit": round(dev_profit),    "timeline": "12–36 months", "risk": "Highest", "roi": round(dev_profit / total, 4) if total else 0},
    ]

    ranked = sorted(strategies, key=lambda x: x["profit"], reverse=True)
    for i, s in enumerate(ranked):
        s["rank"] = i + 1
        s["recommended"] = i == 0

    return {
        "total_cost": round(total, 2),
        "arv": arv,
        "strategies": ranked,
        "best_exit": ranked[0]["strategy"],
        "best_profit": ranked[0]["profit"],
    }


@router.post("/approve")
def approve_deal(payload: DealApproveRequest):
    """Record a GO / NO-GO decision on a deal. On GO / GO_WITH_CONDITIONS,
    fans out into Capital (commitments), Operations/Rehab (projects), and
    Disposition (property_marketing). Each sync step is independent and
    non-blocking — a failure in one does not roll back the approval or
    prevent the others from running."""
    valid = {"GO", "GO_WITH_CONDITIONS", "RENEGOTIATE", "HOLD", "KILL"}
    if payload.decision not in valid:
        raise HTTPException(400, f"decision must be one of: {valid}")

    syncs_on_approve = payload.decision in ("GO", "GO_WITH_CONDITIONS")
    if syncs_on_approve and not payload.investor_id:
        raise HTTPException(
            400,
            "investor_id is required when decision is GO or GO_WITH_CONDITIONS — "
            "select an investor from GET /api/deal/{deal_id}/investor-matches first.",
        )

    db = get_supabase()
    result = db.table("deals").update({
        "status": payload.decision,
    }).eq("deal_id", payload.deal_id).execute()

    if not result.data:
        raise HTTPException(404, "Deal not found")

    deal = result.data[0]
    sync_results: dict[str, Optional[dict]] = {"capital": None, "operations": None, "disposition": None}
    sync_errors: list[str] = []

    if syncs_on_approve:
        # Nothing about a re-submitted GO/GO_WITH_CONDITIONS approval (a double
        # click, a page refresh replaying the request, etc.) is idempotent by
        # default — _sync_to_* all do plain inserts, so re-running them would
        # create duplicate commitments/projects/marketing rows for the same
        # deal. Guard on the one sync step that's easy to check cheaply.
        existing_commitment = db.table("commitments").select("*").eq(
            "deal_id", payload.deal_id
        ).limit(1).execute()

        if existing_commitment.data:
            existing_project = db.table("projects").select("*").eq(
                "deal_id", payload.deal_id
            ).limit(1).execute()
            existing_marketing = db.table("property_marketing").select("*").eq(
                "property_id", deal.get("property_id")
            ).limit(1).execute()
            sync_results["capital"] = existing_commitment.data[0]
            sync_results["operations"] = (existing_project.data or [None])[0]
            sync_results["disposition"] = (existing_marketing.data or [None])[0]
            sync_errors.append(
                "This deal was already approved and synced previously — showing the "
                "existing Capital/Operations/Disposition records instead of creating new ones."
            )
            syncs_on_approve = False  # already handled, skip the fan-out below

    if syncs_on_approve:
        risk_row = db.table("risk_scores").select("risk_level").eq(
            "deal_id", payload.deal_id
        ).maybe_single().execute()
        risk_level = (risk_row.data or {}).get("risk_level")

        sync_results["capital"], err = _sync_to_capital(db, deal, payload.investor_id)
        if err:
            sync_errors.append(err)

        sync_results["operations"], err = _sync_to_operations(db, deal, risk_level)
        if err:
            sync_errors.append(err)

        sync_results["disposition"], err = _sync_to_disposition(db, deal)
        if err:
            sync_errors.append(err)

    try:
        from app.api.automation import AutomationEvent, log_automation_event
        log_automation_event(AutomationEvent(
            event="deal_approved",
            trigger="manual",
            payload={
                "deal_id": payload.deal_id,
                "decision": payload.decision,
                "approved_by": payload.approved_by,
                "sync_errors": sync_errors,
            },
        ))
    except Exception:  # noqa: BLE001 - audit log must never block approval
        pass

    return {
        "deal_id": payload.deal_id,
        "decision": payload.decision,
        "approved_by": payload.approved_by,
        "notes": payload.notes,
        "sync": sync_results,
        "sync_errors": sync_errors,
    }
