"""Intake Engine agent.

Per dynasty_ai/intake_engine/SYSTEM_PROMPT.md: intake_score is not computed
from raw intake data directly - it's a derived composite of underwriting,
lead, and disposition scores. Formula unchanged from the original core.py
implementation. Note this runs AFTER Underwriting/Strategy/Disposition in
computation order (it depends on their output) even though "Intake" is
positioned second in the documented conceptual pipeline - see
DynastyAIOrchestrator for how computation order and display order differ.
"""
from __future__ import annotations

from ..types import EngineAction, clamp
from .base import EngineContext, EngineResult


class IntakeEngineAgent:
    def run(self, context: EngineContext) -> EngineResult:
        underwriting_score = context.get("underwriting_score")
        lead_score = context.get("lead_score")
        disposition_score = context.get("disposition_score")

        intake_score = clamp(underwriting_score * 0.55 + lead_score * 0.25 + disposition_score * 0.20)
        context.set(intake_score=intake_score)

        return EngineResult(
            engine="intake",
            score=intake_score,
            summary=f"Intake readiness {intake_score}/100 (55% underwriting, 25% lead, 20% disposition).",
            actions=[
                EngineAction(
                    engine="intake",
                    action="Validate seller motivation and contact data",
                    priority="high",
                    reason="Lead score feeds offer urgency.",
                )
            ],
        )
