"""BARBARA — Investor Relations Commander. Manages investor lifecycle and capital communications."""
from __future__ import annotations
from datetime import datetime
from typing import Any

from dynasty_os.engines.capital_engine import CapitalEngine, InvestorRecord


class BarbaraTrooper:
    name = "BARBARA"
    role = "Investor Relations"
    domain = "Capital Engine / InvestorOS"
    capabilities = [
        "investor communications",
        "distribution reporting",
        "capital raising",
        "investor onboarding",
        "deal opportunity presentation",
    ]
    investor_lifecycle_stages = [
        "Prospect",
        "Warm",
        "Meeting",
        "Committed",
        "Funded",
        "Repeat Investor",
        "Strategic Partner",
    ]

    def __init__(self) -> None:
        self._engine = CapitalEngine()
        self._investors: dict[str, InvestorRecord] = {}
        self._communications: list[dict[str, Any]] = []

    def add_investor(self, investor_data: dict[str, Any]) -> InvestorRecord:
        investor = InvestorRecord(
            investor_id=investor_data.get("investor_id", ""),
            investor_name=investor_data.get("investor_name", ""),
            entity=investor_data.get("entity", ""),
            status=investor_data.get("status", "Prospect"),
            available_capital=float(investor_data.get("available_capital", 0)),
            preferred_return=float(investor_data.get("preferred_return", 0.08)),
            investment_type=investor_data.get("investment_type", "Equity"),
            risk_profile=investor_data.get("risk_profile", "Moderate"),
            markets=investor_data.get("markets", []),
        )
        self._investors[investor.investor_id] = investor
        self._engine.investor_relations.process(investor, "Added to CRM")
        return investor

    def advance_investor(self, investor_id: str) -> dict[str, Any]:
        investor = self._investors.get(investor_id)
        if not investor:
            return {"error": f"Investor {investor_id} not found"}
        old_stage = investor.status
        new_stage = self._engine.investor_relations.advance_stage(investor)
        comm = {
            "investor_id": investor_id,
            "action": "Stage Advance",
            "from_stage": old_stage,
            "to_stage": new_stage,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._communications.append(comm)
        return comm

    def send_distribution_report(self, investor_id: str, period: str, data: dict[str, Any]) -> dict[str, Any]:
        report = self._engine.reporting.process(investor_id, "Distribution Report", period, data)
        comm = {
            "investor_id": investor_id,
            "type": "Distribution Report",
            "period": period,
            "sent_at": datetime.utcnow().isoformat(),
        }
        self._communications.append(comm)
        return {"report": report, "communication": comm}

    def present_opportunity(self, investor_id: str, deal_summary: dict[str, Any]) -> dict[str, Any]:
        investor = self._investors.get(investor_id)
        if not investor:
            return {"error": f"Investor {investor_id} not found"}

        fits_budget = investor.available_capital >= deal_summary.get("capital_needed", 0)
        presentation = {
            "investor_id": investor_id,
            "investor_name": investor.investor_name,
            "deal_id": deal_summary.get("deal_id", ""),
            "capital_needed": deal_summary.get("capital_needed", 0),
            "projected_return": deal_summary.get("projected_return", 0),
            "fits_investor_budget": fits_budget,
            "presented_at": datetime.utcnow().isoformat(),
        }
        self._communications.append(presentation)
        return presentation

    def get_status(self) -> dict[str, Any]:
        by_stage: dict[str, int] = {}
        total_available = 0.0
        for inv in self._investors.values():
            by_stage[inv.status] = by_stage.get(inv.status, 0) + 1
            total_available += inv.available_capital

        return {
            "trooper": self.name,
            "role": self.role,
            "total_investors": len(self._investors),
            "by_stage": by_stage,
            "total_available_capital": total_available,
            "total_communications": len(self._communications),
        }
