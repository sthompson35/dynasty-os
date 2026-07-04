"""Deal Engine agent.

Per dynasty_ai/deal_engine/SYSTEM_PROMPT.md: TROOPER_CHARLIE's real
GO/GO_WITH_CONDITIONS/RENEGOTIATE/HOLD/KILL decision tree (9 sub-systems,
kill-switch on 3+ failed checks) lives in the separate Deal Engine module
and is not duplicated here. This is ATLAS's own, simpler BUY/PASS/REVIEW
call - the Dynasty Fit score plus a straight profit/fit threshold. Formula
unchanged from the original core.py implementation.
"""
from __future__ import annotations

from ..types import Decision, EngineAction, clamp
from .base import EngineContext, EngineResult, capital_need_label, risk_label


class DealEngineAgent:
    def run(self, context: EngineContext) -> EngineResult:
        payload = context.payload
        intake_score = context.get("intake_score")
        rehab_level = context.get("rehab_level")
        risk_score = context.get("risk_score")
        capital_score = context.get("capital_score")
        projected_profit = context.get("projected_profit")
        projected_roi = context.get("projected_roi")
        purchase = context.get("purchase")
        best_exit = context.get("best_exit")

        missouri_fit = 10 if "mo" in payload.state.lower() or "missouri" in payload.market.lower() else 0
        shylow_fit = (
            (18 if payload.arv >= 180000 else 0)
            + (24 if projected_profit >= payload.target_profit else 0)
            + (24 if projected_roi >= payload.target_roi else 0)
            + missouri_fit
            + (12 if rehab_level == "Medium" else 8 if rehab_level == "Light" else 0)
        )
        dynasty_fit = clamp(intake_score * 0.55 + shylow_fit * 0.45)

        action: Decision = (
            "BUY" if dynasty_fit >= 72 and projected_profit > 0
            else "PASS" if dynasty_fit < 45 or projected_profit <= 0
            else "REVIEW"
        )
        risk = risk_label(risk_score)
        capital_need = capital_need_label(capital_score)

        reasons = [
            f"ARV Spread: {'Excellent' if payload.arv - purchase >= 50000 else 'Strong' if payload.arv - purchase >= 25000 else 'Thin'}",
            f"Expected Profit: ${round(projected_profit):,}",
            f"ROI: {projected_roi:.1%}",
            f"Rehab: {rehab_level}",
            f"Risk: {risk}",
            f"Capital Need: {capital_need}",
        ]
        if action == "PASS":
            reasons = [
                "Insufficient spread" if projected_profit <= 0 else f"Expected Profit: ${round(projected_profit):,}",
                "Rental cashflow / ROI weak" if projected_roi < 0.10 else f"ROI: {projected_roi:.1%}",
                "Repair uncertainty high" if risk_score > 62 else f"Risk: {risk}",
            ]

        confidence = clamp(dynasty_fit + (8 if action == "BUY" else 5 if action == "PASS" else 0), 0, 99)

        context.set(
            dynasty_fit_score=dynasty_fit,
            action=action,
            risk=risk,
            capital_need=capital_need,
            confidence=confidence,
            reasons=reasons,
        )

        actions = []
        if action == "BUY":
            actions.append(
                EngineAction(
                    engine="deal",
                    action="Generate LOI and sync to Deal Engine",
                    priority="critical",
                    reason="Candidate meets Dynasty acquisition criteria.",
                )
            )

        return EngineResult(
            engine="deal",
            score=dynasty_fit,
            summary=f"ATLAS recommendation: {action} (confidence {confidence}%, Dynasty Fit {dynasty_fit}/100, best exit {best_exit.strategy}).",
            actions=actions,
        )
