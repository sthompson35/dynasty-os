"""ATLAS orchestration core.

Runs the 11 Dynasty AI pipeline-stage engines (see ./engines/) in
dependency order, then assembles the same DynastyAIResponse shape the API
has always returned (plus an additive `engine_trace` field). Computation
order is NOT the documented conceptual pipeline order (Lead -> Intake ->
Underwriting -> ...) because several engines' formulas depend on later
stages' output (e.g. Intake's score is a blend of Underwriting/Lead/
Disposition scores, even though "Intake" is positioned second in the
conceptual pipeline). `engine_trace` is reordered back into the documented
pipeline order for display; computation runs in dependency order internally.
"""
from __future__ import annotations

from .types import (
    AtlasRecommendation,
    BatchRankRequest,
    DynastyAIRequest,
    DynastyAIResponse,
    EngineAction,
    EngineTraceEntry,
    Scorecard,
    clamp,
)
from .engines import (
    EngineContext,
    LeadEngineAgent,
    IntakeEngineAgent,
    UnderwritingEngineAgent,
    StrategyEngineAgent,
    DealEngineAgent,
    RehabEngineAgent,
    CapitalEngineAgent,
    InvestorEngineAgent,
    DispositionEngineAgent,
    OperationsEngineAgent,
    PortfolioEngineAgent,
)

# Display/documented pipeline order (see dynasty_ai/agent_manifest.json and
# every dynasty_ai/*/SYSTEM_PROMPT.md's "Position in the pipeline" line).
PIPELINE_DISPLAY_ORDER = [
    "lead", "intake", "underwriting", "strategy", "deal",
    "rehab", "capital", "investor", "disposition", "operations", "portfolio",
]


class DynastyAIOrchestrator:
    """Deterministic ATLAS brain for acquisitions and engine routing."""

    def __init__(self) -> None:
        self._lead = LeadEngineAgent()
        self._underwriting = UnderwritingEngineAgent()
        self._rehab = RehabEngineAgent()
        self._strategy = StrategyEngineAgent()
        self._capital = CapitalEngineAgent()
        self._disposition = DispositionEngineAgent()
        self._intake = IntakeEngineAgent()
        self._deal = DealEngineAgent()
        self._investor = InvestorEngineAgent()
        self._operations = OperationsEngineAgent()
        self._portfolio = PortfolioEngineAgent()

    def analyze(self, payload: DynastyAIRequest) -> DynastyAIResponse:
        context = EngineContext(payload=payload)

        # Dependency order, not display order - see module docstring.
        results = {
            "lead": self._lead.run(context),
            "underwriting": self._underwriting.run(context),
            "rehab": self._rehab.run(context),
            "strategy": self._strategy.run(context),
            "capital": self._capital.run(context),
            "disposition": self._disposition.run(context),
            "intake": self._intake.run(context),
            "deal": self._deal.run(context),
            "investor": self._investor.run(context),
            "operations": self._operations.run(context),
            "portfolio": self._portfolio.run(context),
        }

        # Strategy's action priority depends on Deal's decision, which runs
        # after it - patch it in once known, rather than have Strategy guess.
        action = context.get("action")
        strategy_actions = [
            a.model_copy(update={"priority": "high" if action == "BUY" else "medium"})
            for a in results["strategy"].actions
        ]

        # Fixed assembly order matches the original single-function
        # implementation's next_actions sequence exactly.
        next_actions: list[EngineAction] = [
            *results["intake"].actions,
            *results["underwriting"].actions,
            *strategy_actions,
            *results["deal"].actions,
            *results["capital"].actions,
            *results["rehab"].actions,
            *results["disposition"].actions,
        ]
        if action == "PASS":
            next_actions.append(
                EngineAction(
                    engine="lead",
                    action="Move seller to nurture or reject queue",
                    priority="medium",
                    reason="Current pricing does not clear buy box.",
                )
            )
        next_actions.extend(results["investor"].actions)
        next_actions.extend(results["operations"].actions)

        engine_trace = [
            EngineTraceEntry(engine=key, score=results[key].score, summary=results[key].summary)
            for key in PIPELINE_DISPLAY_ORDER
        ]

        return DynastyAIResponse(
            property_id=payload.property_id,
            address=payload.address,
            market=payload.market,
            total_investment=round(context.get("total_investment"), 2),
            projected_profit=round(context.get("projected_profit"), 2),
            projected_roi=round(context.get("projected_roi"), 4),
            mao=round(context.get("mao"), 2),
            scorecard=Scorecard(
                lead_score=context.get("lead_score"),
                intake_score=context.get("intake_score"),
                underwriting_score=context.get("underwriting_score"),
                strategy_score=context.get("strategy_score"),
                rehab_score=context.get("rehab_score"),
                capital_score=context.get("capital_score"),
                investor_score=context.get("investor_score"),
                disposition_score=context.get("disposition_score"),
                operations_score=context.get("operations_score"),
                portfolio_score=context.get("portfolio_score"),
                dynasty_fit_score=context.get("dynasty_fit_score"),
                risk_score=context.get("risk_score"),
            ),
            atlas=AtlasRecommendation(
                action=action,
                confidence=context.get("confidence"),
                recommended_exit=context.get("best_exit").strategy,
                risk=context.get("risk"),
                capital_need=context.get("capital_need"),
                reason=context.get("reasons"),
            ),
            exit_matrix=context.get("exit_matrix"),
            next_actions=next_actions,
            engine_trace=engine_trace,
        )


def rank_deals(deals: list[DynastyAIRequest]) -> list[DynastyAIResponse]:
    orchestrator = DynastyAIOrchestrator()
    return sorted(
        (orchestrator.analyze(deal) for deal in deals),
        key=lambda result: (result.scorecard.dynasty_fit_score, result.projected_profit),
        reverse=True,
    )
