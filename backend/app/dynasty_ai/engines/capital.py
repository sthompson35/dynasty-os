"""Capital Engine agent.

Per dynasty_ai/capital_engine/SYSTEM_PROMPT.md: the 9-sub-system
CapitalEngine module (allocation, liquidity, funding structure, risk, ...)
exists but has no HTTP surface - this is ATLAS's own, much simpler capital-
readiness signal, live via /api/dynasty-ai/analyze-deal. Formula unchanged
from the original core.py implementation.
"""
from __future__ import annotations

from ..types import EngineAction, clamp
from .base import EngineContext, EngineResult, capital_need_label


class CapitalEngineAgent:
    def run(self, context: EngineContext) -> EngineResult:
        total_investment = context.get("total_investment")
        projected_roi = context.get("projected_roi")

        capital_score = clamp(78 - (total_investment / 12000) + (projected_roi * 45))
        capital_need = capital_need_label(capital_score)
        context.set(capital_score=capital_score, capital_need=capital_need)

        actions = []
        if capital_need != "Low":
            actions.append(
                EngineAction(
                    engine="capital",
                    action="Match lender and available capital stack",
                    priority="high",
                    reason=f"Capital need is {capital_need}.",
                )
            )

        return EngineResult(
            engine="capital",
            score=capital_score,
            summary=f"Capital need: {capital_need} (score {capital_score}/100, ${total_investment:,.0f} required).",
            actions=actions,
        )
