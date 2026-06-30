"""Disposition Engine — 10 sub-systems for property exit strategy and transaction execution."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


BUYER_TYPES = [
    "Cash Buyer", "Flipper", "Landlord", "Developer",
    "Institutional", "Owner Occupant", "Builder", "Fund", "REIT",
]

EXIT_STRATEGIES = ["Wholesale", "Flip", "BRRRR", "Hold", "Development"]

PRICING_TIERS = ["Aggressive", "Market", "Quick Sale", "Wholesale", "Investor"]


@dataclass
class DispositionMatrix:
    """Compares exit strategies across key dimensions."""
    strategy: str
    estimated_profit: float
    timeline_days: int
    risk_level: str
    capital_recovery_pct: float
    risk_adjusted_return: float = 0.0

    def __post_init__(self) -> None:
        risk_multipliers = {"LOW": 1.0, "MODERATE": 0.85, "HIGH": 0.70, "CRITICAL": 0.50}
        self.risk_adjusted_return = self.estimated_profit * risk_multipliers.get(self.risk_level, 0.85)


def build_disposition_matrix(
    arv: float, asking_price: float, repairs: float,
    rent: float = 0, taxes: float = 0, insurance: float = 0,
) -> list[DispositionMatrix]:
    wholesale_profit = arv * 0.70 - asking_price - 3000
    flip_profit = arv * 0.92 - repairs - asking_price - (arv * 0.06)
    brrrr_returned = arv * 0.75 - asking_price - repairs
    annual_cf = (rent * 12) - (taxes + insurance + rent * 12 * 0.10)
    dev_profit = arv * 1.4 - repairs * 1.8 - asking_price

    return [
        DispositionMatrix("Wholesale", wholesale_profit, 21, "LOW", 1.0),
        DispositionMatrix("Flip", flip_profit, 180, "MODERATE", 0.95),
        DispositionMatrix("BRRRR", brrrr_returned, 240, "MODERATE", 0.85),
        DispositionMatrix("Hold", annual_cf, 365, "LOW", 0.60),
        DispositionMatrix("Development", dev_profit, 540, "HIGH", 0.90),
    ]


class ExitStrategyEngine:
    """Ranks exit strategies by risk-adjusted return for each property."""

    def __init__(self) -> None:
        self._analyses: list[dict[str, Any]] = []

    def process(
        self,
        property_id: str,
        arv: float,
        asking_price: float,
        repairs: float,
        rent: float = 0,
        taxes: float = 0,
        insurance: float = 0,
    ) -> dict[str, Any]:
        matrix = build_disposition_matrix(arv, asking_price, repairs, rent, taxes, insurance)
        ranked = sorted(matrix, key=lambda m: m.risk_adjusted_return, reverse=True)

        result = {
            "property_id": property_id,
            "ranked_exits": [
                {
                    "strategy": m.strategy,
                    "estimated_profit": round(m.estimated_profit, 2),
                    "timeline_days": m.timeline_days,
                    "risk_level": m.risk_level,
                    "risk_adjusted_return": round(m.risk_adjusted_return, 2),
                }
                for m in ranked
            ],
            "recommended": ranked[0].strategy if ranked else "None",
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        self._analyses.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        rec_counts: dict[str, int] = {}
        for a in self._analyses:
            s = a.get("recommended", "None")
            rec_counts[s] = rec_counts.get(s, 0) + 1
        return {"total_analyses": len(self._analyses), "recommended_counts": rec_counts}


class BuyerEngine:
    """Maintains buyer database and matches buyers to properties."""

    def __init__(self) -> None:
        self._buyers: dict[str, dict[str, Any]] = {}
        self._matches: list[dict[str, Any]] = []

    def register_buyer(self, buyer: dict[str, Any]) -> dict[str, Any]:
        self._buyers[buyer.get("buyer_id", "")] = buyer
        return buyer

    def process(self, property_data: dict[str, Any]) -> list[dict[str, Any]]:
        price = property_data.get("asking_price", 0)
        matches = [
            b for b in self._buyers.values()
            if b.get("min_price", 0) <= price <= b.get("max_price", float("inf"))
            and b.get("funding_capacity", 0) >= price
        ]
        matches_sorted = sorted(matches, key=lambda b: b.get("buyer_score", 0), reverse=True)
        self._matches.append({
            "property_id": property_data.get("property_id", ""),
            "matched_buyers": len(matches_sorted),
            "matched_at": datetime.utcnow().isoformat(),
        })
        return matches_sorted

    def get_metrics(self) -> dict[str, Any]:
        by_type: dict[str, int] = {}
        for b in self._buyers.values():
            t = b.get("buyer_type", "Unknown")
            by_type[t] = by_type.get(t, 0) + 1
        return {"total_buyers": len(self._buyers), "by_type": by_type, "total_matches": len(self._matches)}


class MarketingEngine:
    """Manages property marketing campaigns across all channels."""

    CHANNELS = [
        "MLS", "Zillow", "BiggerPockets", "Facebook Marketplace", "Instagram",
        "Email Blast", "Direct Mail", "Bandit Signs", "Text Blast", "Investor Network",
    ]

    def __init__(self) -> None:
        self._campaigns: list[dict[str, Any]] = []

    def process(self, property_id: str, channels: list[str], assets: dict[str, Any], days: int = 30) -> dict[str, Any]:
        campaign = {
            "marketing_id": f"MKTG-{property_id}-{len(self._campaigns)+1:04d}",
            "property_id": property_id,
            "channels": channels,
            "assets": assets,
            "campaign_days": days,
            "views": 0,
            "inquiries": 0,
            "status": "Active",
            "launched_at": datetime.utcnow().isoformat(),
        }
        self._campaigns.append(campaign)
        return campaign

    def get_metrics(self) -> dict[str, Any]:
        active = sum(1 for c in self._campaigns if c["status"] == "Active")
        total_inquiries = sum(c["inquiries"] for c in self._campaigns)
        return {"total_campaigns": len(self._campaigns), "active": active, "total_inquiries": total_inquiries}


class PricingEngine:
    """Generates pricing tiers for each disposition strategy."""

    def __init__(self) -> None:
        self._pricings: list[dict[str, Any]] = []

    def process(self, property_id: str, arv: float, repairs: float, holding_cost: float = 0) -> dict[str, Any]:
        pricing = {
            "property_id": property_id,
            "arv": arv,
            "Aggressive": round(arv * 0.95, 2),
            "Market": round(arv * 0.90, 2),
            "Quick Sale": round(arv * 0.85, 2),
            "Wholesale": round(arv * 0.70 - repairs - 5000, 2),
            "Investor": round(arv * 0.75 - repairs, 2),
            "priced_at": datetime.utcnow().isoformat(),
        }
        self._pricings.append(pricing)
        return pricing

    def get_metrics(self) -> dict[str, Any]:
        return {"total_pricings": len(self._pricings)}


class TransactionEngine:
    """Manages offer negotiation, contract execution, and closing coordination."""

    def __init__(self) -> None:
        self._offers: list[dict[str, Any]] = []
        self._contracts: list[dict[str, Any]] = []

    def submit_offer(self, property_id: str, buyer_id: str, offer_price: float, notes: str = "") -> dict[str, Any]:
        offer = {
            "offer_id": f"OFF-{len(self._offers)+1:06d}",
            "property_id": property_id,
            "buyer_id": buyer_id,
            "offer_price": offer_price,
            "status": "Pending",
            "notes": notes,
            "submitted_at": datetime.utcnow().isoformat(),
        }
        self._offers.append(offer)
        return offer

    def process(self, offer: dict[str, Any], action: str, counter_price: float = 0) -> dict[str, Any]:
        offer["status"] = action
        if action == "Countered":
            offer["counter_price"] = counter_price
        offer["actioned_at"] = datetime.utcnow().isoformat()
        return offer

    def get_metrics(self) -> dict[str, Any]:
        by_status: dict[str, int] = {}
        for o in self._offers:
            s = o["status"]
            by_status[s] = by_status.get(s, 0) + 1
        return {"total_offers": len(self._offers), "by_status": by_status}


class InvestorExitEngine:
    """Handles investor exit distributions, returns, and K-1 summaries."""

    def __init__(self) -> None:
        self._distributions: list[dict[str, Any]] = []

    def process(self, deal_id: str, investor_id: str, net_profit: float,
                invested_amount: float, preferred_return: float = 0.08) -> dict[str, Any]:
        pref_payment = invested_amount * preferred_return
        remaining_profit = max(net_profit - pref_payment, 0)
        investor_share = pref_payment + (remaining_profit * 0.70)

        distribution = {
            "deal_id": deal_id,
            "investor_id": investor_id,
            "invested_amount": invested_amount,
            "preferred_return_payment": round(pref_payment, 2),
            "profit_share": round(remaining_profit * 0.70, 2),
            "total_distribution": round(investor_share, 2),
            "roi": round(investor_share / invested_amount, 4) if invested_amount else 0,
            "distributed_at": datetime.utcnow().isoformat(),
        }
        self._distributions.append(distribution)
        return distribution

    def get_metrics(self) -> dict[str, Any]:
        total_dist = sum(d["total_distribution"] for d in self._distributions)
        return {"total_distributions": len(self._distributions), "total_capital_distributed": round(total_dist, 2)}


class RentalConversionEngine:
    """Converts flip or wholesale candidates to rental hold when market conditions shift."""

    def __init__(self) -> None:
        self._conversions: list[dict[str, Any]] = []

    def process(self, property_id: str, arv: float, rent: float, taxes: float,
                insurance: float, management_rate: float = 0.10) -> dict[str, Any]:
        monthly_expenses = (taxes / 12) + (insurance / 12) + (rent * management_rate)
        noi = (rent * 12) - (monthly_expenses * 12)
        cap_rate = noi / arv if arv else 0

        conversion = {
            "property_id": property_id,
            "gross_rent_monthly": rent,
            "monthly_expenses": round(monthly_expenses, 2),
            "noi_annual": round(noi, 2),
            "cap_rate": round(cap_rate, 4),
            "hold_recommendation": cap_rate >= 0.06,
            "evaluated_at": datetime.utcnow().isoformat(),
        }
        self._conversions.append(conversion)
        return conversion

    def get_metrics(self) -> dict[str, Any]:
        holds = sum(1 for c in self._conversions if c["hold_recommendation"])
        return {"total_evaluated": len(self._conversions), "hold_recommendations": holds}


class PerformanceAnalyticsEngine:
    """Tracks disposition KPIs: days on market, price reductions, close rates."""

    def __init__(self) -> None:
        self._records: list[dict[str, Any]] = []

    def process(self, property_id: str, list_price: float, sale_price: float,
                days_on_market: int, exit_strategy: str) -> dict[str, Any]:
        price_reduction = list_price - sale_price
        price_reduction_pct = price_reduction / list_price if list_price else 0

        record = {
            "property_id": property_id,
            "list_price": list_price,
            "sale_price": sale_price,
            "price_reduction": round(price_reduction, 2),
            "price_reduction_pct": round(price_reduction_pct, 4),
            "days_on_market": days_on_market,
            "exit_strategy": exit_strategy,
            "recorded_at": datetime.utcnow().isoformat(),
        }
        self._records.append(record)
        return record

    def get_metrics(self) -> dict[str, Any]:
        if not self._records:
            return {"total_recorded": 0}
        avg_dom = sum(r["days_on_market"] for r in self._records) / len(self._records)
        avg_reduction = sum(r["price_reduction_pct"] for r in self._records) / len(self._records)
        return {
            "total_recorded": len(self._records),
            "avg_days_on_market": round(avg_dom, 1),
            "avg_price_reduction_pct": round(avg_reduction * 100, 2),
        }


class CapitalRecoveryEngine:
    """Tracks net capital recovery across all disposition events."""

    def __init__(self) -> None:
        self._recoveries: list[dict[str, Any]] = []

    def process(self, property_id: str, sale_price: float, total_invested: float,
                closing_costs: float, agent_fees: float = 0) -> dict[str, Any]:
        net_proceeds = sale_price - closing_costs - agent_fees
        net_profit = net_proceeds - total_invested
        roi = net_profit / total_invested if total_invested else 0

        recovery = {
            "property_id": property_id,
            "sale_price": sale_price,
            "total_invested": total_invested,
            "closing_costs": closing_costs,
            "agent_fees": agent_fees,
            "net_proceeds": round(net_proceeds, 2),
            "net_profit": round(net_profit, 2),
            "roi": round(roi, 4),
            "recovered_at": datetime.utcnow().isoformat(),
        }
        self._recoveries.append(recovery)
        return recovery

    def get_metrics(self) -> dict[str, Any]:
        total_profit = sum(r["net_profit"] for r in self._recoveries)
        avg_roi = sum(r["roi"] for r in self._recoveries) / len(self._recoveries) if self._recoveries else 0
        return {
            "total_dispositions": len(self._recoveries),
            "total_net_profit": round(total_profit, 2),
            "avg_roi": round(avg_roi * 100, 2),
        }


class PortfolioOptimizationEngine:
    """Recommends hold vs. sell decisions based on portfolio composition and market conditions."""

    def __init__(self) -> None:
        self._recommendations: list[dict[str, Any]] = []

    def process(self, portfolio_summary: dict[str, Any], market_conditions: dict[str, Any]) -> dict[str, Any]:
        appreciation = market_conditions.get("annual_appreciation", 0.03)
        rental_demand = market_conditions.get("rental_demand", "Moderate")
        cap_rate = portfolio_summary.get("avg_cap_rate", 0.05)
        cash_flow = portfolio_summary.get("total_monthly_cash_flow", 0)

        score = 0
        if appreciation > 0.05:
            score += 2
        if rental_demand == "High":
            score += 2
        if cap_rate > 0.07:
            score += 2
        if cash_flow > 0:
            score += 2

        recommendation = "HOLD" if score >= 5 else "SELL"

        result = {
            "recommendation": recommendation,
            "optimization_score": score,
            "market_appreciation": appreciation,
            "rental_demand": rental_demand,
            "avg_cap_rate": cap_rate,
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        self._recommendations.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        holds = sum(1 for r in self._recommendations if r["recommendation"] == "HOLD")
        sells = len(self._recommendations) - holds
        return {"total_recommendations": len(self._recommendations), "hold": holds, "sell": sells}


class DispositionEngine:
    """Master orchestrator for all 10 Disposition Engine sub-systems."""

    def __init__(self) -> None:
        self.exit_strategy = ExitStrategyEngine()
        self.buyer = BuyerEngine()
        self.marketing = MarketingEngine()
        self.pricing = PricingEngine()
        self.transaction = TransactionEngine()
        self.investor_exit = InvestorExitEngine()
        self.rental_conversion = RentalConversionEngine()
        self.performance_analytics = PerformanceAnalyticsEngine()
        self.capital_recovery = CapitalRecoveryEngine()
        self.portfolio_optimization = PortfolioOptimizationEngine()

    def get_metrics(self) -> dict[str, Any]:
        return {
            "exit_strategy": self.exit_strategy.get_metrics(),
            "buyer": self.buyer.get_metrics(),
            "marketing": self.marketing.get_metrics(),
            "pricing": self.pricing.get_metrics(),
            "transaction": self.transaction.get_metrics(),
            "investor_exit": self.investor_exit.get_metrics(),
            "rental_conversion": self.rental_conversion.get_metrics(),
            "performance_analytics": self.performance_analytics.get_metrics(),
            "capital_recovery": self.capital_recovery.get_metrics(),
            "portfolio_optimization": self.portfolio_optimization.get_metrics(),
        }


__all__ = [
    "DispositionMatrix",
    "build_disposition_matrix",
    "BUYER_TYPES",
    "EXIT_STRATEGIES",
    "PRICING_TIERS",
    "ExitStrategyEngine",
    "BuyerEngine",
    "MarketingEngine",
    "PricingEngine",
    "TransactionEngine",
    "InvestorExitEngine",
    "RentalConversionEngine",
    "PerformanceAnalyticsEngine",
    "CapitalRecoveryEngine",
    "PortfolioOptimizationEngine",
    "DispositionEngine",
]
