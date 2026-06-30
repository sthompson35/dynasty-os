"""Capital Engine — 10 sub-systems for capital acquisition, allocation, and reporting."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


INVESTOR_STAGES = [
    "Prospect", "Warm", "Meeting", "Committed", "Funded", "Repeat", "Strategic Partner",
]

CAPITAL_STATUSES = ["Pending", "Confirmed", "Funded", "Returned"]


@dataclass
class InvestorRecord:
    investor_id: str
    investor_name: str
    entity: str
    status: str = "Prospect"
    available_capital: float = 0.0
    committed_capital: float = 0.0
    invested_capital: float = 0.0
    preferred_return: float = 0.08
    investment_type: str = "Equity"
    risk_profile: str = "Moderate"
    markets: list[str] = field(default_factory=list)
    contact_info: dict[str, Any] = field(default_factory=dict)


class CapitalAcquisitionEngine:
    """Drives capital raise campaigns and investor prospecting."""

    def __init__(self) -> None:
        self._campaigns: list[dict[str, Any]] = []

    def process(self, campaign: dict[str, Any]) -> dict[str, Any]:
        record = {
            "campaign_id": campaign.get("campaign_id", ""),
            "target_raise": campaign.get("target_raise", 0),
            "channel": campaign.get("channel", "Email"),
            "launched_at": datetime.utcnow().isoformat(),
            "status": "Active",
        }
        self._campaigns.append(record)
        return record

    def get_metrics(self) -> dict[str, Any]:
        total_target = sum(c["target_raise"] for c in self._campaigns)
        return {"total_campaigns": len(self._campaigns), "total_target_raise": total_target}


class InvestorRelationsEngine:
    """Manages investor lifecycle, communications, and relationship tracking."""

    def __init__(self) -> None:
        self._investors: dict[str, InvestorRecord] = {}
        self._interactions: list[dict[str, Any]] = []

    def process(self, investor: InvestorRecord, action: str, notes: str = "") -> dict[str, Any]:
        self._investors[investor.investor_id] = investor
        interaction = {
            "investor_id": investor.investor_id,
            "action": action,
            "notes": notes,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._interactions.append(interaction)
        return interaction

    def advance_stage(self, investor: InvestorRecord) -> str:
        idx = INVESTOR_STAGES.index(investor.status) if investor.status in INVESTOR_STAGES else 0
        next_stage = INVESTOR_STAGES[min(idx + 1, len(INVESTOR_STAGES) - 1)]
        investor.status = next_stage
        return next_stage

    def get_metrics(self) -> dict[str, Any]:
        by_stage: dict[str, int] = {}
        for inv in self._investors.values():
            by_stage[inv.status] = by_stage.get(inv.status, 0) + 1
        return {
            "total_investors": len(self._investors),
            "by_stage": by_stage,
            "total_interactions": len(self._interactions),
        }


class CapitalIntelligenceEngine:
    """Tracks market capital flows, interest rates, and funding landscape."""

    def __init__(self) -> None:
        self._intel: list[dict[str, Any]] = []

    def process(self, intel_data: dict[str, Any]) -> dict[str, Any]:
        record = {
            "data": intel_data,
            "recorded_at": datetime.utcnow().isoformat(),
        }
        self._intel.append(record)
        return record

    def get_metrics(self) -> dict[str, Any]:
        return {"total_intel_records": len(self._intel)}


class FundingStructureEngine:
    """Designs deal funding structures: equity splits, waterfall, preferred returns."""

    def __init__(self) -> None:
        self._structures: list[dict[str, Any]] = []

    def process(self, deal_id: str, structure_type: str, total_capital: float,
                preferred_return: float = 0.08, profit_split: float = 0.70) -> dict[str, Any]:
        structure = {
            "deal_id": deal_id,
            "structure_type": structure_type,
            "total_capital": total_capital,
            "preferred_return": preferred_return,
            "gp_split": round(1 - profit_split, 2),
            "lp_split": round(profit_split, 2),
            "annual_preferred_payout": round(total_capital * preferred_return, 2),
            "created_at": datetime.utcnow().isoformat(),
        }
        self._structures.append(structure)
        return structure

    def get_metrics(self) -> dict[str, Any]:
        by_type: dict[str, int] = {}
        for s in self._structures:
            t = s["structure_type"]
            by_type[t] = by_type.get(t, 0) + 1
        return {"total_structures": len(self._structures), "by_type": by_type}


class AllocationEngine:
    """Allocates capital to deals, prioritized by ROI."""

    def __init__(self) -> None:
        self._allocations: list[dict[str, Any]] = []

    def process(self, available_capital: float, deal_queue: list[dict[str, Any]]) -> list[dict[str, Any]]:
        sorted_deals = sorted(deal_queue, key=lambda d: d.get("roi", 0), reverse=True)
        remaining = available_capital
        allocations: list[dict[str, Any]] = []

        for deal in sorted_deals:
            needed = deal.get("capital_needed", 0)
            if remaining >= needed:
                alloc = {
                    "deal_id": deal.get("deal_id", ""),
                    "allocated": needed,
                    "roi": deal.get("roi", 0),
                    "priority_score": deal.get("roi", 0) * 100,
                    "allocated_at": datetime.utcnow().isoformat(),
                }
                allocations.append(alloc)
                self._allocations.append(alloc)
                remaining -= needed

        return allocations

    def get_metrics(self) -> dict[str, Any]:
        total_deployed = sum(a["allocated"] for a in self._allocations)
        return {"total_allocations": len(self._allocations), "total_capital_deployed": total_deployed}


class PortfolioEngine:
    """Tracks portfolio composition, performance, and exposure."""

    ASSET_TYPES = ["Wholesale", "Flip", "Rental", "Land", "Development", "Business Venture", "Joint Venture"]

    def __init__(self) -> None:
        self._positions: list[dict[str, Any]] = []

    def process(self, asset: dict[str, Any]) -> dict[str, Any]:
        position = {
            "asset_type": asset.get("asset_type", ""),
            "asset_value": asset.get("asset_value", 0),
            "equity": asset.get("equity", 0),
            "cash_flow": asset.get("cash_flow", 0),
            "returns": asset.get("returns", 0),
            "exposure": asset.get("exposure", 0),
            "added_at": datetime.utcnow().isoformat(),
        }
        self._positions.append(position)
        return position

    def get_metrics(self) -> dict[str, Any]:
        total_value = sum(p["asset_value"] for p in self._positions)
        total_equity = sum(p["equity"] for p in self._positions)
        total_cf = sum(p["cash_flow"] for p in self._positions)
        return {
            "total_positions": len(self._positions),
            "total_portfolio_value": total_value,
            "total_equity": total_equity,
            "total_monthly_cash_flow": total_cf,
        }


class RiskEngine:
    """Monitors capital risk concentration, liquidity, and market exposure."""

    def __init__(self) -> None:
        self._risk_snapshots: list[dict[str, Any]] = []

    def process(self, portfolio_data: dict[str, Any], max_concentration: float = 0.25) -> dict[str, Any]:
        total = portfolio_data.get("total_capital", 1)
        positions = portfolio_data.get("positions", [])
        risks: list[str] = []

        for pos in positions:
            concentration = pos.get("exposure", 0) / total
            if concentration > max_concentration:
                risks.append(f"Concentration risk: {pos.get('asset_type', '')} at {concentration:.1%}")

        liquidity_ratio = portfolio_data.get("liquid_capital", 0) / total
        if liquidity_ratio < 0.10:
            risks.append(f"Liquidity risk: only {liquidity_ratio:.1%} liquid")

        snapshot = {
            "risk_flags": risks,
            "risk_count": len(risks),
            "overall_risk": "HIGH" if len(risks) >= 3 else "MODERATE" if len(risks) >= 1 else "LOW",
            "evaluated_at": datetime.utcnow().isoformat(),
        }
        self._risk_snapshots.append(snapshot)
        return snapshot

    def get_metrics(self) -> dict[str, Any]:
        if not self._risk_snapshots:
            return {"total_snapshots": 0}
        avg_risks = sum(s["risk_count"] for s in self._risk_snapshots) / len(self._risk_snapshots)
        return {"total_snapshots": len(self._risk_snapshots), "avg_risk_flags_per_snapshot": round(avg_risks, 1)}


class ReportingEngine:
    """Generates investor reports, K-1 summaries, and capital statements."""

    def __init__(self) -> None:
        self._reports: list[dict[str, Any]] = []

    def process(self, investor_id: str, report_type: str, period: str, data: dict[str, Any]) -> dict[str, Any]:
        report = {
            "investor_id": investor_id,
            "report_type": report_type,
            "period": period,
            "data": data,
            "generated_at": datetime.utcnow().isoformat(),
        }
        self._reports.append(report)
        return report

    def get_metrics(self) -> dict[str, Any]:
        by_type: dict[str, int] = {}
        for r in self._reports:
            t = r["report_type"]
            by_type[t] = by_type.get(t, 0) + 1
        return {"total_reports": len(self._reports), "by_type": by_type}


class LiquidityEngine:
    """Manages capital velocity, reserves, and liquidity planning."""

    def __init__(self) -> None:
        self._liquidity_log: list[dict[str, Any]] = []

    def process(self, total_capital: float, deployed_capital: float, reserve_ratio: float = 0.15) -> dict[str, Any]:
        liquid = total_capital - deployed_capital
        required_reserve = total_capital * reserve_ratio
        dry_powder = max(liquid - required_reserve, 0)
        velocity = deployed_capital / total_capital if total_capital else 0

        record = {
            "total_capital": total_capital,
            "deployed_capital": deployed_capital,
            "liquid_capital": liquid,
            "required_reserve": required_reserve,
            "dry_powder": dry_powder,
            "capital_velocity": round(velocity, 4),
            "liquidity_status": "ADEQUATE" if liquid >= required_reserve else "WARNING",
            "recorded_at": datetime.utcnow().isoformat(),
        }
        self._liquidity_log.append(record)
        return record

    def get_metrics(self) -> dict[str, Any]:
        if not self._liquidity_log:
            return {"total_snapshots": 0}
        latest = self._liquidity_log[-1]
        return {
            "total_snapshots": len(self._liquidity_log),
            "latest_dry_powder": latest["dry_powder"],
            "latest_velocity": latest["capital_velocity"],
        }


class CapitalRecyclingEngine:
    """Recycles returned capital from closed deals back into the pipeline."""

    def __init__(self) -> None:
        self._recycles: list[dict[str, Any]] = []

    def process(self, deal_id: str, capital_returned: float, next_deal_id: str = "") -> dict[str, Any]:
        recycle = {
            "source_deal_id": deal_id,
            "capital_returned": capital_returned,
            "reallocated_to": next_deal_id,
            "recycled_at": datetime.utcnow().isoformat(),
        }
        self._recycles.append(recycle)
        return recycle

    def get_metrics(self) -> dict[str, Any]:
        total_recycled = sum(r["capital_returned"] for r in self._recycles)
        return {"total_recycles": len(self._recycles), "total_capital_recycled": total_recycled}


class CapitalEngine:
    """Master orchestrator for all 10 Capital Engine sub-systems."""

    def __init__(self) -> None:
        self.acquisition = CapitalAcquisitionEngine()
        self.investor_relations = InvestorRelationsEngine()
        self.intelligence = CapitalIntelligenceEngine()
        self.funding_structure = FundingStructureEngine()
        self.allocation = AllocationEngine()
        self.portfolio = PortfolioEngine()
        self.risk = RiskEngine()
        self.reporting = ReportingEngine()
        self.liquidity = LiquidityEngine()
        self.recycling = CapitalRecyclingEngine()

    def get_metrics(self) -> dict[str, Any]:
        return {
            "acquisition": self.acquisition.get_metrics(),
            "investor_relations": self.investor_relations.get_metrics(),
            "intelligence": self.intelligence.get_metrics(),
            "funding_structure": self.funding_structure.get_metrics(),
            "allocation": self.allocation.get_metrics(),
            "portfolio": self.portfolio.get_metrics(),
            "risk": self.risk.get_metrics(),
            "reporting": self.reporting.get_metrics(),
            "liquidity": self.liquidity.get_metrics(),
            "recycling": self.recycling.get_metrics(),
        }


__all__ = [
    "InvestorRecord",
    "INVESTOR_STAGES",
    "CapitalAcquisitionEngine",
    "InvestorRelationsEngine",
    "CapitalIntelligenceEngine",
    "FundingStructureEngine",
    "AllocationEngine",
    "PortfolioEngine",
    "RiskEngine",
    "ReportingEngine",
    "LiquidityEngine",
    "CapitalRecyclingEngine",
    "CapitalEngine",
]
