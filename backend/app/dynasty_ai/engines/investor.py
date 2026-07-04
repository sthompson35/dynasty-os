"""Investor Engine agent.

Per dynasty_ai/investor_engine/SYSTEM_PROMPT.md: real investor matching
(20% of asking price rule) and lifecycle tracking (BARBARA) live elsewhere
and have no HTTP surface. ATLAS's core.py had NO investor-specific signal
at all before this - `investor` never appeared as a scorecard field or a
next_actions entry. This is new: an investor-fit score reflecting how
attractive this specific deal is to present (return, capital accessibility,
risk), not a replacement for the real capital-matching rule.
"""
from __future__ import annotations

from ..types import EngineAction, clamp
from .base import EngineContext, EngineResult


class InvestorEngineAgent:
    def run(self, context: EngineContext) -> EngineResult:
        projected_roi = context.get("projected_roi")
        total_investment = context.get("total_investment")
        capital_need = context.get("capital_need")
        risk = context.get("risk")

        capital_bonus = 15 if capital_need == "Low" else 5 if capital_need == "Moderate" else 0
        risk_bonus = 15 if risk == "Low" else 5 if risk == "Moderate" else 0
        investor_score = clamp(35 + projected_roi * 100 * 0.6 + capital_bonus + risk_bonus)
        context.set(investor_score=investor_score)

        actions = []
        if capital_need == "High":
            actions.append(
                EngineAction(
                    engine="investor",
                    action="Package deal for investor presentation",
                    priority="medium",
                    reason=f"Capital need is High (${total_investment:,.0f}) — needs a matched investor before this can close.",
                )
            )

        return EngineResult(
            engine="investor",
            score=investor_score,
            summary=f"Investor fit {investor_score}/100 — {projected_roi:.1%} projected return, {capital_need} capital need, {risk} risk.",
            actions=actions,
        )
