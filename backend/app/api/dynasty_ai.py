"""Dynasty AI API - ATLAS recommendations and engine orchestration."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.db import get_supabase
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


# Deals table columns that map straight across (Supabase name -> DynastyAIRequest
# field). Same "deals" table Deal Engine's TrooperCharlie reads (see
# _deal_row_to_dealdata_dict in app/api/deal_engine.py) - not every
# DynastyAIRequest field has a column here (no address/holding_costs/
# lot_size/vacant/inherited/... on this table), so those keep their
# DynastyAIRequest default rather than being guessed at.
_DEAL_ROW_FIELD_MAP = {
    "purchase_price": "asking_price",
    "arv": "arv",
    "repair_costs": "repairs",
    "beds": "beds",
    "baths": "baths",
    "sqft": "sqft",
    "monthly_rent": "rent",
}


def _deal_row_to_request(row: dict[str, Any]) -> DynastyAIRequest:
    fields: dict[str, Any] = {"property_id": row.get("property_id")}
    for request_field, column in _DEAL_ROW_FIELD_MAP.items():
        value = row.get(column)
        if value is not None:
            fields[request_field] = value

    # title_status/flood_status are free-text columns ("Unknown" default),
    # not booleans - treat anything other than a clear/unknown/empty value
    # as a positive signal for ATLAS's risk scoring.
    title_status = str(row.get("title_status") or "").strip().lower()
    if title_status and title_status not in {"unknown", "clear", "clean"}:
        fields["title_issues"] = True
    flood_status = str(row.get("flood_status") or "").strip().lower()
    if flood_status and flood_status not in {"unknown", "none", "no"}:
        fields["flood_zone"] = True

    return DynastyAIRequest(**fields)


@router.get("/trace/{deal_id}")
def trace(deal_id: str) -> dict[str, dict[str, Any]]:
    """Engine-by-engine reasoning for a stored deal, keyed by engine name -
    the same 11-engine pipeline behind /analyze-deal, reshaped for direct
    lookup instead of a display-ordered list."""
    try:
        db = get_supabase()
        row = db.table("deals").select("*").eq("deal_id", deal_id).single().execute()
    except Exception as error:  # Supabase client/connectivity/credential failure
        raise HTTPException(
            status_code=503,
            detail=f"Deal store unavailable ({error}). This endpoint reads the same Supabase `deals` "
                   "table as /api/deal - if that route is also failing, this is a pre-existing "
                   "Supabase connectivity/credential gap, not specific to this endpoint.",
        ) from error

    if not row.data:
        raise HTTPException(status_code=404, detail=f"No deal found for deal_id={deal_id}")

    payload = _deal_row_to_request(row.data)
    result = DynastyAIOrchestrator().analyze(payload)
    return {entry.engine: {"score": entry.score, "summary": entry.summary} for entry in result.engine_trace}
