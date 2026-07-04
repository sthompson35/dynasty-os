"""Operations Engine agent.

Per dynasty_ai/operations_engine/SYSTEM_PROMPT.md: the fully-wired
OperationsEngine + ATLASTrooper module (10 sub-systems: planning,
procurement, quality inspections, financial control, risk management, ...)
has no live /api/projects route - the only projects row created today comes
from Deal Engine's approval fan-out, and it never touches this module. This
is new: ATLAS's own per-deal operational-burden signal (higher score =
lighter lift), derived from rehab scope and deal risk, not a substitute for
that module's real task/budget/inspection tracking.
"""
from __future__ import annotations

from ..types import EngineAction, clamp
from .base import EngineContext, EngineResult

HEAVY_REHAB_LEVELS = {"Heavy", "Gut"}


class OperationsEngineAgent:
    def run(self, context: EngineContext) -> EngineResult:
        payload = context.payload
        rehab_level = context.get("rehab_level")
        risk = context.get("risk")

        operations_score = clamp(
            90
            - (payload.repair_costs / 2000)
            - (20 if rehab_level in HEAVY_REHAB_LEVELS else 0)
            - (15 if risk == "High" else 5 if risk == "Moderate" else 0)
        )
        context.set(operations_score=operations_score)

        actions = []
        if rehab_level in HEAVY_REHAB_LEVELS:
            actions.append(
                EngineAction(
                    engine="operations",
                    action="Pre-stage contractor scope and project timeline",
                    priority="medium" if rehab_level == "Heavy" else "high",
                    reason=f"{rehab_level} rehab scope needs execution planning before close.",
                )
            )

        return EngineResult(
            engine="operations",
            score=operations_score,
            summary=f"Operational burden score {operations_score}/100 ({rehab_level} rehab, {risk} risk).",
            actions=actions,
        )
