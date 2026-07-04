"""Portfolio Dashboard agent.

Per dynasty_ai/porfiolio_dashboard/SYSTEM_PROMPT.md: buy-box learning,
actual-vs-projected accuracy, and closed-deal feedback are "not implemented
anywhere yet" in this codebase - the real live dashboard is the TypeScript
/command-center page querying Prisma directly, not a Python module. This
agent does NOT claim to fix that gap: it's a single-deal buy-box compliance
signal (what fraction of the 5 stated buy-box criteria this deal meets),
distinct from Deal Engine's weighted shylow_fit, and explicitly NOT a
rolled-up portfolio health score - that requires historical closed-deal
data ATLAS doesn't have access to from a single analyze-deal request.
"""
from __future__ import annotations

from ..types import clamp
from .base import EngineContext, EngineResult

LIGHT_REHAB_LEVELS = {"Light", "Medium"}


class PortfolioEngineAgent:
    def run(self, context: EngineContext) -> EngineResult:
        payload = context.payload
        projected_profit = context.get("projected_profit")
        projected_roi = context.get("projected_roi")
        rehab_level = context.get("rehab_level")

        checks = [
            payload.arv >= 180000,
            projected_profit >= payload.target_profit,
            projected_roi >= payload.target_roi,
            "mo" in payload.state.lower() or "missouri" in payload.market.lower(),
            rehab_level in LIGHT_REHAB_LEVELS,
        ]
        portfolio_score = clamp(sum(checks) / len(checks) * 100)
        context.set(portfolio_score=portfolio_score)

        return EngineResult(
            engine="portfolio",
            score=portfolio_score,
            summary=f"Buy-box compliance {sum(checks)}/{len(checks)} criteria ({portfolio_score}/100) — single-deal fit, not a portfolio health rollup.",
        )
