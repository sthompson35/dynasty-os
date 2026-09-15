"""Canonical PropertyOS lifecycle canary.

This module deliberately does not calculate ARV, lender terms, rehab costs, or
completion percentages. It validates evidence/input readiness and records a
truthful stage-by-stage canary state. Unknown means unknown.
"""
from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import get_supabase

router = APIRouter(prefix="/api/canonical", tags=["Canonical PropertyOS"])

CanaryStatus = Literal["READY", "HOLD_FOR_DATA", "BLOCKED"]


class PropertyIdentity(BaseModel):
    address: str
    parcel_apn: str | None = None
    property_type: str | None = None
    beds: float | None = None
    baths: float | None = None
    sqft: float | None = None
    lot_size: float | None = None
    year_built: int | None = None
    current_condition: str | None = None


class ContractEconomics(BaseModel):
    purchase_price: float | None = None
    earnest_money: float | None = None
    financing_type: str | None = None
    financing_terms: dict[str, Any] | None = None
    seller_concessions: float | None = None
    closing_cost_assumptions: float | None = None
    contingencies: list[str] | None = None
    closing_date: str | None = None
    fha_conditions: list[str] | None = None


class UnderwritingEvidence(BaseModel):
    comp_evidence_refs: list[str] = Field(default_factory=list)
    low_arv: float | None = None
    base_arv: float | None = None
    high_arv: float | None = None
    confidence: float | None = None


class RehabEvidence(BaseModel):
    inspection_evidence_refs: list[str] = Field(default_factory=list)
    scope_evidence_refs: list[str] = Field(default_factory=list)
    bid_evidence_refs: list[str] = Field(default_factory=list)
    rehab_budget: float | None = None
    contingency: float | None = None
    schedule_days: int | None = None
    physical_completion_pct: float | None = None
    financial_completion_pct: float | None = None
    draw_completion_pct: float | None = None


class CapitalControls(BaseModel):
    capital_stack: list[dict[str, Any]] = Field(default_factory=list)
    debt_service: float | None = None
    dscr: float | None = None
    ltv: float | None = None
    ltc: float | None = None
    refinance_assumptions_ref: str | None = None


class BuckleyCanaryRequest(BaseModel):
    property: PropertyIdentity
    contract: ContractEconomics
    underwriting: UnderwritingEvidence = Field(default_factory=UnderwritingEvidence)
    rehab: RehabEvidence = Field(default_factory=RehabEvidence)
    capital: CapitalControls = Field(default_factory=CapitalControls)
    project_type: str | None = None
    strategy: str | None = None
    accountable_owner: str | None = None
    persist: bool = False


class StageResult(BaseModel):
    status: CanaryStatus
    missing: list[str] = Field(default_factory=list)
    evidence_refs: list[str] = Field(default_factory=list)


class BuckleyCanaryResponse(BaseModel):
    canary_key: str
    correlation_id: str
    property_id: str | None = None
    deal_id: str | None = None
    project_id: str | None = None
    intake: StageResult
    underwriting: StageResult
    capital: StageResult
    operations: StageResult
    overall_status: CanaryStatus
    next_gate: str


def _missing(model: BaseModel, required: tuple[str, ...]) -> list[str]:
    values = model.model_dump()
    return [name for name in required if values.get(name) is None]


def evaluate_502_buckley(payload: BuckleyCanaryRequest) -> BuckleyCanaryResponse:
    address = payload.property.address.strip().lower()
    if "502 buckley" not in address or "park hills" not in address:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "CANARY_PROPERTY_MISMATCH",
                "message": "This production canary is locked to 502 Buckley, Park Hills, Missouri.",
            },
        )

    intake_missing = _missing(
        payload.property,
        ("parcel_apn", "property_type", "beds", "baths", "sqft", "lot_size", "year_built", "current_condition"),
    )
    intake_missing += _missing(payload.contract, ("purchase_price", "financing_type", "financing_terms", "closing_date"))
    intake = StageResult(status="READY" if not intake_missing else "HOLD_FOR_DATA", missing=intake_missing)

    uw_missing: list[str] = []
    if not payload.underwriting.comp_evidence_refs:
        uw_missing.append("comp_evidence_refs")
    uw_missing += _missing(payload.underwriting, ("low_arv", "base_arv", "high_arv", "confidence"))
    underwriting = StageResult(
        status="READY" if intake.status == "READY" and not uw_missing else "HOLD_FOR_DATA",
        missing=uw_missing,
        evidence_refs=payload.underwriting.comp_evidence_refs,
    )

    capital_missing: list[str] = []
    if not payload.capital.capital_stack:
        capital_missing.append("capital_stack")
    for index, source in enumerate(payload.capital.capital_stack):
        if str(source.get("type", "")).lower() in {"debt", "loan", "mortgage", "private_money", "seller_finance"}:
            for field in ("principal", "apr", "term_months", "interest_only"):
                if source.get(field) is None:
                    capital_missing.append(f"capital_stack[{index}].{field}")
    capital = StageResult(
        status="READY" if underwriting.status == "READY" and not capital_missing else "HOLD_FOR_DATA",
        missing=capital_missing,
    )

    operations_missing: list[str] = []
    if not payload.rehab.inspection_evidence_refs:
        operations_missing.append("inspection_evidence_refs")
    if not payload.rehab.scope_evidence_refs:
        operations_missing.append("scope_evidence_refs")
    if not payload.rehab.bid_evidence_refs:
        operations_missing.append("bid_evidence_refs")
    operations_missing += _missing(payload.rehab, ("rehab_budget", "contingency", "schedule_days"))
    operations = StageResult(
        status="READY" if capital.status == "READY" and not operations_missing else "BLOCKED",
        missing=operations_missing,
        evidence_refs=(
            payload.rehab.inspection_evidence_refs
            + payload.rehab.scope_evidence_refs
            + payload.rehab.bid_evidence_refs
        ),
    )

    stages = [intake.status, underwriting.status, capital.status, operations.status]
    if all(status == "READY" for status in stages):
        overall: CanaryStatus = "READY"
        next_gate = "INDEPENDENT_VERIFICATION"
    elif intake.status != "READY":
        overall = "HOLD_FOR_DATA"
        next_gate = "INTAKE"
    elif underwriting.status != "READY":
        overall = "HOLD_FOR_DATA"
        next_gate = "UNDERWRITING"
    elif capital.status != "READY":
        overall = "HOLD_FOR_DATA"
        next_gate = "CAPITAL"
    else:
        overall = "BLOCKED"
        next_gate = "OPERATIONS_EVIDENCE"

    return BuckleyCanaryResponse(
        canary_key="502-BUCKLEY-PARK-HILLS-MO",
        correlation_id=str(uuid4()),
        intake=intake,
        underwriting=underwriting,
        capital=capital,
        operations=operations,
        overall_status=overall,
        next_gate=next_gate,
    )


def _persist_canary(payload: BuckleyCanaryRequest, result: BuckleyCanaryResponse) -> BuckleyCanaryResponse:
    """Create/reuse canonical masters, then append the canary run.

    Persistence is explicit (`persist=true`) so validation calls cannot silently
    mutate production data. No recommendation, approval, execution command,
    capital allocation, draw, or completion claim is created here.
    """
    try:
        db = get_supabase()
        prop = db.table("properties").select("*").eq("property_code", "PROP-502-BUCKLEY").execute()
        if prop.data:
            property_id = prop.data[0]["id"]
        else:
            created = db.table("properties").insert({
                "property_code": "PROP-502-BUCKLEY",
                "address": payload.property.address,
                "city": "Park Hills",
                "state": "MO",
                "zip": "63601",
                "property_type": payload.property.property_type,
                "year_built": payload.property.year_built,
                "sqft": payload.property.sqft,
                "beds": payload.property.beds,
                "baths": payload.property.baths,
                "lot_size": payload.property.lot_size,
                "acquisition_price": payload.contract.purchase_price,
                "status": "intake",
                "metadata": {
                    "parcel_apn": payload.property.parcel_apn,
                    "current_condition": payload.property.current_condition,
                    "canary": True,
                },
            }).execute()
            property_id = created.data[0]["id"]

        deal = db.table("deals").select("*").eq("deal_code", "DEAL-502-BUCKLEY").execute()
        if deal.data:
            deal_id = deal.data[0]["deal_id"]
        else:
            created = db.table("deals").insert({
                "deal_code": "DEAL-502-BUCKLEY",
                "property_id": property_id,
                "asking_price": payload.contract.purchase_price,
                "beds": payload.property.beds,
                "baths": payload.property.baths,
                "sqft": payload.property.sqft,
                "status": "PENDING",
            }).execute()
            deal_id = created.data[0]["deal_id"]

        project = db.table("projects").select("*").eq("project_code", "PRJ-502-BUCKLEY").execute()
        if project.data:
            project_id = project.data[0]["project_id"]
        else:
            project_record: dict[str, Any] = {
                "project_code": "PRJ-502-BUCKLEY",
                "property_id": property_id,
                "deal_id": deal_id,
                "status": "Planning",
                "budget": payload.rehab.rehab_budget,
                "completion_percent": 0,
            }
            if payload.project_type is not None:
                project_record["project_type"] = payload.project_type
            if payload.strategy is not None:
                project_record["strategy"] = payload.strategy
            if payload.accountable_owner is not None:
                project_record["owner"] = payload.accountable_owner
            created = db.table("projects").insert(project_record).execute()
            project_id = created.data[0]["project_id"]

        missing_inputs = {
            "intake": result.intake.missing,
            "underwriting": result.underwriting.missing,
            "capital": result.capital.missing,
            "operations": result.operations.missing,
        }
        db.table("canary_runs").insert({
            "canary_key": result.canary_key,
            "property_id": property_id,
            "deal_id": deal_id,
            "project_id": project_id,
            "correlation_id": result.correlation_id,
            "intake_status": result.intake.status,
            "underwriting_status": result.underwriting.status,
            "capital_status": result.capital.status,
            "operations_status": result.operations.status,
            "missing_inputs": missing_inputs,
            "verification_state": "PENDING",
            "evidence_refs": result.underwriting.evidence_refs + result.operations.evidence_refs,
        }).execute()

        result.property_id = property_id
        result.deal_id = deal_id
        result.project_id = project_id
        return result
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "CANARY_STORE_UNAVAILABLE",
                "message": "Canonical canary persistence failed; no downstream approval or execution was attempted.",
                "error": str(error),
            },
        ) from error


@router.post("/canary/502-buckley", response_model=BuckleyCanaryResponse)
def run_502_buckley_canary(payload: BuckleyCanaryRequest) -> BuckleyCanaryResponse:
    result = evaluate_502_buckley(payload)
    return _persist_canary(payload, result) if payload.persist else result
