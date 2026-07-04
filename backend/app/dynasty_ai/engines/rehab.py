"""Rehab Engine agent.

Per dynasty_ai/rehab_engine/SYSTEM_PROMPT.md: there is no dedicated
rehab_engine module in the codebase - this classification (_rehab_level in
the original core.py) is the only piece that's actually "Rehab Engine"
specific; everything downstream of classification (contractor execution,
inspections, budget variance) is Operations Engine's job. Score is
intentionally inverted relative to severity - Light scores highest (90),
Gut lowest (28) - because it feeds underwriting/dynasty-fit as a positive
quality signal, not a risk magnitude. Formula unchanged from the original.
"""
from __future__ import annotations

from ..types import DynastyAIRequest, EngineAction
from .base import EngineContext, EngineResult, risk_label


class RehabEngineAgent:
    def run(self, context: EngineContext) -> EngineResult:
        payload = context.payload
        rehab_level, rehab_score = self._rehab_level(payload)
        context.set(rehab_level=rehab_level, rehab_score=rehab_score)

        risk = risk_label(context.get("risk_score"))
        actions = []
        if risk != "Low" or payload.repair_costs > 50000:
            actions.append(
                EngineAction(
                    engine="rehab",
                    action="Order contractor scope and repair contingency review",
                    priority="high",
                    reason=f"Execution risk is {risk}.",
                )
            )

        return EngineResult(
            engine="rehab",
            score=rehab_score,
            summary=f"Rehab scope: {rehab_level} (score {rehab_score}/100).",
            actions=actions,
        )

    @staticmethod
    def _rehab_level(payload: DynastyAIRequest) -> tuple[str, int]:
        repair_pct = payload.repair_costs / payload.arv if payload.arv else 0
        per_sqft = payload.repair_costs / payload.sqft if payload.sqft else 0
        if repair_pct >= 0.30 or per_sqft >= 65:
            return "Gut", 28
        if repair_pct >= 0.20 or per_sqft >= 45:
            return "Heavy", 48
        if repair_pct >= 0.10 or per_sqft >= 25:
            return "Medium", 76
        return "Light", 90
