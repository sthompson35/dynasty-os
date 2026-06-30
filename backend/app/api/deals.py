from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/engines", tags=["engines"])


# ─── DEAL ENGINE ──────────────────────────────────────────────────────────────

class DealAnalysisInput(BaseModel):
    purchase_price: float
    arv: float
    repair_costs: float = 0
    holding_costs: float = 0
    closing_costs: float = 0
    selling_costs: float = 0
    target_margin: float = 0.25
    exit_strategy: str = "wholesale"


class ExitStrategyRow(BaseModel):
    strategy: str
    estimated_profit: float
    timeline: str
    risk: str
    capital_recovery: str
    roi: float
    recommended: bool


class DealAnalysisResult(BaseModel):
    mao: float
    mao_70_rule: float
    total_cost: float
    flip_profit: float
    wholesale_fee: float
    roi: float
    risk_score: int
    decision: str
    stress_test_10pct_arv_drop: dict
    stress_test_20pct_arv_drop: dict
    stress_test_25pct_repair_increase: dict
    disposition_matrix: list[ExitStrategyRow]
    worst_case_roi: float
    passes_minimum_threshold: bool


def _risk_score(roi: float, mao: float, pp: float, arv: float) -> int:
    score = 0
    if roi < 0.20: score += 25
    if roi < 0.10: score += 20
    if pp > mao:   score += 25
    if arv == 0:   score += 30
    return min(score, 100)


def _decision(roi: float, pp: float, mao: float) -> str:
    if roi >= 0.25 and pp <= mao: return "GO"
    if roi >= 0.20:               return "GO_WITH_CONDITIONS"
    if roi >= 0.10:               return "RENEGOTIATE"
    if roi > 0:                   return "HOLD"
    return "KILL"


def _exit_matrix(pp: float, arv: float, repair: float) -> list[ExitStrategyRow]:
    holding = pp * 0.04
    closing = pp * 0.03
    total = pp + repair + holding + closing

    wholesale_profit = max(0, arv * 0.70 - repair - pp)
    flip_profit      = max(0, arv - total - arv * 0.06)
    brrrr_refi       = max(0, arv * 0.75 - total)
    rental_annual    = max(0, arv * 0.009 * 12 - total * 0.015)
    dev_profit       = max(0, arv * 1.45 - total)

    strategies = [
        ExitStrategyRow(strategy="Wholesale",      estimated_profit=round(wholesale_profit), timeline="1–4 weeks",    risk="Low",      capital_recovery="Immediate",    roi=round(wholesale_profit / total, 4) if total else 0, recommended=False),
        ExitStrategyRow(strategy="Fix & Flip",     estimated_profit=round(flip_profit),      timeline="3–6 months",   risk="Moderate", capital_recovery="At Sale",      roi=round(flip_profit / total, 4) if total else 0,      recommended=False),
        ExitStrategyRow(strategy="BRRRR",          estimated_profit=round(brrrr_refi),       timeline="6–12 months",  risk="Moderate", capital_recovery="Refinance",    roi=round(brrrr_refi / total, 4) if total else 0,      recommended=False),
        ExitStrategyRow(strategy="Hold / Rental",  estimated_profit=round(rental_annual),    timeline="Long-term",    risk="Low",      capital_recovery="Limited",      roi=round(rental_annual / total, 4) if total else 0,    recommended=False),
        ExitStrategyRow(strategy="Development",    estimated_profit=round(dev_profit),        timeline="12–36 months", risk="Highest",  capital_recovery="At Completion", roi=round(dev_profit / total, 4) if total else 0,      recommended=False),
    ]

    best_idx = max(range(len(strategies)), key=lambda i: strategies[i].estimated_profit)
    updated = []
    for i, row in enumerate(strategies):
        updated.append(ExitStrategyRow(**{**row.model_dump(), "recommended": i == best_idx}))
    return updated


@router.post("/deal-analysis", response_model=DealAnalysisResult)
def deal_analysis(payload: DealAnalysisInput):
    pp     = payload.purchase_price
    arv    = payload.arv
    repair = payload.repair_costs
    hold   = payload.holding_costs
    close  = payload.closing_costs
    sell   = payload.selling_costs

    total_cost   = pp + repair + hold + close + sell
    mao_70       = arv * 0.70 - repair
    flip_profit  = arv - total_cost
    wholesale_fee = max(0, mao_70 - pp)
    roi           = flip_profit / total_cost if total_cost else 0
    risk          = _risk_score(roi, mao_70, pp, arv)
    decision      = _decision(roi, pp, mao_70)

    def stress(arv_mult: float = 1.0, repair_mult: float = 1.0) -> dict:
        s_arv    = arv * arv_mult
        s_repair = repair * repair_mult
        s_total  = pp + s_repair + hold + close + sell
        s_profit = s_arv - s_total
        s_roi    = s_profit / s_total if s_total else 0
        return {
            "profit": round(s_profit, 2),
            "roi": round(s_roi, 4),
            "decision": _decision(s_roi, pp, s_arv * 0.70 - s_repair),
            "passes": s_roi >= 0.20,
        }

    worst_case_roi = stress(0.80, 1.25)["roi"]

    return DealAnalysisResult(
        mao=round(mao_70, 2),
        mao_70_rule=round(arv * 0.70, 2),
        total_cost=round(total_cost, 2),
        flip_profit=round(flip_profit, 2),
        wholesale_fee=round(wholesale_fee, 2),
        roi=round(roi, 4),
        risk_score=risk,
        decision=decision,
        stress_test_10pct_arv_drop=stress(0.90),
        stress_test_20pct_arv_drop=stress(0.80),
        stress_test_25pct_repair_increase=stress(1.0, 1.25),
        disposition_matrix=_exit_matrix(pp, arv, repair),
        worst_case_roi=round(worst_case_roi, 4),
        passes_minimum_threshold=worst_case_roi >= 0.20,
    )


# ─── LEAD SCORING ENGINE ──────────────────────────────────────────────────────

class LeadScoringInput(BaseModel):
    motivation: Optional[str] = None
    equity_pct: Optional[float] = None
    timeline_days: Optional[int] = None
    asking_vs_arv: Optional[float] = None
    vacant: bool = False
    tax_delinquent: bool = False
    absentee_owner: bool = False

class LeadScoringResult(BaseModel):
    score: int
    grade: str
    priority: str
    reasoning: list[str]

@router.post("/lead-score", response_model=LeadScoringResult)
def score_lead(payload: LeadScoringInput) -> LeadScoringResult:
    score = 50
    reasoning = []

    HIGH_MOTIVATION = {"divorce", "probate", "foreclosure", "bankruptcy", "death", "eviction", "behind"}
    if payload.motivation:
        words = payload.motivation.lower().split()
        if any(w in HIGH_MOTIVATION for w in words):
            score += 20
            reasoning.append("High-motivation keyword detected")
        else:
            reasoning.append("Motivation present but not high-urgency")

    if payload.equity_pct is not None:
        if payload.equity_pct >= 0.40:  score += 20; reasoning.append("High equity (40%+)")
        elif payload.equity_pct >= 0.20: score += 10; reasoning.append("Moderate equity (20–40%)")
        else: score -= 10; reasoning.append("Low equity (<20%)")

    if payload.timeline_days is not None:
        if payload.timeline_days <= 30:  score += 15; reasoning.append("Urgent timeline (<30 days)")
        elif payload.timeline_days <= 90: score += 5; reasoning.append("Short timeline (30–90 days)")

    if payload.asking_vs_arv is not None:
        if payload.asking_vs_arv <= 0.65: score += 15; reasoning.append("Asking price ≤65% ARV — strong deal")
        elif payload.asking_vs_arv <= 0.75: score += 5; reasoning.append("Asking price ≤75% ARV — workable")
        else: score -= 15; reasoning.append("Asking price too high vs ARV")

    if payload.vacant:        score += 10; reasoning.append("Vacant property")
    if payload.tax_delinquent: score += 10; reasoning.append("Tax delinquent")
    if payload.absentee_owner: score += 5;  reasoning.append("Absentee owner")

    score = max(0, min(100, score))
    grade = "A" if score >= 80 else "B" if score >= 60 else "C" if score >= 40 else "D"
    priority = "Priority" if score >= 80 else "Follow-Up" if score >= 60 else "Nurture" if score >= 40 else "Archive"

    return LeadScoringResult(score=score, grade=grade, priority=priority, reasoning=reasoning)


# ─── CAPITAL ALLOCATION ENGINE ────────────────────────────────────────────────

class DealForAllocation(BaseModel):
    deal_id: str
    roi: float
    risk_score: int
    timeline_months: int
    capital_required: float
    strategic_value: float = 1.0

class AllocationResult(BaseModel):
    deal_id: str
    funding_priority_score: float
    recommended: bool
    reasoning: str

@router.post("/capital-allocation", response_model=list[AllocationResult])
def capital_allocation(deals: list[DealForAllocation], available_capital: float = 0) -> list[AllocationResult]:
    def priority(d: DealForAllocation) -> float:
        risk_penalty = d.risk_score / 100
        time_penalty = 1 / max(d.timeline_months, 1)
        return d.roi * d.strategic_value * time_penalty * (1 - risk_penalty * 0.5)

    scored = sorted(deals, key=priority, reverse=True)
    results = []
    remaining = available_capital

    for d in scored:
        score = priority(d)
        can_fund = remaining >= d.capital_required
        if can_fund: remaining -= d.capital_required
        results.append(AllocationResult(
            deal_id=d.deal_id,
            funding_priority_score=round(score, 4),
            recommended=can_fund,
            reasoning=f"ROI={d.roi:.1%}, Risk={d.risk_score}/100, Timeline={d.timeline_months}mo — {'Funded' if can_fund else 'Insufficient capital'}",
        ))

    return sorted(results, key=lambda r: r.funding_priority_score, reverse=True)
