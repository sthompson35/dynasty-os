"""ADAM — Acquisition Intelligence. ARV estimation, MAO calculation, market comp analysis."""
from __future__ import annotations
from datetime import datetime
from typing import Any

from dynasty_os.engines.deal_engine import AcquisitionEngine, DealData


class AdamTrooper:
    name = "ADAM"
    role = "Acquisition Intelligence"
    domain = "Lead Engine"
    capabilities = [
        "property data analysis",
        "ARV estimation",
        "MAO calculation",
        "market comp analysis",
        "deal scoring",
    ]

    def __init__(self) -> None:
        self._acq_engine = AcquisitionEngine()
        self._comps_analyzed: list[dict[str, Any]] = []
        self._arv_estimates: list[dict[str, Any]] = []

    def estimate_arv(self, property_id: str, comps: list[dict[str, Any]], sqft: float) -> dict[str, Any]:
        if not comps:
            return {"error": "No comps provided"}

        price_per_sqft_values = [
            c.get("sale_price", 0) / c.get("sqft", 1)
            for c in comps
            if c.get("sqft", 0) > 0
        ]
        if not price_per_sqft_values:
            return {"error": "Invalid comp data"}

        avg_ppsf = sum(price_per_sqft_values) / len(price_per_sqft_values)
        arv = avg_ppsf * sqft

        estimate = {
            "property_id": property_id,
            "sqft": sqft,
            "comp_count": len(comps),
            "avg_price_per_sqft": round(avg_ppsf, 2),
            "estimated_arv": round(arv, 2),
            "comp_range": {
                "low": round(min(price_per_sqft_values) * sqft, 2),
                "high": round(max(price_per_sqft_values) * sqft, 2),
            },
            "confidence": "HIGH" if len(comps) >= 5 else "MODERATE" if len(comps) >= 3 else "LOW",
            "estimated_at": datetime.utcnow().isoformat(),
        }
        self._arv_estimates.append(estimate)
        return estimate

    def calculate_mao(self, deal_data: dict[str, Any], target_margin: float = 0.30) -> dict[str, Any]:
        deal = DealData(
            deal_id=deal_data.get("deal_id", ""),
            property_id=deal_data.get("property_id", ""),
            seller=deal_data.get("seller", ""),
            asking_price=float(deal_data.get("asking_price", 0)),
            arv=float(deal_data.get("arv", 0)),
            repairs=float(deal_data.get("repairs", 0)),
        )
        result = self._acq_engine.process(deal, target_margin)
        result["commander"] = self.name
        return result

    def analyze_property(self, property_data: dict[str, Any], comps: list[dict[str, Any]]) -> dict[str, Any]:
        sqft = float(property_data.get("sqft", 0))
        arv_estimate = self.estimate_arv(property_data.get("property_id", ""), comps, sqft) if sqft and comps else {}

        mao_data = {**property_data, "arv": arv_estimate.get("estimated_arv", property_data.get("arv", 0))}
        mao_result = self.calculate_mao(mao_data)

        return {
            "property_id": property_data.get("property_id", ""),
            "commander": self.name,
            "arv_analysis": arv_estimate,
            "mao_analysis": mao_result,
            "acquisition_recommendation": "PURSUE" if mao_result.get("meets_mao") else "PASS",
            "analyzed_at": datetime.utcnow().isoformat(),
        }

    def get_metrics(self) -> dict[str, Any]:
        return {
            "arv_estimates_run": len(self._arv_estimates),
            "acquisition_metrics": self._acq_engine.get_metrics(),
        }
