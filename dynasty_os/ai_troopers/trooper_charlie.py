"""TROOPER_CHARLIE — Deal Commander (Chief Transaction Logic Officer)."""
from __future__ import annotations
from datetime import datetime
from typing import Any

from dynasty_os.engines.deal_engine import DealData, DealEngine


DEAL_OUTCOMES = ["GO", "GO_WITH_CONDITIONS", "RENEGOTIATE", "HOLD", "KILL"]


class TrooperCharlie:
    name = "TROOPER_CHARLIE"
    role = "Deal Commander"
    domain = "Deal Engine"
    capabilities = [
        "full deal analysis",
        "MAO calculation",
        "risk scoring",
        "stress testing",
        "deal decisioning",
    ]

    def __init__(self) -> None:
        self._engine = DealEngine()
        self._deals_analyzed: list[dict[str, Any]] = []

    def analyze_deal(self, deal_data: dict[str, Any]) -> dict[str, Any]:
        deal = DealData(
            deal_id=deal_data.get("deal_id", ""),
            property_id=deal_data.get("property_id", ""),
            seller=deal_data.get("seller", ""),
            asking_price=float(deal_data.get("asking_price", 0)),
            arv=float(deal_data.get("arv", 0)),
            repairs=float(deal_data.get("repairs", 0)),
            beds=float(deal_data.get("beds", 0)),
            baths=float(deal_data.get("baths", 0)),
            sqft=float(deal_data.get("sqft", 0)),
            rent=float(deal_data.get("rent", 0)),
            taxes=float(deal_data.get("taxes", 0)),
            insurance=float(deal_data.get("insurance", 0)),
            zoning=deal_data.get("zoning", ""),
            flood_status=deal_data.get("flood_status", "Unknown"),
            title_status=deal_data.get("title_status", "Unknown"),
        )

        risk_scores = deal_data.get("risk_scores", {})
        target_margin = float(deal_data.get("target_margin", 0.30))
        target_roi = float(deal_data.get("target_roi", 0.15))

        analysis = self._engine.analyze(
            deal,
            risk_scores=risk_scores,
            target_margin=target_margin,
            target_roi=target_roi,
        )

        outcome = analysis.get("outcome", "KILL")
        result = {
            "commander": self.name,
            "deal_id": deal.deal_id,
            "outcome": outcome,
            "outcome_label": self._label(outcome),
            "analysis": analysis,
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        self._deals_analyzed.append(result)
        return result

    def _label(self, outcome: str) -> str:
        labels = {
            "GO": "Deal approved — execute acquisition",
            "GO_WITH_CONDITIONS": "Deal approved with risk mitigation conditions",
            "RENEGOTIATE": "Price/terms need renegotiation",
            "HOLD": "Hold for market conditions or further analysis",
            "KILL": "Deal does not meet Dynasty OS criteria",
        }
        return labels.get(outcome, outcome)

    def get_metrics(self) -> dict[str, Any]:
        outcome_counts: dict[str, int] = {}
        for d in self._deals_analyzed:
            o = d["outcome"]
            outcome_counts[o] = outcome_counts.get(o, 0) + 1
        return {
            "total_deals_analyzed": len(self._deals_analyzed),
            "outcome_distribution": outcome_counts,
            "engine_metrics": self._engine.get_metrics(),
        }
