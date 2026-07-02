"""Land + Build Deal Underwriting & Due Diligence Sub-Engine.

A specialized tactical module for comprehensive Land + Build deal underwriting,
scenario modeling, and due diligence. Plugs into Deal Engine + Operations Engine.

Sheets mapped:
  - 01_Inputs → PropertyInputs
  - 02_Scenarios_Sale → SaleScenarioEngine
  - 03_Rental_Backstop → RentalBackstopEngine
  - 04_Exit_Ladder → ExitStrategyEngine
  - 05_Team_Contacts → TeamContactsEngine
  - 06_DD_Checklist → DDChecklistEngine
  - 07_Buy_Box → BuyBoxEngine
  - 08_Campaigns → CampaignEngine
  - 10_Offer_Calc → OfferCalculationEngine
"""

from __future__ import annotations
from dataclasses import MISSING, dataclass, field
from datetime import datetime
from typing import Any, Optional
from enum import Enum

DD_STATUSES = ["Not Started", "In Progress", "Passed", "Passed with Issues", "Failed", "N/A"]
CAMPAIGN_STATUSES = ["Planning", "Active", "Paused", "Completed", "Archived"]
OFFER_STATUSES = ["Draft", "Submitted", "Accepted", "Rejected", "Countered", "Withdrawn"]


class PropertyType(Enum):
    """Land and build property types."""
    VACANT_LAND = "Vacant Land"
    DEVELOPMENT_OPPORTUNITY = "Development Opportunity"
    FIXER_UPPER = "Fixer Upper"
    TEAR_DOWN = "Tear Down"


class ExitType(Enum):
    """Primary exit strategies for land + build."""
    WHOLESALE = "Wholesale"
    FLIP = "Flip"
    RENTAL = "Rental"
    BRRRR = "BRRRR"
    DEVELOPMENT = "Development"
    JOINT_VENTURE = "Joint Venture"
    LAND_HOLD = "Land Hold/Appreciation"


@dataclass
class PropertyInput:
    """Core property input data."""
    property_id: str
    address: str
    city: str
    state: str
    county: str
    zipcode: str
    property_type: str = PropertyType.VACANT_LAND.value
    lot_size_acres: float = 0.0
    zoning: str = ""
    current_use: str = ""
    purchase_price: float = 0.0
    arv_land: float = 0.0
    build_cost_estimate: float = 0.0
    total_project_cost: float = 0.0
    market_analysis_date: str = ""
    notes: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SaleScenario:
    """Sale scenario modeling."""
    scenario_id: str
    property_id: str
    name: str = "Base Case"
    arv_sale: float = 0.0
    holding_period_months: int = 12
    carrying_cost_monthly: float = 0.0
    selling_costs_pct: float = 0.06
    realtor_commission_pct: float = 0.06
    total_estimated_cost: float = 0.0
    projected_profit: float = 0.0
    projected_roi: float = 0.0
    best_case_arv: float = 0.0
    worst_case_arv: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class RentalBackstop:
    """Rental backstop scenario (if sale fails)."""
    backstop_id: str
    property_id: str
    est_monthly_rent: float = 0.0
    annual_taxes: float = 0.0
    annual_insurance: float = 0.0
    annual_maintenance_reserve: float = 0.0
    vacancy_rate: float = 0.05
    property_management_pct: float = 0.08
    holding_years: int = 5
    cash_flow_annual: float = 0.0
    total_cash_flow: float = 0.0
    exit_sale_year: int = 5
    exit_arv: float = 0.0
    total_profit: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class TeamContact:
    """Team member contact."""
    contact_id: str
    name: str
    role: str
    email: str = ""
    phone: str = ""
    company: str = ""
    specialty: str = ""
    assigned_projects: list[str] = field(default_factory=list)


@dataclass
class DDChecklistItem:
    """Due diligence checklist item."""
    item_id: str
    category: str
    description: str
    status: str = "Not Started"
    responsible_party: str = ""
    due_date: str = ""
    notes: str = ""
    result: str = ""


@dataclass
class BuyBoxCriteria:
    """Property buy box (target criteria)."""
    buybox_id: str
    property_type: str = PropertyType.VACANT_LAND.value
    min_lot_size: float = 0.0
    max_lot_size: float = 100.0
    min_arv: float = 0.0
    max_purchase_price: float = 1000000.0
    target_roi: float = 0.20
    max_holding_months: int = 24
    preferred_zoning: list[str] = field(default_factory=list)
    excluded_counties: list[str] = field(default_factory=list)


@dataclass
class Campaign:
    """Marketing/acquisition campaign."""
    campaign_id: str
    name: str
    target_county: str = ""
    target_property_type: str = ""
    status: str = "Planning"
    start_date: str = ""
    end_date: str = ""
    budget: float = 0.0
    spent: float = 0.0
    leads_generated: int = 0
    deals_closed: int = 0
    roi: float = 0.0


@dataclass
class OfferCalculation:
    """Offer calculation based on deal parameters."""
    offer_id: str
    property_id: str
    purchase_price: str = "0.0"
    offer_status: str = "Draft"
    offer_date: str = ""
    expiration_date: str = ""
    contingencies: list[str] = field(default_factory=list)
    earnest_money: float = 0.0
    closing_timeline_days: int = 30
    financing_type: str = "Cash"
    notes: str = ""


class PropertyInputEngine:
    """Validates and processes property input data."""

    REQUIRED_FIELDS = ["property_id", "address", "city", "state", "purchase_price", "arv_land"]

    def __init__(self) -> None:
        self._inputs: list[dict[str, Any]] = []

    def process(self, raw_input: dict[str, Any]) -> dict[str, Any]:
        """Validate and store property input."""
        missing = [f for f in self.REQUIRED_FIELDS if not raw_input.get(f)]
        payload: dict[str, Any] = {}
        for key, field_def in PropertyInput.__dataclass_fields__.items():
            if key in raw_input and raw_input[key] is not None:
                payload[key] = raw_input[key]
            elif field_def.default is not MISSING:
                payload[key] = field_def.default
            elif field_def.default_factory is not MISSING:
                payload[key] = field_def.default_factory()
        prop_input = PropertyInput(**payload)
        
        result = {
            "property_id": raw_input.get("property_id", ""),
            "valid": len(missing) == 0,
            "missing_fields": missing,
            "processed_at": datetime.utcnow().isoformat(),
            "input": prop_input.__dict__,
        }
        self._inputs.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        valid = sum(1 for i in self._inputs if i["valid"])
        return {
            "total_inputs": len(self._inputs),
            "valid": valid,
            "invalid": len(self._inputs) - valid,
        }


class SaleScenarioEngine:
    """Models sale scenarios and financial projections."""

    def __init__(self) -> None:
        self._scenarios: list[dict[str, Any]] = []

    def process(self, property_id: str, arv_sale: float, purchase_price: float, 
                holding_months: int = 12, carrying_cost_monthly: float = 0.0) -> dict[str, Any]:
        """Calculate sale scenario financials."""
        selling_costs = arv_sale * 0.12
        total_cost = purchase_price + (carrying_cost_monthly * holding_months)
        profit = arv_sale - selling_costs - total_cost
        roi = profit / purchase_price if purchase_price else 0.0

        scenario = {
            "property_id": property_id,
            "arv_sale": round(arv_sale, 2),
            "purchase_price": round(purchase_price, 2),
            "holding_months": holding_months,
            "carrying_cost_total": round(carrying_cost_monthly * holding_months, 2),
            "selling_costs": round(selling_costs, 2),
            "total_invested": round(total_cost, 2),
            "projected_profit": round(profit, 2),
            "projected_roi": round(roi, 4),
            "calculated_at": datetime.utcnow().isoformat(),
        }
        self._scenarios.append(scenario)
        return scenario

    def get_metrics(self) -> dict[str, Any]:
        if not self._scenarios:
            return {"total_scenarios": 0}
        avg_profit = sum(s["projected_profit"] for s in self._scenarios) / len(self._scenarios)
        avg_roi = sum(s["projected_roi"] for s in self._scenarios) / len(self._scenarios)
        return {
            "total_scenarios": len(self._scenarios),
            "avg_profit": round(avg_profit, 2),
            "avg_roi": round(avg_roi, 4),
        }


class RentalBackstopEngine:
    """Models rental backstop scenarios."""

    def __init__(self) -> None:
        self._backstops: list[dict[str, Any]] = []

    def process(self, property_id: str, monthly_rent: float, annual_taxes: float,
                annual_insurance: float, holding_years: int = 5, 
                exit_arv: float = 0.0, purchase_price: float = 0.0) -> dict[str, Any]:
        """Calculate rental backstop financials."""
        maintenance_reserve = monthly_rent * 12 * 0.10
        pm_cost = monthly_rent * 0.08
        monthly_expenses = (annual_taxes / 12) + (annual_insurance / 12) + maintenance_reserve + pm_cost
        monthly_cf = monthly_rent - monthly_expenses
        annual_cf = monthly_cf * 12
        total_cf = annual_cf * holding_years
        
        equity_build = exit_arv - purchase_price if exit_arv else 0.0
        total_profit = total_cf + equity_build

        backstop = {
            "property_id": property_id,
            "est_monthly_rent": round(monthly_rent, 2),
            "annual_taxes": round(annual_taxes, 2),
            "annual_insurance": round(annual_insurance, 2),
            "annual_maintenance_reserve": round(maintenance_reserve, 2),
            "monthly_cash_flow": round(monthly_cf, 2),
            "annual_cash_flow": round(annual_cf, 2),
            "total_cash_flow": round(total_cf, 2),
            "holding_years": holding_years,
            "equity_at_exit": round(equity_build, 2),
            "total_profit": round(total_profit, 2),
            "calculated_at": datetime.utcnow().isoformat(),
        }
        self._backstops.append(backstop)
        return backstop

    def get_metrics(self) -> dict[str, Any]:
        if not self._backstops:
            return {"total_backstops": 0}
        return {"total_backstops": len(self._backstops)}


class ExitStrategyEngine:
    """Ranks and evaluates exit strategies."""

    def __init__(self) -> None:
        self._exit_analyses: list[dict[str, Any]] = []

    def process(self, property_id: str, purchase_price: float, arv: float, 
                build_cost: float = 0.0, monthly_rent: float = 0.0) -> dict[str, Any]:
        """Evaluate all exit strategies."""
        exits: list[dict[str, Any]] = []

        wholesale_profit = (arv * 0.70) - purchase_price - 5000
        exits.append({
            "strategy": ExitType.WHOLESALE.value,
            "timeline_months": 1,
            "estimated_profit": round(wholesale_profit, 2),
            "capital_required": 5000,
            "risk_level": "LOW",
        })

        flip_profit = arv - purchase_price - build_cost - (arv * 0.11)
        exits.append({
            "strategy": ExitType.FLIP.value,
            "timeline_months": 12,
            "estimated_profit": round(flip_profit, 2),
            "capital_required": purchase_price * 0.25 + build_cost,
            "risk_level": "MODERATE",
        })

        dev_profit = (arv * 1.3) - purchase_price - (build_cost * 1.2)
        exits.append({
            "strategy": ExitType.DEVELOPMENT.value,
            "timeline_months": 18,
            "estimated_profit": round(dev_profit, 2),
            "capital_required": purchase_price + build_cost,
            "risk_level": "HIGH",
        })

        annual_cf = (monthly_rent * 12) - ((purchase_price + build_cost) * 0.15)
        exits.append({
            "strategy": ExitType.RENTAL.value,
            "timeline_months": 24,
            "estimated_profit": round(annual_cf * 5, 2),
            "capital_required": (purchase_price + build_cost) * 0.25,
            "risk_level": "MODERATE",
        })

        ranked = sorted(exits, key=lambda x: x["estimated_profit"], reverse=True)
        result = {
            "property_id": property_id,
            "exit_strategies": ranked,
            "recommended_exit": ranked[0]["strategy"] if ranked else "HOLD",
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        self._exit_analyses.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        rec_counts: dict[str, int] = {}
        for a in self._exit_analyses:
            exit_type = a.get("recommended_exit", "HOLD")
            rec_counts[exit_type] = rec_counts.get(exit_type, 0) + 1
        return {
            "total_analyses": len(self._exit_analyses),
            "recommended_exits": rec_counts,
        }


class DDChecklistEngine:
    """Manages due diligence checklists."""

    STANDARD_CATEGORIES = [
        "Title Review", "Survey & Boundaries", "Zoning & Entitlements",
        "Environmental", "Phase 1 ESA", "Phase 2 ESA", "Wetlands Assessment",
        "Deed Restrictions", "Easements", "Liens & Encumbrances",
        "Title Insurance", "Utilities", "Access & Roads", "Flood Zone",
        "Soil & Geotechnical", "Market Analysis", "Comparable Sales",
        "Contractor Bids", "Permit Research", "Engineering Reports",
    ]

    def __init__(self) -> None:
        self._checklists: list[dict[str, Any]] = []
        self._items: list[DDChecklistItem] = []

    def create_checklist(self, property_id: str, include_categories: list[str] | None = None) -> dict[str, Any]:
        """Create a new DD checklist for a property."""
        categories = include_categories or self.STANDARD_CATEGORIES
        items = []
        for i, cat in enumerate(categories):
            item = DDChecklistItem(
                item_id=f"DD-{property_id}-{i+1:03d}",
                category=cat,
                description=f"{cat} verification",
            )
            items.append(item)
            self._items.append(item)

        checklist = {
            "property_id": property_id,
            "item_count": len(items),
            "items": [item.__dict__ for item in items],
            "created_at": datetime.utcnow().isoformat(),
        }
        self._checklists.append(checklist)
        return checklist

    def update_item_status(self, item_id: str, status: str, result: str = "", notes: str = "") -> dict[str, Any]:
        """Update a checklist item's status."""
        for item in self._items:
            if item.item_id == item_id:
                item.status = status
                item.result = result
                item.notes = notes
                return item.__dict__

        return {}

    def get_checklist_summary(self, property_id: str) -> dict[str, Any]:
        """Get summary of checklist status for a property."""
        relevant_items = [i for i in self._items if i.item_id.endswith(property_id.split('-')[-1]) or 
                         any(property_id in i.item_id for _ in [1])]
        
        if not relevant_items:
            return {"property_id": property_id, "total_items": 0}

        status_counts = {}
        for item in relevant_items:
            status_counts[item.status] = status_counts.get(item.status, 0) + 1

        complete = sum(1 for i in relevant_items if i.status in ("Passed", "Passed with Issues"))
        completion_pct = (complete / len(relevant_items) * 100) if relevant_items else 0

        return {
            "property_id": property_id,
            "total_items": len(relevant_items),
            "status_summary": status_counts,
            "completion_pct": round(completion_pct, 1),
        }

    def get_metrics(self) -> dict[str, Any]:
        passed = sum(1 for i in self._items if i.status == "Passed")
        issues = sum(1 for i in self._items if i.status == "Passed with Issues")
        failed = sum(1 for i in self._items if i.status == "Failed")
        return {
            "total_checklists": len(self._checklists),
            "total_items": len(self._items),
            "passed": passed,
            "issues": issues,
            "failed": failed,
        }


class BuyBoxEngine:
    """Evaluates properties against buy box criteria."""

    def __init__(self) -> None:
        self._evaluations: list[dict[str, Any]] = []

    def evaluate(self, property_input: dict[str, Any], buybox: BuyBoxCriteria) -> dict[str, Any]:
        """Evaluate property against buy box criteria."""
        checks = {
            "lot_size": (property_input.get("lot_size_acres", 0) >= buybox.min_lot_size and 
                        property_input.get("lot_size_acres", 0) <= buybox.max_lot_size),
            "arv": property_input.get("arv_land", 0) >= buybox.min_arv,
            "purchase_price": property_input.get("purchase_price", 0) <= buybox.max_purchase_price,
            "zoning": property_input.get("zoning", "") in buybox.preferred_zoning if buybox.preferred_zoning else True,
            "county_excluded": property_input.get("county", "") not in buybox.excluded_counties,
        }

        passed = sum(1 for v in checks.values() if v)
        total = len(checks)
        match_score = (passed / total * 100) if total else 0

        evaluation = {
            "property_id": property_input.get("property_id", ""),
            "buybox_id": buybox.buybox_id,
            "checks": checks,
            "passed": passed,
            "total": total,
            "match_score": round(match_score, 1),
            "meets_criteria": match_score >= 80,
            "evaluated_at": datetime.utcnow().isoformat(),
        }
        self._evaluations.append(evaluation)
        return evaluation

    def get_metrics(self) -> dict[str, Any]:
        meets = sum(1 for e in self._evaluations if e["meets_criteria"])
        return {
            "total_evaluations": len(self._evaluations),
            "meets_criteria": meets,
            "rejected": len(self._evaluations) - meets,
        }


class CampaignEngine:
    """Manages acquisition/marketing campaigns."""

    def __init__(self) -> None:
        self._campaigns: list[Campaign] = []

    def create_campaign(self, campaign_id: str, name: str, target_county: str = "",
                       budget: float = 0.0) -> Campaign:
        """Create a new campaign."""
        campaign = Campaign(
            campaign_id=campaign_id,
            name=name,
            target_county=target_county,
            budget=budget,
            start_date=datetime.utcnow().isoformat(),
        )
        self._campaigns.append(campaign)
        return campaign

    def update_campaign_metrics(self, campaign_id: str, leads_generated: int = 0,
                               deals_closed: int = 0, spent: float = 0.0) -> dict[str, Any]:
        """Update campaign performance metrics."""
        for campaign in self._campaigns:
            if campaign.campaign_id == campaign_id:
                campaign.leads_generated += leads_generated
                campaign.deals_closed += deals_closed
                campaign.spent += spent
                campaign.roi = (campaign.deals_closed * 50000 - campaign.spent) / campaign.spent if campaign.spent else 0
                return campaign.__dict__

        return {}

    def get_metrics(self) -> dict[str, Any]:
        total_leads = sum(c.leads_generated for c in self._campaigns)
        total_deals = sum(c.deals_closed for c in self._campaigns)
        total_spent = sum(c.spent for c in self._campaigns)
        return {
            "total_campaigns": len(self._campaigns),
            "total_leads": total_leads,
            "total_deals": total_deals,
            "total_spent": round(total_spent, 2),
        }


class OfferCalculationEngine:
    """Calculates optimal offers based on deal parameters."""

    def __init__(self) -> None:
        self._offers: list[OfferCalculation] = []

    def calculate_offer(self, property_id: str, arv: float, repair_cost: float = 0.0,
                       exit_strategy: str = "Flip", target_roi: float = 0.20,
                       holding_cost_monthly: float = 0.0, holding_months: int = 12) -> dict[str, Any]:
        """Calculate recommended offer price."""
        selling_costs = arv * 0.12
        profit_target = arv * target_roi
        total_carrying = holding_cost_monthly * holding_months

        if exit_strategy == ExitType.FLIP.value:
            mao = arv - repair_cost - profit_target - selling_costs - total_carrying
        elif exit_strategy == ExitType.WHOLESALE.value:
            mao = arv * 0.70 - profit_target - total_carrying
        elif exit_strategy == ExitType.DEVELOPMENT.value:
            mao = (arv * 1.3) - (repair_cost * 1.2) - profit_target - total_carrying
        else:
            mao = arv - profit_target - total_carrying

        offer = OfferCalculation(
            offer_id=f"OFF-{property_id}-{len(self._offers)+1:04d}",
            property_id=property_id,
            purchase_price=f"{round(mao, 2)}",
            offer_date=datetime.utcnow().isoformat(),
        )

        result = {
            "offer_id": offer.offer_id,
            "property_id": property_id,
            "arv": round(arv, 2),
            "repair_cost": round(repair_cost, 2),
            "exit_strategy": exit_strategy,
            "target_roi": target_roi,
            "recommended_purchase_price": round(mao, 2),
            "projected_profit": round(profit_target, 2),
            "holding_cost": round(total_carrying, 2),
            "calculated_at": datetime.utcnow().isoformat(),
        }
        self._offers.append(offer)
        return result

    def get_metrics(self) -> dict[str, Any]:
        return {"total_offers_calculated": len(self._offers)}


class LandBuild_UW_DDEngine:
    """Master orchestrator for Land + Build Deal Underwriting & Due Diligence.
    
    This is a specialized sub-engine that plugs into Deal Engine + Operations Engine.
    It handles comprehensive Land + Build deal analysis with scenario modeling and DD.
    """

    def __init__(self) -> None:
        self.property_input = PropertyInputEngine()
        self.sale_scenario = SaleScenarioEngine()
        self.rental_backstop = RentalBackstopEngine()
        self.exit_strategy = ExitStrategyEngine()
        self.dd_checklist = DDChecklistEngine()
        self.buy_box = BuyBoxEngine()
        self.campaign = CampaignEngine()
        self.offer_calc = OfferCalculationEngine()

    def analyze_land_build_deal(
        self,
        property_input: dict[str, Any],
        buybox_criteria: BuyBoxCriteria | None = None,
        include_dd_checklist: bool = True,
    ) -> dict[str, Any]:
        """Comprehensive Land + Build deal analysis."""
        
        prop_result = self.property_input.process(property_input)
        if not prop_result["valid"]:
            return {"success": False, "reason": "Invalid property input", "details": prop_result}

        prop_data = prop_result["input"]
        
        sale_scenario = self.sale_scenario.process(
            property_id=prop_data["property_id"],
            arv_sale=prop_data.get("arv_land", 0),
            purchase_price=prop_data.get("purchase_price", 0),
            holding_months=12,
            carrying_cost_monthly=prop_data.get("total_project_cost", 0) * 0.01,
        )

        rental_backstop = self.rental_backstop.process(
            property_id=prop_data["property_id"],
            monthly_rent=prop_data.get("arv_land", 0) * 0.005,
            annual_taxes=prop_data.get("purchase_price", 0) * 0.01,
            annual_insurance=prop_data.get("purchase_price", 0) * 0.005,
            exit_arv=prop_data.get("arv_land", 0),
            purchase_price=prop_data.get("purchase_price", 0),
        )

        exit_strategy = self.exit_strategy.process(
            property_id=prop_data["property_id"],
            purchase_price=prop_data.get("purchase_price", 0),
            arv=prop_data.get("arv_land", 0),
            build_cost=prop_data.get("build_cost_estimate", 0),
        )

        offer = self.offer_calc.calculate_offer(
            property_id=prop_data["property_id"],
            arv=prop_data.get("arv_land", 0),
            repair_cost=prop_data.get("build_cost_estimate", 0),
        )

        result = {
            "success": True,
            "property_id": prop_data["property_id"],
            "address": f"{prop_data.get('address', '')} {prop_data.get('city', '')} {prop_data.get('state', '')}",
            "property_input": prop_result,
            "sale_scenario": sale_scenario,
            "rental_backstop": rental_backstop,
            "exit_strategy": exit_strategy,
            "offer_calculation": offer,
            "dd_checklist": None,
            "analyzed_at": datetime.utcnow().isoformat(),
        }

        if include_dd_checklist:
            dd_checklist = self.dd_checklist.create_checklist(prop_data["property_id"])
            result["dd_checklist"] = dd_checklist

        if buybox_criteria:
            buybox_eval = self.buy_box.evaluate(prop_data, buybox_criteria)
            result["buybox_evaluation"] = buybox_eval

        return result

    def get_metrics(self) -> dict[str, Any]:
        """Get metrics from all sub-engines."""
        return {
            "property_input": self.property_input.get_metrics(),
            "sale_scenario": self.sale_scenario.get_metrics(),
            "rental_backstop": self.rental_backstop.get_metrics(),
            "exit_strategy": self.exit_strategy.get_metrics(),
            "dd_checklist": self.dd_checklist.get_metrics(),
            "buy_box": self.buy_box.get_metrics(),
            "campaign": self.campaign.get_metrics(),
            "offer_calc": self.offer_calc.get_metrics(),
        }


__all__ = [
    "PropertyType",
    "ExitType",
    "PropertyInput",
    "SaleScenario",
    "RentalBackstop",
    "TeamContact",
    "DDChecklistItem",
    "BuyBoxCriteria",
    "Campaign",
    "OfferCalculation",
    "PropertyInputEngine",
    "SaleScenarioEngine",
    "RentalBackstopEngine",
    "ExitStrategyEngine",
    "DDChecklistEngine",
    "BuyBoxEngine",
    "CampaignEngine",
    "OfferCalculationEngine",
    "LandBuild_UW_DDEngine",
]
