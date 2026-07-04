from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..types import DynastyAIRequest, EngineAction, EngineName


@dataclass
class EngineContext:
    """Accumulates each engine's output as the pipeline runs. Later engines
    read earlier ones' computed values through this instead of every engine
    recomputing shared math (mao, total_investment, exit_matrix, ...)."""

    payload: DynastyAIRequest
    data: dict[str, Any] = field(default_factory=dict)

    def get(self, key: str, default: Any = None) -> Any:
        return self.data.get(key, default)

    def set(self, **values: Any) -> None:
        self.data.update(values)


@dataclass
class EngineResult:
    engine: EngineName
    score: int | None
    summary: str
    actions: list[EngineAction] = field(default_factory=list)


def text_blob(payload: DynastyAIRequest) -> str:
    return f"{payload.notes or ''} {payload.status} {payload.property_type}".lower()


def mentions(payload: DynastyAIRequest, terms: list[str]) -> bool:
    haystack = text_blob(payload)
    return any(term in haystack for term in terms)


def risk_label(risk_score: int) -> str:
    return "Low" if risk_score <= 35 else "Moderate" if risk_score <= 62 else "High"


def capital_need_label(capital_score: int) -> str:
    return "Low" if capital_score >= 72 else "Moderate" if capital_score >= 48 else "High"
