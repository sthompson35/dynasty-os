"""Dynasty AI API - ATLAS recommendations and engine orchestration."""
from __future__ import annotations

from fastapi import APIRouter

from app.dynasty_ai import DynastyAIOrchestrator, DynastyAIRequest, DynastyAIResponse, rank_deals
from app.dynasty_ai.core import BatchRankRequest

router = APIRouter(prefix="/api/dynasty-ai", tags=["Dynasty AI"])

AGENT_MANIFEST = {
    "name": "dynasty_ai",
    "model": "dynasty_ai.deterministic.v1",
    "primary_agent": "ATLAS",
    "mission": "Analyze property opportunities, compare exits, score Dynasty fit, and route work across Dynasty PropertyOS engines.",
    "engines": [
        {"key": "lead", "label": "Lead Engine", "job": "Source, score, and prioritize seller/buyer/investor leads."},
        {"key": "intake", "label": "Intake Engine", "job": "Normalize imported records and determine acquisition readiness."},
        {"key": "underwriting", "label": "Underwriting Engine", "job": "Calculate ARV, MAO, ROI, profit, risk, and stress tests."},
        {"key": "strategy", "label": "Strategy Engine", "job": "Compare wholesale, flip, BRRRR, rental, owner finance, and development exits."},
        {"key": "deal", "label": "Deal Engine", "job": "Create deal records, offers, LOIs, and approvals."},
        {"key": "rehab", "label": "Rehab Engine", "job": "Classify repair level, scope risk, and contractor needs."},
        {"key": "capital", "label": "Capital Engine", "job": "Match lender fit, cash need, investor capital, and funding difficulty."},
        {"key": "investor", "label": "Investor Engine", "job": "Package deals for investor appetite and return criteria."},
        {"key": "disposition", "label": "Disposition Engine", "job": "Route buyer demand, marketing packages, assignments, and exit execution."},
        {"key": "operations", "label": "Operations Engine", "job": "Track tasks, project movement, closing, rehab, and delivery."},
        {"key": "portfolio", "label": "Portfolio Dashboard", "job": "Measure outcomes and feed closed-deal learning back into the model."},
    ],
}


@router.get("/manifest")
def manifest() -> dict:
    return AGENT_MANIFEST


@router.post("/analyze-deal", response_model=DynastyAIResponse)
def analyze_deal(payload: DynastyAIRequest) -> DynastyAIResponse:
    return DynastyAIOrchestrator().analyze(payload)


@router.post("/orchestrate", response_model=DynastyAIResponse)
def orchestrate(payload: DynastyAIRequest) -> DynastyAIResponse:
    return DynastyAIOrchestrator().analyze(payload)


@router.post("/rank", response_model=list[DynastyAIResponse])
def rank(payload: BatchRankRequest) -> list[DynastyAIResponse]:
    return rank_deals(payload.deals)
