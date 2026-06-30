"""Land + Build Deal Underwriting & Due Diligence API.

Specialized tactical endpoints for comprehensive Land + Build deal analysis,
scenario modeling, and due diligence management.
"""

from __future__ import annotations
import sys
from pathlib import Path
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_supabase

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

router = APIRouter(prefix="/api/land-build", tags=["Land + Build UW/DD"])


# ─── Models ──────────────────────────────────────────────────────────────────

class PropertyInputRequest(BaseModel):
    """Property input data for land + build deal."""
    property_id: Optional[str] = None
    address: str
    city: str
    state: str
    county: str
    zipcode: str
    property_type: str = "Vacant Land"
    lot_size_acres: float
    zoning: Optional[str] = None
    current_use: Optional[str] = None
    purchase_price: float
    arv_land: float
    build_cost_estimate: float = 0.0
    total_project_cost: float = 0.0
    market_analysis_date: Optional[str] = None
    notes: Optional[str] = None


class SaleScenarioRequest(BaseModel):
    """Sale scenario modeling request."""
    property_id: str
    arv_sale: float
    holding_months: int = 12
    carrying_cost_monthly: float = 0.0
    best_case_arv: Optional[float] = None
    worst_case_arv: Optional[float] = None


class RentalBackstopRequest(BaseModel):
    """Rental backstop scenario request."""
    property_id: str
    est_monthly_rent: float
    annual_taxes: float = 0.0
    annual_insurance: float = 0.0
    holding_years: int = 5
    exit_sale_year: int = 5
    exit_arv: Optional[float] = None


class ExitStrategyRequest(BaseModel):
    """Exit strategy analysis request."""
    property_id: str
    purchase_price: float
    arv: float
    build_cost: float = 0.0
    monthly_rent: float = 0.0


class DDChecklistRequest(BaseModel):
    """Due diligence checklist creation request."""
    property_id: str
    include_categories: Optional[List[str]] = None


class DDChecklistUpdateRequest(BaseModel):
    """Update a due diligence checklist item."""
    item_id: str
    status: str
    result: Optional[str] = None
    notes: Optional[str] = None


class BuyBoxRequest(BaseModel):
    """Buy box evaluation request."""
    property_type: str = "Vacant Land"
    min_lot_size: float = 0.0
    max_lot_size: float = 100.0
    min_arv: float = 0.0
    max_purchase_price: float = 1000000.0
    target_roi: float = 0.20
    max_holding_months: int = 24
    preferred_zoning: Optional[List[str]] = None
    excluded_counties: Optional[List[str]] = None


class CampaignRequest(BaseModel):
    """Campaign creation request."""
    campaign_id: Optional[str] = None
    name: str
    target_county: Optional[str] = None
    target_property_type: Optional[str] = None
    budget: float = 0.0


class OfferCalculationRequest(BaseModel):
    """Offer calculation request."""
    property_id: str
    arv: float
    repair_cost: float = 0.0
    exit_strategy: str = "Flip"
    target_roi: float = 0.20
    holding_cost_monthly: float = 0.0
    holding_months: int = 12


class ComprehensiveAnalysisRequest(BaseModel):
    """Comprehensive Land + Build deal analysis request."""
    property_input: PropertyInputRequest
    buybox_criteria: Optional[BuyBoxRequest] = None
    include_dd_checklist: bool = True


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/analyze", status_code=200)
def analyze_land_build_deal(payload: ComprehensiveAnalysisRequest):
    """Run comprehensive Land + Build deal analysis.
    
    Analyzes property inputs, models sale/rental scenarios, evaluates exit
    strategies, and generates due diligence checklist.
    """
    from dynasty_os.engines.land_build_uw_dd_engine import (
        LandBuild_UW_DDEngine,
        BuyBoxCriteria,
    )
    
    engine = LandBuild_UW_DDEngine()
    
    buybox = None
    if payload.buybox_criteria:
        buybox = BuyBoxCriteria(
            buybox_id=f"BB-{uuid4()}",
            **payload.buybox_criteria.model_dump(exclude_none=True)
        )
    
    result = engine.analyze_land_build_deal(
        property_input=payload.property_input.model_dump(exclude_none=True),
        buybox_criteria=buybox,
        include_dd_checklist=payload.include_dd_checklist,
    )
    
    if not result.get("success"):
        raise HTTPException(400, result.get("reason", "Analysis failed"))
    
    return result


@router.post("/sale-scenario", status_code=200)
def calculate_sale_scenario(payload: SaleScenarioRequest):
    """Model a sale scenario for a Land + Build property."""
    from dynasty_os.engines.land_build_uw_dd_engine import SaleScenarioEngine
    
    engine = SaleScenarioEngine()
    result = engine.process(
        property_id=payload.property_id,
        arv_sale=payload.arv_sale,
        purchase_price=0.0,
        holding_months=payload.holding_months,
        carrying_cost_monthly=payload.carrying_cost_monthly,
    )
    
    return {"scenario": result, "metrics": engine.get_metrics()}


@router.post("/rental-backstop", status_code=200)
def calculate_rental_backstop(payload: RentalBackstopRequest):
    """Model a rental backstop scenario (fallback if sale fails)."""
    from dynasty_os.engines.land_build_uw_dd_engine import RentalBackstopEngine
    
    engine = RentalBackstopEngine()
    result = engine.process(
        property_id=payload.property_id,
        monthly_rent=payload.est_monthly_rent,
        annual_taxes=payload.annual_taxes,
        annual_insurance=payload.annual_insurance,
        holding_years=payload.holding_years,
        exit_arv=payload.exit_arv or 0.0,
    )
    
    return {"backstop": result, "metrics": engine.get_metrics()}


@router.post("/exit-strategies", status_code=200)
def rank_exit_strategies(payload: ExitStrategyRequest):
    """Rank and evaluate all exit strategies for a property."""
    from dynasty_os.engines.land_build_uw_dd_engine import ExitStrategyEngine
    
    engine = ExitStrategyEngine()
    result = engine.process(
        property_id=payload.property_id,
        purchase_price=payload.purchase_price,
        arv=payload.arv,
        build_cost=payload.build_cost,
        monthly_rent=payload.monthly_rent,
    )
    
    return {"exit_analysis": result, "metrics": engine.get_metrics()}


@router.post("/dd-checklist", status_code=201)
def create_dd_checklist(payload: DDChecklistRequest):
    """Create a due diligence checklist for a property."""
    from dynasty_os.engines.land_build_uw_dd_engine import DDChecklistEngine
    
    engine = DDChecklistEngine()
    result = engine.create_checklist(
        property_id=payload.property_id,
        include_categories=payload.include_categories,
    )
    
    return {"checklist": result, "metrics": engine.get_metrics()}


@router.get("/dd-checklist/{property_id}", status_code=200)
def get_dd_checklist_summary(property_id: str):
    """Get summary of due diligence checklist for a property."""
    from dynasty_os.engines.land_build_uw_dd_engine import DDChecklistEngine
    
    engine = DDChecklistEngine()
    summary = engine.get_checklist_summary(property_id)
    
    return summary


@router.post("/dd-checklist-update", status_code=200)
def update_dd_checklist_item(payload: DDChecklistUpdateRequest):
    """Update a due diligence checklist item."""
    from dynasty_os.engines.land_build_uw_dd_engine import DDChecklistEngine
    
    engine = DDChecklistEngine()
    result = engine.update_item_status(
        item_id=payload.item_id,
        status=payload.status,
        result=payload.result or "",
        notes=payload.notes or "",
    )
    
    if not result:
        raise HTTPException(404, "Checklist item not found")
    
    return result


@router.post("/buy-box-evaluate", status_code=200)
def evaluate_against_buybox(
    property_data: PropertyInputRequest,
    buybox_criteria: BuyBoxRequest
):
    """Evaluate a property against buy box criteria."""
    from dynasty_os.engines.land_build_uw_dd_engine import BuyBoxEngine, BuyBoxCriteria
    
    engine = BuyBoxEngine()
    
    buybox = BuyBoxCriteria(
        buybox_id=f"BB-{uuid4()}",
        **buybox_criteria.model_dump(exclude_none=True)
    )
    
    result = engine.evaluate(
        property_input=property_data.model_dump(exclude_none=True),
        buybox=buybox,
    )
    
    return {"evaluation": result, "metrics": engine.get_metrics()}


@router.post("/offer-calculation", status_code=200)
def calculate_optimal_offer(payload: OfferCalculationRequest):
    """Calculate optimal offer price based on deal parameters."""
    try:
        from dynasty_os.engines.land_build_uw_dd_engine import OfferCalculationEngine

        engine = OfferCalculationEngine()
        result = engine.calculate_offer(
            property_id=payload.property_id,
            arv=payload.arv,
            repair_cost=payload.repair_cost,
            exit_strategy=payload.exit_strategy,
            target_roi=payload.target_roi,
            holding_cost_monthly=payload.holding_cost_monthly,
            holding_months=payload.holding_months,
        )
        return {"offer": result, "metrics": engine.get_metrics(), "fallback": False}
    except ModuleNotFoundError:
        holding_cost = payload.holding_cost_monthly * payload.holding_months
        target_profit = payload.arv * payload.target_roi
        closing_buffer = payload.arv * 0.03
        selling_buffer = payload.arv * 0.06 if payload.exit_strategy.lower() in {"flip", "fix & flip"} else 0
        recommended_offer = max(0, payload.arv - payload.repair_cost - holding_cost - closing_buffer - selling_buffer - target_profit)
        total_project_cost = recommended_offer + payload.repair_cost + holding_cost + closing_buffer + selling_buffer
        expected_profit = max(0, payload.arv - total_project_cost)
        roi = expected_profit / total_project_cost if total_project_cost else 0
        return {
            "offer": {
                "property_id": payload.property_id,
                "recommended_offer": round(recommended_offer, 2),
                "max_allowable_offer": round(recommended_offer, 2),
                "arv": payload.arv,
                "repair_cost": payload.repair_cost,
                "holding_cost": round(holding_cost, 2),
                "target_profit": round(target_profit, 2),
                "expected_profit": round(expected_profit, 2),
                "roi": round(roi, 4),
                "exit_strategy": payload.exit_strategy,
                "decision": "BUY" if roi >= payload.target_roi else "REVIEW",
            },
            "metrics": {"engine": "deterministic_fallback", "optional_engine_available": False},
            "fallback": True,
        }


@router.get("/metrics", status_code=200)
def get_all_metrics():
    """Get aggregated metrics from all Land + Build sub-engines."""
    from dynasty_os.engines.land_build_uw_dd_engine import LandBuild_UW_DDEngine
    
    engine = LandBuild_UW_DDEngine()
    metrics = engine.get_metrics()
    
    return {
        "engine": "LandBuild_UW_DDEngine",
        "metrics": metrics,
    }
