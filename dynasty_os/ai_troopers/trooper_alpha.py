"""TROOPER_ALPHA — Strategy Commander. Evaluates and ranks deal strategies."""
from __future__ import annotations
from datetime import datetime
from typing import Any

from dynasty_os.engines.deal_engine import DealData, StrategyEngine, ExitEngine


class TrooperAlpha:
    name = "TROOPER_ALPHA"
    role = "Strategy Commander"
    domain = "Deal Strategy"
    capabilities = [
        "deal ranking",
        "exit strategy selection",
        "market positioning",
        "portfolio strategy",
    ]

    def __init__(self) -> None:
        self._strategy_engine = StrategyEngine()
        self._exit_engine = ExitEngine()
        self._history: list[dict[str, Any]] = []

    def evaluate_strategy(self, deal_data: dict[str, Any]) -> dict[str, Any]:
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
        )

        strategy_result = self._strategy_engine.process(deal)
        exit_result = self._exit_engine.process(deal)

        evaluation = {
            "deal_id": deal.deal_id,
            "commander": self.name,
            "strategy_ranking": strategy_result["ranked_strategies"],
            "primary_recommendation": strategy_result["recommended"],
            "exit_analysis": exit_result,
            "market_positioning": self._assess_positioning(deal),
            "evaluated_at": datetime.utcnow().isoformat(),
        }
        self._history.append(evaluation)
        return evaluation

    def _assess_positioning(self, deal: DealData) -> dict[str, Any]:
        spread = deal.arv - deal.asking_price - deal.repairs
        spread_pct = spread / deal.arv if deal.arv else 0

        if spread_pct >= 0.35:
            position = "STRONG BUY"
        elif spread_pct >= 0.25:
            position = "BUY"
        elif spread_pct >= 0.15:
            position = "CONDITIONAL"
        else:
            position = "PASS"

        return {
            "spread": round(spread, 2),
            "spread_pct": round(spread_pct * 100, 1),
            "position": position,
        }

    def get_metrics(self) -> dict[str, Any]:
        return {
            "total_evaluations": len(self._history),
            "strategy_metrics": self._strategy_engine.get_metrics(),
            "exit_metrics": self._exit_engine.get_metrics(),
        }
