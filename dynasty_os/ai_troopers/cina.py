"""CINA — Market Intelligence Commander. Tracks market trends, competition, and pricing."""
from __future__ import annotations
from datetime import datetime
from typing import Any


MARKET_INDICATORS = [
    "median_home_price",
    "days_on_market",
    "list_to_sale_ratio",
    "new_listings",
    "active_listings",
    "months_of_supply",
    "foreclosure_rate",
    "population_growth",
    "employment_rate",
    "rental_vacancy_rate",
]


class CinaTrooper:
    name = "CINA"
    role = "Market Intelligence"
    domain = "Market Analysis"
    capabilities = [
        "market trends",
        "county analysis",
        "competition monitoring",
        "pricing intelligence",
        "opportunity zone identification",
    ]

    def __init__(self) -> None:
        self._market_snapshots: dict[str, list[dict[str, Any]]] = {}
        self._competitor_data: list[dict[str, Any]] = []
        self._alerts: list[dict[str, Any]] = []

    def record_market_snapshot(self, market: str, indicators: dict[str, Any]) -> dict[str, Any]:
        snapshot = {
            "market": market,
            "indicators": {k: indicators.get(k) for k in MARKET_INDICATORS},
            "trend": self._compute_trend(market, indicators),
            "recorded_at": datetime.utcnow().isoformat(),
        }
        if market not in self._market_snapshots:
            self._market_snapshots[market] = []
        self._market_snapshots[market].append(snapshot)
        return snapshot

    def _compute_trend(self, market: str, current: dict[str, Any]) -> str:
        history = self._market_snapshots.get(market, [])
        if len(history) < 2:
            return "INSUFFICIENT_DATA"

        prev = history[-1]["indicators"]
        cur_price = current.get("median_home_price", 0)
        prev_price = prev.get("median_home_price", 0)

        if prev_price and cur_price:
            change = (cur_price - prev_price) / prev_price
            if change > 0.03:
                return "APPRECIATING"
            elif change < -0.03:
                return "DECLINING"
        return "STABLE"

    def analyze_county(self, county: str, state: str, data: dict[str, Any]) -> dict[str, Any]:
        months_supply = data.get("months_of_supply", 6)
        vacancy = data.get("rental_vacancy_rate", 0.05)

        if months_supply < 3 and vacancy < 0.05:
            opportunity = "HIGH"
        elif months_supply < 5:
            opportunity = "MODERATE"
        else:
            opportunity = "LOW"

        analysis = {
            "county": county,
            "state": state,
            "data": data,
            "opportunity_score": opportunity,
            "buy_recommendation": opportunity in ("HIGH", "MODERATE"),
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        return analysis

    def monitor_competition(self, competitor: str, market: str, data: dict[str, Any]) -> dict[str, Any]:
        record = {
            "competitor": competitor,
            "market": market,
            "data": data,
            "recorded_at": datetime.utcnow().isoformat(),
        }
        self._competitor_data.append(record)
        return record

    def generate_pricing_intelligence(self, market: str, asset_type: str) -> dict[str, Any]:
        snapshots = self._market_snapshots.get(market, [])
        if not snapshots:
            return {"error": f"No market data for {market}"}

        latest = snapshots[-1]["indicators"]
        median_price = latest.get("median_home_price", 0)

        return {
            "market": market,
            "asset_type": asset_type,
            "median_price": median_price,
            "wholesale_target": round(median_price * 0.65, 2),
            "flip_target": round(median_price * 0.75, 2),
            "retail_target": round(median_price * 0.95, 2),
            "dom_avg": latest.get("days_on_market", 0),
            "trend": snapshots[-1].get("trend", "UNKNOWN"),
            "generated_at": datetime.utcnow().isoformat(),
        }

    def get_status(self) -> dict[str, Any]:
        return {
            "trooper": self.name,
            "role": self.role,
            "markets_tracked": list(self._market_snapshots.keys()),
            "competitors_monitored": len(self._competitor_data),
            "active_alerts": len(self._alerts),
        }
