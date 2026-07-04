"""The 11 Dynasty AI pipeline-stage engine agents, run in sequence by
DynastyAIOrchestrator (see ../core.py). Each engine owns one stage's
scoring/decision logic and its own next-action recommendations; the
orchestrator threads an EngineContext through all 11 so later engines can
read earlier ones' outputs (e.g. Strategy needs Underwriting's MAO)."""

from .base import EngineContext, EngineResult
from .lead import LeadEngineAgent
from .intake import IntakeEngineAgent
from .underwriting import UnderwritingEngineAgent
from .strategy import StrategyEngineAgent
from .deal import DealEngineAgent
from .rehab import RehabEngineAgent
from .capital import CapitalEngineAgent
from .investor import InvestorEngineAgent
from .disposition import DispositionEngineAgent
from .operations import OperationsEngineAgent
from .portfolio import PortfolioEngineAgent

# Pipeline order: Lead -> Intake -> Underwriting -> Strategy -> Deal -> Rehab
# -> Capital -> Investor -> Disposition -> Operations -> Portfolio Dashboard
PIPELINE: list[type] = [
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
]

__all__ = [
    "EngineContext",
    "EngineResult",
    "LeadEngineAgent",
    "IntakeEngineAgent",
    "UnderwritingEngineAgent",
    "StrategyEngineAgent",
    "DealEngineAgent",
    "RehabEngineAgent",
    "CapitalEngineAgent",
    "InvestorEngineAgent",
    "DispositionEngineAgent",
    "OperationsEngineAgent",
    "PortfolioEngineAgent",
    "PIPELINE",
]
