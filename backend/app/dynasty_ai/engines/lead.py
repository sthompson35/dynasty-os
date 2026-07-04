"""Lead Engine agent.

Per dynasty_ai/lead_engine/SYSTEM_PROMPT.md: this is ATLAS's own seller-
motivation composite, distinct from both the module's weighted
QualificationEngine and the live flat-sum /api/leads/{id}/score formula.
Formula and weights unchanged from the original core.py implementation.
"""
from __future__ import annotations

from ..types import EngineAction, clamp
from .base import EngineContext, EngineResult, mentions


class LeadEngineAgent:
    def run(self, context: EngineContext) -> EngineResult:
        payload = context.payload
        score = 12
        if payload.vacant or mentions(payload, ["vacant", "vacancy"]):
            score += 18
        if payload.inherited or mentions(payload, ["inherited", "probate", "estate"]):
            score += 18
        if payload.pre_foreclosure or mentions(payload, ["pre foreclosure", "pre-foreclosure", "foreclosure", "default"]):
            score += 22
        if payload.code_violations or mentions(payload, ["code violation", "condemned"]):
            score += 14
        if payload.tax_delinquent or mentions(payload, ["tax delinquent", "tax lien"]):
            score += 16
        if payload.absentee_owner or mentions(payload, ["absentee"]):
            score += 12

        lead_score = clamp(score)
        context.set(lead_score=lead_score)

        return EngineResult(
            engine="lead",
            score=lead_score,
            summary=f"Seller motivation score {lead_score}/100 from vacancy/inheritance/foreclosure/code/tax/absentee signals.",
        )
