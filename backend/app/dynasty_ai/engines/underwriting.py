"""Underwriting Engine agent.

Per dynasty_ai/underwriting_engine/SYSTEM_PROMPT.md: this is ATLAS's own
self-contained model - one of (at least) four non-equivalent underwriting/
risk implementations in the codebase (Deal Engine's AcquisitionEngine +
RiskEngine, the standalone /api/deal/* calculators, and ADAM being the
other three). Formula unchanged from the original core.py implementation -
do not import or blend the other models here without being asked to
reconcile them; they encode different, non-equivalent assumptions.
"""
from __future__ import annotations

from ..types import DynastyAIRequest, EngineAction, clamp
from .base import EngineContext, EngineResult


class UnderwritingEngineAgent:
    def run(self, context: EngineContext) -> EngineResult:
        payload = context.payload

        mao = max(0.0, payload.arv * 0.70 - payload.repair_costs)
        purchase = payload.purchase_price or mao
        total_investment = purchase + payload.repair_costs + payload.holding_costs + payload.closing_costs + payload.selling_costs
        projected_profit = payload.arv - total_investment
        projected_roi = projected_profit / total_investment if total_investment else 0.0

        risk_score = self._risk_score(payload, projected_roi, mao)
        underwriting_score = clamp(
            (projected_roi * 100) + projected_profit / 1500 + (payload.arv - purchase) / 3000 - risk_score * 0.35
        )

        context.set(
            mao=mao,
            purchase=purchase,
            total_investment=total_investment,
            projected_profit=projected_profit,
            projected_roi=projected_roi,
            risk_score=risk_score,
            underwriting_score=underwriting_score,
        )

        return EngineResult(
            engine="underwriting",
            score=underwriting_score,
            summary=f"MAO ${mao:,.0f}, projected profit ${projected_profit:,.0f} ({projected_roi:.1%} ROI), risk {risk_score}/100.",
            actions=[
                EngineAction(
                    engine="underwriting",
                    action="Lock ARV, repair budget, and MAO",
                    priority="high",
                    reason="ATLAS recommendation depends on spread quality.",
                )
            ],
        )

    @staticmethod
    def _risk_score(payload: DynastyAIRequest, roi: float, mao: float) -> int:
        score = 12
        if payload.arv <= 0:
            score += 30
        if payload.purchase_price > mao and mao > 0:
            score += 20
        if roi < 0.12:
            score += 18
        if payload.days_on_market > 90:
            score += 8
        if payload.title_issues:
            score += 18
        if payload.flood_zone:
            score += 16
        if not payload.contractor_secured and payload.repair_costs > 50000:
            score += 8
        return clamp(score)
