from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Decision = Literal["BUY", "PASS", "REVIEW"]
EngineName = Literal[
    "lead",
    "intake",
    "underwriting",
    "strategy",
    "deal",
    "rehab",
    "capital",
    "investor",
    "disposition",
    "operations",
    "portfolio",
]


class DynastyAIRequest(BaseModel):
    property_id: str | None = None
    address: str = ""
    city: str = ""
    state: str = ""
    property_type: str = "single-family"
    status: str = "prospect"
    notes: str | None = None
    purchase_price: float = 0
    arv: float = 0
    repair_costs: float = 0
    holding_costs: float = 0
    closing_costs: float = 0
    selling_costs: float = 0
    monthly_rent: float = 0
    beds: float = 0
    baths: float = 0
    sqft: float = 0
    lot_size: float = 0
    days_on_market: int = 0
    vacant: bool = False
    inherited: bool = False
    pre_foreclosure: bool = False
    code_violations: bool = False
    tax_delinquent: bool = False
    absentee_owner: bool = False
    title_issues: bool = False
    flood_zone: bool = False
    contractor_secured: bool = False
    market: str = "Missouri"
    target_profit: float = 25000
    target_roi: float = 0.25


class Scorecard(BaseModel):
    lead_score: int
    intake_score: int
    underwriting_score: int
    strategy_score: int
    rehab_score: int
    capital_score: int
    disposition_score: int
    dynasty_fit_score: int
    risk_score: int


class ExitOption(BaseModel):
    strategy: str
    score: int
    estimated_profit: float
    roi: float
    timeline: str
    risk: str
    recommended: bool = False


class EngineAction(BaseModel):
    engine: EngineName
    action: str
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    reason: str


class AtlasRecommendation(BaseModel):
    action: Decision
    confidence: int
    recommended_exit: str
    risk: Literal["Low", "Moderate", "High"]
    capital_need: Literal["Low", "Moderate", "High"]
    reason: list[str]


class DynastyAIResponse(BaseModel):
    property_id: str | None
    address: str
    market: str
    total_investment: float
    projected_profit: float
    projected_roi: float
    mao: float
    scorecard: Scorecard
    atlas: AtlasRecommendation
    exit_matrix: list[ExitOption]
    next_actions: list[EngineAction]
    model: str = "dynasty_ai.deterministic.v1"


class BatchRankRequest(BaseModel):
    deals: list[DynastyAIRequest] = Field(default_factory=list)


def _clamp(value: float, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, round(value)))


def _text(payload: DynastyAIRequest) -> str:
    return f"{payload.notes or ''} {payload.status} {payload.property_type}".lower()


def _has(payload: DynastyAIRequest, terms: list[str]) -> bool:
    haystack = _text(payload)
    return any(term in haystack for term in terms)


def _seller_motivation(payload: DynastyAIRequest) -> int:
    score = 12
    if payload.vacant or _has(payload, ["vacant", "vacancy"]):
        score += 18
    if payload.inherited or _has(payload, ["inherited", "probate", "estate"]):
        score += 18
    if payload.pre_foreclosure or _has(payload, ["pre foreclosure", "pre-foreclosure", "foreclosure", "default"]):
        score += 22
    if payload.code_violations or _has(payload, ["code violation", "condemned"]):
        score += 14
    if payload.tax_delinquent or _has(payload, ["tax delinquent", "tax lien"]):
        score += 16
    if payload.absentee_owner or _has(payload, ["absentee"]):
        score += 12
    return _clamp(score)


def _rehab_level(payload: DynastyAIRequest) -> tuple[str, int]:
    repair_pct = payload.repair_costs / payload.arv if payload.arv else 0
    per_sqft = payload.repair_costs / payload.sqft if payload.sqft else 0
    if repair_pct >= 0.30 or per_sqft >= 65:
        return "Gut", 28
    if repair_pct >= 0.20 or per_sqft >= 45:
        return "Heavy", 48
    if repair_pct >= 0.10 or per_sqft >= 25:
        return "Medium", 76
    return "Light", 90


def _risk_score(payload: DynastyAIRequest, roi: float, mao: float) -> int:
    score = 12
    if payload.arv <= 0:
        score += 30
    if payload.purchase_price > mao and mao > 0:
        score += 20
    if roi < 0.12:
        score += 18
    if payload.days_on_market > 90:
        score += 8
    if payload.title_issues:
        score += 18
    if payload.flood_zone:
        score += 16
    if not payload.contractor_secured and payload.repair_costs > 50000:
        score += 8
    return _clamp(score)


def _exit_matrix(payload: DynastyAIRequest, total_investment: float, mao: float) -> list[ExitOption]:
    arv = payload.arv
    wholesale_profit = max(0, mao - payload.purchase_price)
    flip_profit = arv - total_investment
    brrrr_refi = max(0, arv * 0.75 - total_investment)
    rental_cashflow = (payload.monthly_rent * 12 * 0.62) - (total_investment * 0.085)
    owner_finance_profit = max(0, (payload.purchase_price * 0.12) + (arv - payload.purchase_price) * 0.18)
    development_profit = max(0, arv * 1.35 - total_investment) if payload.property_type == "land" or payload.lot_size >= 0.5 else 0

    rows = [
        ExitOption(strategy="Wholesale", score=_clamp(45 + wholesale_profit / 1000), estimated_profit=round(wholesale_profit, 2), roi=wholesale_profit / total_investment if total_investment else 0, timeline="1-4 weeks", risk="Low"),
        ExitOption(strategy="Fix & Flip", score=_clamp(40 + flip_profit / 1250), estimated_profit=round(flip_profit, 2), roi=flip_profit / total_investment if total_investment else 0, timeline="3-6 months", risk="Moderate"),
        ExitOption(strategy="BRRRR", score=_clamp(42 + brrrr_refi / 1500), estimated_profit=round(brrrr_refi, 2), roi=brrrr_refi / total_investment if total_investment else 0, timeline="6-12 months", risk="Moderate"),
        ExitOption(strategy="Rental", score=_clamp(40 + max(0, rental_cashflow) / 500), estimated_profit=round(rental_cashflow, 2), roi=rental_cashflow / total_investment if total_investment else 0, timeline="Long-term", risk="Low"),
        ExitOption(strategy="Owner Finance", score=_clamp(38 + owner_finance_profit / 1500), estimated_profit=round(owner_finance_profit, 2), roi=owner_finance_profit / total_investment if total_investment else 0, timeline="6-24 months", risk="Moderate"),
        ExitOption(strategy="Development", score=_clamp(30 + development_profit / 2500), estimated_profit=round(development_profit, 2), roi=development_profit / total_investment if total_investment else 0, timeline="12-36 months", risk="High"),
    ]
    best = max(rows, key=lambda row: (row.score, row.estimated_profit))
    return [row.model_copy(update={"recommended": row.strategy == best.strategy}) for row in rows]


class DynastyAIOrchestrator:
    """Deterministic ATLAS brain for acquisitions and engine routing."""

    def analyze(self, payload: DynastyAIRequest) -> DynastyAIResponse:
        mao = max(0, payload.arv * 0.70 - payload.repair_costs)
        purchase = payload.purchase_price or mao
        total_investment = purchase + payload.repair_costs + payload.holding_costs + payload.closing_costs + payload.selling_costs
        projected_profit = payload.arv - total_investment
        projected_roi = projected_profit / total_investment if total_investment else 0
        lead_score = _seller_motivation(payload)
        rehab_level, rehab_score = _rehab_level(payload)
        risk_score = _risk_score(payload, projected_roi, mao)
        exit_matrix = _exit_matrix(payload.model_copy(update={"purchase_price": purchase}), total_investment, mao)
        best_exit = next((row for row in exit_matrix if row.recommended), exit_matrix[0])

        underwriting_score = _clamp((projected_roi * 100) + projected_profit / 1500 + (payload.arv - purchase) / 3000 - risk_score * 0.35)
        strategy_score = best_exit.score
        capital_score = _clamp(78 - (total_investment / 12000) + (projected_roi * 45))
        disposition_score = best_exit.score
        intake_score = _clamp(underwriting_score * 0.55 + lead_score * 0.25 + disposition_score * 0.20)
        missouri_fit = 10 if "mo" in payload.state.lower() or "missouri" in payload.market.lower() else 0
        shylow_fit = (
            (18 if payload.arv >= 180000 else 0)
            + (24 if projected_profit >= payload.target_profit else 0)
            + (24 if projected_roi >= payload.target_roi else 0)
            + missouri_fit
            + (12 if rehab_level == "Medium" else 8 if rehab_level == "Light" else 0)
        )
        dynasty_fit = _clamp(intake_score * 0.55 + shylow_fit * 0.45)

        action: Decision = "BUY" if dynasty_fit >= 72 and projected_profit > 0 else "PASS" if dynasty_fit < 45 or projected_profit <= 0 else "REVIEW"
        risk = "Low" if risk_score <= 35 else "Moderate" if risk_score <= 62 else "High"
        capital_need = "Low" if capital_score >= 72 else "Moderate" if capital_score >= 48 else "High"

        reasons = [
            f"ARV Spread: {'Excellent' if payload.arv - purchase >= 50000 else 'Strong' if payload.arv - purchase >= 25000 else 'Thin'}",
            f"Expected Profit: ${round(projected_profit):,}",
            f"ROI: {projected_roi:.1%}",
            f"Rehab: {rehab_level}",
            f"Risk: {risk}",
            f"Capital Need: {capital_need}",
        ]
        if action == "PASS":
            reasons = [
                "Insufficient spread" if projected_profit <= 0 else f"Expected Profit: ${round(projected_profit):,}",
                "Rental cashflow / ROI weak" if projected_roi < 0.10 else f"ROI: {projected_roi:.1%}",
                "Repair uncertainty high" if risk_score > 62 else f"Risk: {risk}",
            ]

        next_actions = self._next_actions(action, best_exit.strategy, risk, capital_need, payload)

        return DynastyAIResponse(
            property_id=payload.property_id,
            address=payload.address,
            market=payload.market,
            total_investment=round(total_investment, 2),
            projected_profit=round(projected_profit, 2),
            projected_roi=round(projected_roi, 4),
            mao=round(mao, 2),
            scorecard=Scorecard(
                lead_score=lead_score,
                intake_score=intake_score,
                underwriting_score=underwriting_score,
                strategy_score=strategy_score,
                rehab_score=rehab_score,
                capital_score=capital_score,
                disposition_score=disposition_score,
                dynasty_fit_score=dynasty_fit,
                risk_score=risk_score,
            ),
            atlas=AtlasRecommendation(
                action=action,
                confidence=_clamp(dynasty_fit + (8 if action == "BUY" else 5 if action == "PASS" else 0), 0, 99),
                recommended_exit=best_exit.strategy,
                risk=risk,
                capital_need=capital_need,
                reason=reasons,
            ),
            exit_matrix=exit_matrix,
            next_actions=next_actions,
        )

    def _next_actions(
        self,
        action: Decision,
        exit_strategy: str,
        risk: str,
        capital_need: str,
        payload: DynastyAIRequest,
    ) -> list[EngineAction]:
        actions: list[EngineAction] = [
            EngineAction(engine="intake", action="Validate seller motivation and contact data", priority="high", reason="Lead score feeds offer urgency."),
            EngineAction(engine="underwriting", action="Lock ARV, repair budget, and MAO", priority="high", reason="ATLAS recommendation depends on spread quality."),
            EngineAction(engine="strategy", action=f"Prepare {exit_strategy} strategy package", priority="high" if action == "BUY" else "medium", reason="Best exit controls offer posture."),
        ]
        if action == "BUY":
            actions.append(EngineAction(engine="deal", action="Generate LOI and sync to Deal Engine", priority="critical", reason="Candidate meets Dynasty acquisition criteria."))
        if capital_need != "Low":
            actions.append(EngineAction(engine="capital", action="Match lender and available capital stack", priority="high", reason=f"Capital need is {capital_need}."))
        if risk != "Low" or payload.repair_costs > 50000:
            actions.append(EngineAction(engine="rehab", action="Order contractor scope and repair contingency review", priority="high", reason=f"Execution risk is {risk}."))
        if exit_strategy in {"Wholesale", "Owner Finance"}:
            actions.append(EngineAction(engine="disposition", action="Assign buyer pool and draft marketing package", priority="medium", reason=f"{exit_strategy} depends on buyer demand."))
        if action == "PASS":
            actions.append(EngineAction(engine="lead", action="Move seller to nurture or reject queue", priority="medium", reason="Current pricing does not clear buy box."))
        return actions


def rank_deals(deals: list[DynastyAIRequest]) -> list[DynastyAIResponse]:
    orchestrator = DynastyAIOrchestrator()
    return sorted(
        (orchestrator.analyze(deal) for deal in deals),
        key=lambda result: (result.scorecard.dynasty_fit_score, result.projected_profit),
        reverse=True,
    )
