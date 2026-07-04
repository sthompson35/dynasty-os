"""Strategy Engine agent.

Per dynasty_ai/strategy_engine/SYSTEM_PROMPT.md: this is ATLAS's own
_exit_matrix() model - the third of (at least) five independent exit-
ranking implementations in the codebase, and the only one that includes
Owner Finance. Scores are not comparable to the other four models (Deal
Engine's StrategyEngine/ExitEngine, the standalone /exit-analysis route, or
Disposition's risk-adjusted ranking) - don't blend them silently. Formula
unchanged from the original core.py implementation.
"""
from __future__ import annotations

from ..types import DynastyAIRequest, EngineAction, ExitOption, clamp
from .base import EngineContext, EngineResult


class StrategyEngineAgent:
    def run(self, context: EngineContext) -> EngineResult:
        payload = context.payload
        total_investment = context.get("total_investment")
        mao = context.get("mao")
        purchase = context.get("purchase")

        exit_matrix = self._exit_matrix(payload.model_copy(update={"purchase_price": purchase}), total_investment, mao)
        best_exit = next((row for row in exit_matrix if row.recommended), exit_matrix[0])
        strategy_score = best_exit.score

        context.set(exit_matrix=exit_matrix, best_exit=best_exit, strategy_score=strategy_score)

        return EngineResult(
            engine="strategy",
            score=strategy_score,
            summary=f"Best exit: {best_exit.strategy} (score {strategy_score}, est. profit ${best_exit.estimated_profit:,.0f}).",
            actions=[
                # Priority is patched by the orchestrator once Deal Engine's
                # BUY/PASS/REVIEW decision is known (high for BUY, medium
                # otherwise) - see DynastyAIOrchestrator.analyze().
                EngineAction(
                    engine="strategy",
                    action=f"Prepare {best_exit.strategy} strategy package",
                    priority="medium",
                    reason="Best exit controls offer posture.",
                )
            ],
        )

    @staticmethod
    def _exit_matrix(payload: DynastyAIRequest, total_investment: float, mao: float) -> list[ExitOption]:
        arv = payload.arv
        wholesale_profit = max(0, mao - payload.purchase_price)
        flip_profit = arv - total_investment
        brrrr_refi = max(0, arv * 0.75 - total_investment)
        rental_cashflow = (payload.monthly_rent * 12 * 0.62) - (total_investment * 0.085)
        owner_finance_profit = max(0, (payload.purchase_price * 0.12) + (arv - payload.purchase_price) * 0.18)
        development_profit = max(0, arv * 1.35 - total_investment) if payload.property_type == "land" or payload.lot_size >= 0.5 else 0

        rows = [
            ExitOption(strategy="Wholesale", score=clamp(45 + wholesale_profit / 1000), estimated_profit=round(wholesale_profit, 2), roi=wholesale_profit / total_investment if total_investment else 0, timeline="1-4 weeks", risk="Low"),
            ExitOption(strategy="Fix & Flip", score=clamp(40 + flip_profit / 1250), estimated_profit=round(flip_profit, 2), roi=flip_profit / total_investment if total_investment else 0, timeline="3-6 months", risk="Moderate"),
            ExitOption(strategy="BRRRR", score=clamp(42 + brrrr_refi / 1500), estimated_profit=round(brrrr_refi, 2), roi=brrrr_refi / total_investment if total_investment else 0, timeline="6-12 months", risk="Moderate"),
            ExitOption(strategy="Rental", score=clamp(40 + max(0, rental_cashflow) / 500), estimated_profit=round(rental_cashflow, 2), roi=rental_cashflow / total_investment if total_investment else 0, timeline="Long-term", risk="Low"),
            ExitOption(strategy="Owner Finance", score=clamp(38 + owner_finance_profit / 1500), estimated_profit=round(owner_finance_profit, 2), roi=owner_finance_profit / total_investment if total_investment else 0, timeline="6-24 months", risk="Moderate"),
            ExitOption(strategy="Development", score=clamp(30 + development_profit / 2500), estimated_profit=round(development_profit, 2), roi=development_profit / total_investment if total_investment else 0, timeline="12-36 months", risk="High"),
        ]
        best = max(rows, key=lambda row: (row.score, row.estimated_profit))
        return [row.model_copy(update={"recommended": row.strategy == best.strategy}) for row in rows]
