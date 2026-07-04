"""Shared request/response models for the Dynasty AI (ATLAS) orchestration
layer. Moved out of core.py so engine modules can import these without
importing the orchestrator itself (avoids a circular import between
core.py and engines/*.py)."""
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
    investor_score: int
    disposition_score: int
    operations_score: int
    portfolio_score: int
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


class EngineTraceEntry(BaseModel):
    engine: EngineName
    score: int | None
    summary: str


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
    engine_trace: list[EngineTraceEntry]
    model: str = "dynasty_ai.deterministic.v1"


class BatchRankRequest(BaseModel):
    deals: list[DynastyAIRequest] = Field(default_factory=list)


def clamp(value: float, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, round(value)))
