"""Deal Engine API — ARV, MAO, Risk, Stress-Test, Exit Analysis, Approve."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db import get_supabase

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
    """Record a GO / NO-GO decision on a deal."""
    valid = {"GO", "GO_WITH_CONDITIONS", "RENEGOTIATE", "HOLD", "KILL"}
    if payload.decision not in valid:
        raise HTTPException(400, f"decision must be one of: {valid}")

    db = get_supabase()
    result = db.table("deals").update({
        "status": payload.decision,
    }).eq("deal_id", payload.deal_id).execute()

    if not result.data:
        raise HTTPException(404, "Deal not found")

    return {
        "deal_id": payload.deal_id,
        "decision": payload.decision,
        "approved_by": payload.approved_by,
        "notes": payload.notes,
    }
