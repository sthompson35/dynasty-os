"""Command Center Dashboard — unified real-time view of all Dynasty OS engines."""
from __future__ import annotations
from datetime import datetime
from typing import Any


class CommandCenterDashboard:
    """Aggregates live metrics from all Dynasty OS engines and troopers."""

    def __init__(self, db_client: Any = None) -> None:
        self._db = db_client
        self._cache: dict[str, Any] = {}

    def get_lead_status(self) -> dict[str, Any]:
        if self._db:
            return self._query_lead_status()
        return {
            "section": "Lead Engine",
            "total_leads": 0,
            "new_leads_today": 0,
            "qualified_leads": 0,
            "appointments_set": 0,
            "offers_sent": 0,
            "contracts_pending": 0,
            "conversion_rate": 0.0,
            "grade_breakdown": {"A": 0, "B": 0, "C": 0, "D": 0},
            "top_sources": [],
            "updated_at": datetime.utcnow().isoformat(),
        }

    def _query_lead_status(self) -> dict[str, Any]:
        return {
            "section": "Lead Engine",
            "total_leads": self._db.count("leads"),
            "new_leads_today": self._db.count("leads", {"date": "today"}),
            "qualified_leads": self._db.count("leads", {"status": "Qualified"}),
            "appointments_set": self._db.count("leads", {"pipeline_stage": "Appointment Set"}),
            "offers_sent": self._db.count("leads", {"pipeline_stage": "Offer Sent"}),
            "contracts_pending": self._db.count("leads", {"pipeline_stage": "Under Contract"}),
            "conversion_rate": 0.0,
            "updated_at": datetime.utcnow().isoformat(),
        }

    def get_deal_status(self) -> dict[str, Any]:
        return {
            "section": "Deal Engine",
            "pipeline_value": 0.0,
            "active_deals": 0,
            "go_deals": 0,
            "go_with_conditions_deals": 0,
            "renegotiate_deals": 0,
            "hold_deals": 0,
            "kill_deals": 0,
            "average_roi": 0.0,
            "average_arv": 0.0,
            "average_mao": 0.0,
            "updated_at": datetime.utcnow().isoformat(),
        }

    def get_capital_status(self) -> dict[str, Any]:
        return {
            "section": "Capital Engine",
            "available_capital": 0.0,
            "committed_capital": 0.0,
            "deployed_capital": 0.0,
            "dry_powder": 0.0,
            "capital_velocity": 0.0,
            "total_investors": 0,
            "active_investors": 0,
            "distributions_pending": 0.0,
            "portfolio_value": 0.0,
            "updated_at": datetime.utcnow().isoformat(),
        }

    def get_operations_status(self) -> dict[str, Any]:
        return {
            "section": "Operations Engine",
            "active_projects": 0,
            "projects_on_schedule": 0,
            "projects_behind_schedule": 0,
            "total_budget_deployed": 0.0,
            "total_actual_cost": 0.0,
            "budget_variance": 0.0,
            "average_completion_pct": 0.0,
            "high_risk_projects": 0,
            "inspections_passed_today": 0,
            "inspections_failed_today": 0,
            "updated_at": datetime.utcnow().isoformat(),
        }

    def get_disposition_status(self) -> dict[str, Any]:
        return {
            "section": "Disposition Engine",
            "properties_for_sale": 0,
            "active_marketing_campaigns": 0,
            "pending_offers": 0,
            "accepted_offers": 0,
            "pending_closings": 0,
            "capital_recovered_mtd": 0.0,
            "capital_recovered_ytd": 0.0,
            "average_days_to_exit": 0,
            "expected_profit_pipeline": 0.0,
            "actual_profit_ytd": 0.0,
            "updated_at": datetime.utcnow().isoformat(),
        }

    def get_investor_status(self) -> dict[str, Any]:
        return {
            "section": "Investor OS",
            "active_investors": 0,
            "committed_capital": 0.0,
            "distributions_due_this_month": 0.0,
            "distributions_sent_ytd": 0.0,
            "investor_stage_breakdown": {
                "Prospect": 0,
                "Warm": 0,
                "Meeting": 0,
                "Committed": 0,
                "Funded": 0,
                "Repeat": 0,
                "Strategic Partner": 0,
            },
            "avg_preferred_return": 0.0,
            "updated_at": datetime.utcnow().isoformat(),
        }

    def get_full_dashboard(self) -> dict[str, Any]:
        lead = self.get_lead_status()
        deal = self.get_deal_status()
        capital = self.get_capital_status()
        ops = self.get_operations_status()
        disposition = self.get_disposition_status()
        investor = self.get_investor_status()

        health_score = self._compute_health_score(lead, deal, capital, ops)

        return {
            "dashboard": "Dynasty OS Command Center",
            "health_score": health_score,
            "health_label": self._health_label(health_score),
            "generated_at": datetime.utcnow().isoformat(),
            "sections": {
                "leads": lead,
                "deals": deal,
                "capital": capital,
                "operations": ops,
                "disposition": disposition,
                "investors": investor,
            },
        }

    def _compute_health_score(
        self,
        lead: dict[str, Any],
        deal: dict[str, Any],
        capital: dict[str, Any],
        ops: dict[str, Any],
    ) -> int:
        score = 100

        if lead.get("new_leads_today", 0) == 0:
            score -= 10
        if deal.get("kill_deals", 0) > deal.get("go_deals", 1) * 2:
            score -= 15
        if capital.get("dry_powder", 1) == 0:
            score -= 20
        if ops.get("projects_behind_schedule", 0) > ops.get("active_projects", 1) * 0.3:
            score -= 15

        return max(score, 0)

    def _health_label(self, score: int) -> str:
        if score >= 85:
            return "EXCELLENT"
        elif score >= 70:
            return "GOOD"
        elif score >= 50:
            return "NEEDS_ATTENTION"
        else:
            return "CRITICAL"
