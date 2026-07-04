"""Disposition Engine agent.

Per dynasty_ai/disposition_engine/SYSTEM_PROMPT.md: the real 10-sub-system
DispositionEngine module (buyer matching, pricing tiers, marketing,
investor-exit split, ...) has no HTTP surface. The ONLY disposition-
specific idea ATLAS previously borrowed was sub-system #1's risk-adjusted-
return concept (risk multiplier LOW 1.0 / MODERATE 0.85 / HIGH 0.70 /
CRITICAL 0.50 applied to exit profit before ranking) - but the original
core.py never actually applied it; disposition_score was a bare alias of
strategy_score. This agent applies that documented risk adjustment for
real, using ATLAS's own three-tier risk banding (Low/Moderate/High - it has
no Critical tier). Deals already banded Low risk are unaffected (1.0x);
Moderate/High risk deals now score lower here than in Strategy, reflecting
that a risky deal is a harder sell to a buyer pool even if the raw exit
math looks fine.
"""
from __future__ import annotations

from ..types import EngineAction, clamp
from .base import EngineContext, EngineResult, risk_label

RISK_MULTIPLIER = {"Low": 1.0, "Moderate": 0.85, "High": 0.70}
BUYER_DEMAND_STRATEGIES = {"Wholesale", "Owner Finance"}


class DispositionEngineAgent:
    def run(self, context: EngineContext) -> EngineResult:
        strategy_score = context.get("strategy_score")
        risk_score = context.get("risk_score")
        best_exit = context.get("best_exit")
        risk = risk_label(risk_score)
        multiplier = RISK_MULTIPLIER[risk]

        disposition_score = clamp(strategy_score * multiplier)
        context.set(disposition_score=disposition_score)

        actions = []
        if best_exit.strategy in BUYER_DEMAND_STRATEGIES:
            actions.append(
                EngineAction(
                    engine="disposition",
                    action="Assign buyer pool and draft marketing package",
                    priority="medium",
                    reason=f"{best_exit.strategy} depends on buyer demand.",
                )
            )

        return EngineResult(
            engine="disposition",
            score=disposition_score,
            summary=f"Risk-adjusted exit score {disposition_score}/100 ({risk} risk, {multiplier:.2f}x on strategy score {strategy_score}).",
            actions=actions,
        )
