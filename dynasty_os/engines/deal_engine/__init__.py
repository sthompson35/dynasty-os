"""Deal Engine — 9 sub-systems for full deal analysis, underwriting, and decisioning."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

DEAL_OUTCOMES = ["GO", "GO_WITH_CONDITIONS", "RENEGOTIATE", "HOLD", "KILL"]

EXIT_STRATEGIES = ["Wholesale", "Flip", "BRRRR", "Rental", "Development"]

RISK_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"]


@dataclass
class DealData:
    deal_id: str
    property_id: str
    seller: str
    asking_price: float
    arv: float
    repairs: float
    beds: float = 0
    baths: float = 0
    sqft: float = 0
    rent: float = 0
    taxes: float = 0
    insurance: float = 0
    zoning: str = ""
    flood_status: str = "Unknown"
    title_status: str = "Unknown"
    status: str = "PENDING"
    metadata: dict[str, Any] = field(default_factory=dict)


class IntakeEngine:
    """Validates and standardizes incoming deal data."""

    REQUIRED_FIELDS = ["deal_id", "property_id", "asking_price", "arv", "repairs"]

    def __init__(self) -> None:
        self._intakes: list[dict[str, Any]] = []

    def process(self, raw_deal: dict[str, Any]) -> dict[str, Any]:
        missing = [f for f in self.REQUIRED_FIELDS if not raw_deal.get(f)]
        result: dict[str, Any] = {
            "deal_id": raw_deal.get("deal_id", ""),
            "valid": len(missing) == 0,
            "missing_fields": missing,
            "intake_at": datetime.utcnow().isoformat(),
            "data": raw_deal,
        }
        self._intakes.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        valid = sum(1 for i in self._intakes if i["valid"])
        return {"total_intakes": len(self._intakes), "valid": valid, "invalid": len(self._intakes) - valid}


class AcquisitionEngine:
    """Calculates MAO and acquisition parameters."""

    DEFAULT_MARGIN = 0.30

    def __init__(self) -> None:
        self._analyses: list[dict[str, Any]] = []

    def process(self, deal: DealData, target_margin: float = DEFAULT_MARGIN) -> dict[str, Any]:
        mao = deal.arv - deal.repairs - (deal.arv * target_margin)
        spread = deal.asking_price - mao
        below_mao = deal.asking_price <= mao

        result = {
            "deal_id": deal.deal_id,
            "arv": deal.arv,
            "repairs": deal.repairs,
            "target_margin": target_margin,
            "mao": round(mao, 2),
            "asking_price": deal.asking_price,
            "spread_to_mao": round(spread, 2),
            "meets_mao": below_mao,
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        self._analyses.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        meets = sum(1 for a in self._analyses if a["meets_mao"])
        return {
            "total_analyzed": len(self._analyses),
            "meets_mao": meets,
            "rejected": len(self._analyses) - meets,
        }


class StrategyEngine:
    """Ranks exit strategies by risk-adjusted return."""

    def __init__(self) -> None:
        self._strategies_run: list[dict[str, Any]] = []

    def process(self, deal: DealData) -> dict[str, Any]:
        strategies: list[dict[str, Any]] = []

        wholesale_profit = deal.arv * 0.70 - deal.repairs - deal.asking_price - 5000
        strategies.append({
            "strategy": "Wholesale",
            "profit": round(wholesale_profit, 2),
            "timeline_months": 1,
            "capital_required": 5000,
            "risk": "LOW",
        })

        flip_profit = deal.arv - deal.repairs - deal.asking_price - (deal.arv * 0.08) - (deal.arv * 0.03)
        strategies.append({
            "strategy": "Flip",
            "profit": round(flip_profit, 2),
            "timeline_months": 6,
            "capital_required": deal.repairs + deal.asking_price * 0.25,
            "risk": "MODERATE",
        })

        brrrr_profit = deal.arv * 0.75 - deal.asking_price
        strategies.append({
            "strategy": "BRRRR",
            "profit": round(brrrr_profit, 2),
            "timeline_months": 8,
            "capital_required": deal.repairs + deal.asking_price * 0.20,
            "risk": "MODERATE",
        })

        annual_cash_flow = (deal.rent * 12) - (deal.taxes + deal.insurance + deal.rent * 12 * 0.10)
        strategies.append({
            "strategy": "Rental",
            "profit": round(annual_cash_flow, 2),
            "timeline_months": 24,
            "capital_required": deal.asking_price * 0.25 + deal.repairs,
            "risk": "LOW",
        })

        dev_profit = deal.arv * 1.5 - deal.repairs * 2 - deal.asking_price
        strategies.append({
            "strategy": "Development",
            "profit": round(dev_profit, 2),
            "timeline_months": 18,
            "capital_required": deal.asking_price + deal.repairs * 2,
            "risk": "HIGH",
        })

        ranked = sorted(strategies, key=lambda s: s["profit"], reverse=True)
        result = {
            "deal_id": deal.deal_id,
            "ranked_strategies": ranked,
            "recommended": ranked[0]["strategy"] if ranked else "None",
        }
        self._strategies_run.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        rec_counts: dict[str, int] = {}
        for r in self._strategies_run:
            s = r.get("recommended", "None")
            rec_counts[s] = rec_counts.get(s, 0) + 1
        return {"total_strategy_analyses": len(self._strategies_run), "recommended_counts": rec_counts}


class FinancingEngine:
    """Models financing structures: hard money, private, conventional, seller finance."""

    def __init__(self) -> None:
        self._structures: list[dict[str, Any]] = []

    def process(self, deal: DealData, loan_to_cost: float = 0.75, interest_rate: float = 0.12, term_months: int = 12) -> dict[str, Any]:
        total_cost = deal.asking_price + deal.repairs
        loan_amount = total_cost * loan_to_cost
        cash_needed = total_cost - loan_amount
        monthly_interest = loan_amount * (interest_rate / 12)
        holding_cost = monthly_interest * term_months
        closing_costs = deal.asking_price * 0.03

        result = {
            "deal_id": deal.deal_id,
            "total_cost": round(total_cost, 2),
            "loan_amount": round(loan_amount, 2),
            "cash_needed": round(cash_needed, 2),
            "monthly_interest": round(monthly_interest, 2),
            "holding_cost_est": round(holding_cost, 2),
            "closing_costs": round(closing_costs, 2),
            "interest_rate": interest_rate,
            "term_months": term_months,
        }
        self._structures.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        if not self._structures:
            return {"total_structured": 0}
        avg_cash = sum(s["cash_needed"] for s in self._structures) / len(self._structures)
        return {"total_structured": len(self._structures), "avg_cash_needed": round(avg_cash, 2)}


class RiskEngine:
    """Scores deal risk 0-100 across 9 risk dimensions."""

    RISK_CATEGORIES = [
        "market_risk", "property_risk", "contractor_risk", "legal_risk",
        "title_risk", "capital_risk", "execution_risk", "tenant_risk", "economic_risk",
    ]

    def __init__(self) -> None:
        self._scores: list[dict[str, Any]] = []

    def process(self, deal: DealData, category_scores: dict[str, int]) -> dict[str, Any]:
        total = sum(category_scores.get(c, 0) for c in self.RISK_CATEGORIES)
        avg = total / len(self.RISK_CATEGORIES) if self.RISK_CATEGORIES else 0

        if avg <= 25:
            level = "LOW"
        elif avg <= 50:
            level = "MODERATE"
        elif avg <= 75:
            level = "HIGH"
        else:
            level = "CRITICAL"

        result = {
            "deal_id": deal.deal_id,
            "category_scores": {c: category_scores.get(c, 0) for c in self.RISK_CATEGORIES},
            "total_score": round(avg, 1),
            "risk_level": level,
            "scored_at": datetime.utcnow().isoformat(),
        }
        self._scores.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        if not self._scores:
            return {"total_scored": 0}
        by_level: dict[str, int] = {}
        for s in self._scores:
            lv = s["risk_level"]
            by_level[lv] = by_level.get(lv, 0) + 1
        return {"total_scored": len(self._scores), "by_risk_level": by_level}


class StressTestEngine:
    """Stress-tests deal profitability under adverse scenarios."""

    SCENARIOS = {
        "arv_drop_10": ("arv", -0.10),
        "arv_drop_20": ("arv", -0.20),
        "repairs_up_15": ("repairs", 0.15),
        "repairs_up_25": ("repairs", 0.25),
    }

    def __init__(self) -> None:
        self._tests: list[dict[str, Any]] = []

    def _calc_profit(self, arv: float, repairs: float, purchase: float, margin: float = 0.30) -> float:
        return arv - repairs - purchase - (arv * margin)

    def process(self, deal: DealData, target_roi: float = 0.15) -> dict[str, Any]:
        base_profit = self._calc_profit(deal.arv, deal.repairs, deal.asking_price)
        results: dict[str, float] = {}

        for scenario, (field, delta) in self.SCENARIOS.items():
            if field == "arv":
                adj_arv = deal.arv * (1 + delta)
                profit = self._calc_profit(adj_arv, deal.repairs, deal.asking_price)
            else:
                adj_repairs = deal.repairs * (1 + delta)
                profit = self._calc_profit(deal.arv, adj_repairs, deal.asking_price)
            results[f"{scenario}_profit"] = round(profit, 2)

        hold_doubled = self._calc_profit(deal.arv, deal.repairs, deal.asking_price) - (deal.asking_price * 0.015 * 6)
        results["hold_time_doubled_profit"] = round(hold_doubled, 2)

        worst_case = min(results.values())
        total_invested = deal.asking_price + deal.repairs
        worst_roi = worst_case / total_invested if total_invested else 0
        passes = worst_roi >= target_roi

        result = {
            "deal_id": deal.deal_id,
            "base_profit": round(base_profit, 2),
            **results,
            "worst_case_profit": worst_case,
            "worst_case_roi": round(worst_roi, 4),
            "target_roi": target_roi,
            "passes_stress_test": passes,
        }
        self._tests.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        passes = sum(1 for t in self._tests if t["passes_stress_test"])
        return {"total_tested": len(self._tests), "passes": passes, "fails": len(self._tests) - passes}


class ExitEngine:
    """Models all exit scenarios and calculates net proceeds."""

    def __init__(self) -> None:
        self._exits: list[dict[str, Any]] = []

    def process(self, deal: DealData) -> dict[str, Any]:
        wholesale_profit = deal.arv * 0.70 - deal.asking_price - 3000
        flip_profit = deal.arv * 0.92 - deal.repairs - deal.asking_price - (deal.arv * 0.06)
        rental_equity = deal.arv - deal.asking_price - deal.repairs
        rental_cf = deal.rent - (deal.taxes / 12) - (deal.insurance / 12) - (deal.rent * 0.10)
        brrrr_returned = (deal.arv * 0.75) - deal.asking_price - deal.repairs
        dev_profit = deal.arv * 1.4 - deal.repairs * 1.8 - deal.asking_price

        exits = [
            ("Wholesale", wholesale_profit),
            ("Flip", flip_profit),
            ("BRRRR", brrrr_returned),
            ("Rental", rental_cf * 12),
            ("Development", dev_profit),
        ]
        exits_sorted = sorted(exits, key=lambda x: x[1], reverse=True)

        result = {
            "deal_id": deal.deal_id,
            "wholesale_profit": round(wholesale_profit, 2),
            "flip_profit": round(flip_profit, 2),
            "rental_equity": round(rental_equity, 2),
            "rental_cash_flow_annual": round(rental_cf * 12, 2),
            "brrrr_cash_returned": round(brrrr_returned, 2),
            "development_profit": round(dev_profit, 2),
            "recommended_exit": exits_sorted[0][0],
        }
        self._exits.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        by_exit: dict[str, int] = {}
        for e in self._exits:
            ex = e.get("recommended_exit", "Unknown")
            by_exit[ex] = by_exit.get(ex, 0) + 1
        return {"total_exit_models": len(self._exits), "recommended_exits": by_exit}


class InvestorEngine:
    """Matches deals to investors and calculates investor returns."""

    def __init__(self) -> None:
        self._matches: list[dict[str, Any]] = []

    def process(self, deal: DealData, profit: float, investors: list[dict[str, Any]]) -> dict[str, Any]:
        matched = [
            inv for inv in investors
            if inv.get("available_capital", 0) >= deal.asking_price * 0.20
        ]
        result = {
            "deal_id": deal.deal_id,
            "matched_investors": len(matched),
            "investors": [inv.get("investor_id", "") for inv in matched],
            "projected_profit": round(profit, 2),
        }
        self._matches.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        return {"total_investor_matches": len(self._matches)}


class KillSwitchEngine:
    """Auto-kills deals that fail 3 or more critical checks."""

    KILL_THRESHOLD = 3

    def __init__(self) -> None:
        self._decisions: list[dict[str, Any]] = []

    def process(self, deal: DealData, check_results: dict[str, str]) -> dict[str, Any]:
        fails = [k for k, v in check_results.items() if v == "FAIL"]
        kill = len(fails) >= self.KILL_THRESHOLD

        result = {
            "deal_id": deal.deal_id,
            "check_results": check_results,
            "fail_count": len(fails),
            "failed_checks": fails,
            "decision": "KILL" if kill else "CONTINUE",
            "evaluated_at": datetime.utcnow().isoformat(),
        }
        self._decisions.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        killed = sum(1 for d in self._decisions if d["decision"] == "KILL")
        return {"total_evaluated": len(self._decisions), "killed": killed, "continued": len(self._decisions) - killed}


class DealEngine:
    """Master orchestrator for all 9 Deal Engine sub-systems + Land+Build sub-engine."""

    def __init__(self, enable_land_build_uw_dd: bool = True) -> None:
        self.intake = IntakeEngine()
        self.acquisition = AcquisitionEngine()
        self.strategy = StrategyEngine()
        self.financing = FinancingEngine()
        self.risk = RiskEngine()
        self.stress_test = StressTestEngine()
        self.exit = ExitEngine()
        self.investor = InvestorEngine()
        self.kill_switch = KillSwitchEngine()
        
        if enable_land_build_uw_dd:
            try:
                from dynasty_os.engines.land_build_uw_dd_engine import LandBuild_UW_DDEngine
                self.land_build_uw_dd = LandBuild_UW_DDEngine()
            except ImportError:
                self.land_build_uw_dd = None
        else:
            self.land_build_uw_dd = None

    def analyze(
        self,
        deal: DealData,
        risk_scores: dict[str, int] | None = None,
        target_margin: float = 0.30,
        target_roi: float = 0.15,
    ) -> dict[str, Any]:
        intake_result = self.intake.process(deal.__dict__)
        if not intake_result["valid"]:
            return {"deal_id": deal.deal_id, "outcome": "KILL", "reason": "Invalid intake", "details": intake_result}

        acq = self.acquisition.process(deal, target_margin)
        strategy = self.strategy.process(deal)
        financing = self.financing.process(deal)
        risk_result = self.risk.process(deal, risk_scores or {})
        stress = self.stress_test.process(deal, target_roi)
        exit_result = self.exit.process(deal)

        kill_checks = {
            "meets_mao": "PASS" if acq["meets_mao"] else "FAIL",
            "stress_test": "PASS" if stress["passes_stress_test"] else "FAIL",
            "risk_level": "PASS" if risk_result["risk_level"] in ("LOW", "MODERATE") else "FAIL",
        }
        kill_result = self.kill_switch.process(deal, kill_checks)

        if kill_result["decision"] == "KILL":
            outcome = "KILL"
        elif risk_result["risk_level"] == "HIGH" and not acq["meets_mao"]:
            outcome = "RENEGOTIATE"
        elif risk_result["risk_level"] in ("HIGH", "CRITICAL"):
            outcome = "GO_WITH_CONDITIONS"
        elif acq["meets_mao"] and stress["passes_stress_test"]:
            outcome = "GO"
        else:
            outcome = "HOLD"

        deal.status = outcome
        return {
            "deal_id": deal.deal_id,
            "outcome": outcome,
            "acquisition": acq,
            "strategy": strategy,
            "financing": financing,
            "risk": risk_result,
            "stress_test": stress,
            "exit": exit_result,
            "kill_switch": kill_result,
        }

    def analyze_land_build_deal(self, property_data: dict[str, Any], 
                                buybox_criteria: dict[str, Any] | None = None) -> dict[str, Any]:
        """Analyze a Land + Build deal using the specialized UW/DD sub-engine.
        
        This method routes to the LandBuild_UW_DDEngine for comprehensive
        Land + Build property analysis with scenario modeling and due diligence.
        """
        if not self.land_build_uw_dd:
            return {"success": False, "reason": "LandBuild_UW_DDEngine not enabled"}
        
        from dynasty_os.engines.land_build_uw_dd_engine import BuyBoxCriteria
        
        if buybox_criteria:
            buybox = BuyBoxCriteria(**buybox_criteria)
        else:
            buybox = None
        
        return self.land_build_uw_dd.analyze_land_build_deal(property_data, buybox)

    def get_metrics(self) -> dict[str, Any]:
        metrics = {
            "intake": self.intake.get_metrics(),
            "acquisition": self.acquisition.get_metrics(),
            "strategy": self.strategy.get_metrics(),
            "financing": self.financing.get_metrics(),
            "risk": self.risk.get_metrics(),
            "stress_test": self.stress_test.get_metrics(),
            "exit": self.exit.get_metrics(),
            "investor": self.investor.get_metrics(),
            "kill_switch": self.kill_switch.get_metrics(),
        }
        if self.land_build_uw_dd:
            metrics["land_build_uw_dd"] = self.land_build_uw_dd.get_metrics()
        return metrics


__all__ = [
    "DealData",
    "DEAL_OUTCOMES",
    "EXIT_STRATEGIES",
    "RISK_LEVELS",
    "IntakeEngine",
    "AcquisitionEngine",
    "StrategyEngine",
    "FinancingEngine",
    "RiskEngine",
    "StressTestEngine",
    "ExitEngine",
    "InvestorEngine",
    "KillSwitchEngine",
    "DealEngine",
]
