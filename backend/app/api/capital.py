"""Capital Engine API — Investor CRUD, available/deployed capital, distributions, returns."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db import get_supabase

router = APIRouter(prefix="/api/capital", tags=["Capital Engine"])


# ─── Models ──────────────────────────────────────────────────────────────────

class InvestorCreate(BaseModel):
    investor_name: str
    entity: Optional[str] = None
    status: str = "Prospect"
    available_capital: float = 0.0
    committed_capital: float = 0.0
    invested_capital: float = 0.0
    preferred_return: float = 0.08
    investment_type: Optional[str] = None
    contact_info: dict = {}
    risk_profile: Optional[str] = None
    markets: list[str] = []


class InvestorUpdate(BaseModel):
    status: Optional[str] = None
    available_capital: Optional[float] = None
    committed_capital: Optional[float] = None
    invested_capital: Optional[float] = None
    preferred_return: Optional[float] = None
    contact_info: Optional[dict] = None


class CommitmentCreate(BaseModel):
    investor_id: str
    deal_id: str
    amount: float
    status: str = "Pending"


class DistributionCreate(BaseModel):
    investor_id: str
    deal_id: str
    amount: float
    distribution_date: str
    type: str               # Preferred Return | Profit Share | Return of Capital
    status: str = "Pending"


# ─── Capital Summary Helpers ──────────────────────────────────────────────────

def _sum_field(rows: list[dict], field: str) -> float:
    return sum(float(r.get(field) or 0) for r in rows)


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/available")
def available_capital():
    """Total investable capital across all active investors."""
    db = get_supabase()
    investors = db.table("investors").select(
        "investor_id, investor_name, available_capital, status"
    ).in_("status", ["Warm", "Meeting", "Committed", "Funded", "Repeat", "Strategic Partner"]).execute().data or []

    total = _sum_field(investors, "available_capital")
    return {
        "total_available": round(total, 2),
        "investor_count": len(investors),
        "investors": investors,
    }


@router.get("/deployed")
def deployed_capital():
    """Capital currently deployed across open deals."""
    db = get_supabase()
    allocs = db.table("allocations").select(
        "allocation_id, deal_id, investor_id, amount, roi, allocated_at"
    ).execute().data or []

    commits = db.table("commitments").select(
        "commitment_id, investor_id, deal_id, amount, status"
    ).eq("status", "Funded").execute().data or []

    total_alloc  = _sum_field(allocs, "amount")
    total_commit = _sum_field(commits, "amount")

    return {
        "total_deployed_allocations": round(total_alloc, 2),
        "total_committed_funded": round(total_commit, 2),
        "allocations": allocs,
        "commitments": commits,
    }


@router.get("/distributions")
def list_distributions(
    status: Optional[str] = None,
    investor_id: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    db = get_supabase()
    q = db.table("distributions").select("*, investors(investor_name)")
    if status:
        q = q.eq("status", status)
    if investor_id:
        q = q.eq("investor_id", investor_id)
    result = q.order("distribution_date", desc=True).range(offset, offset + limit - 1).execute()
    rows = result.data or []

    pending = sum(float(r.get("amount") or 0) for r in rows if r.get("status") == "Pending")
    sent    = sum(float(r.get("amount") or 0) for r in rows if r.get("status") == "Sent")
    confirmed = sum(float(r.get("amount") or 0) for r in rows if r.get("status") == "Confirmed")

    return {
        "distributions": rows,
        "totals": {"pending": round(pending, 2), "sent": round(sent, 2), "confirmed": round(confirmed, 2)},
    }


@router.post("/distributions", status_code=201)
def create_distribution(payload: DistributionCreate):
    db = get_supabase()
    valid_types = {"Preferred Return", "Profit Share", "Return of Capital"}
    if payload.type not in valid_types:
        raise HTTPException(400, f"type must be one of: {valid_types}")
    result = db.table("distributions").insert(payload.model_dump()).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create distribution")
    return result.data[0]


@router.get("/returns")
def capital_returns():
    """Portfolio-level return metrics across all closings."""
    db = get_supabase()
    closings = db.table("closings").select("net_profit, capital_recovered, sale_price, close_date").execute().data or []
    allocs   = db.table("allocations").select("amount, roi").execute().data or []

    total_profit    = _sum_field(closings, "net_profit")
    total_recovered = _sum_field(closings, "capital_recovered")
    total_revenue   = _sum_field(closings, "sale_price")
    total_deployed  = _sum_field(allocs, "amount")

    avg_roi = (
        sum(float(a.get("roi") or 0) for a in allocs) / len(allocs)
        if allocs else 0
    )

    return {
        "total_net_profit": round(total_profit, 2),
        "total_capital_recovered": round(total_recovered, 2),
        "total_revenue": round(total_revenue, 2),
        "total_deployed": round(total_deployed, 2),
        "avg_roi": round(avg_roi, 4),
        "closed_deals": len(closings),
    }


# ── Investor CRUD ─────────────────────────────────────────────────────────────

@router.get("/investors")
def list_investors(
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    db = get_supabase()
    q = db.table("investors").select("*")
    if status:
        q = q.eq("status", status)
    result = q.order("available_capital", desc=True).range(offset, offset + limit - 1).execute()
    return {"investors": result.data or [], "offset": offset}


@router.post("/investors", status_code=201)
def create_investor(payload: InvestorCreate):
    db = get_supabase()
    result = db.table("investors").insert(payload.model_dump()).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create investor")
    return result.data[0]


@router.put("/investors/{investor_id}")
def update_investor(investor_id: UUID, payload: InvestorUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    db = get_supabase()
    result = db.table("investors").update(updates).eq("investor_id", str(investor_id)).execute()
    if not result.data:
        raise HTTPException(404, "Investor not found")
    return result.data[0]


# ── Commitments ───────────────────────────────────────────────────────────────

@router.post("/commitments", status_code=201)
def create_commitment(payload: CommitmentCreate):
    db = get_supabase()
    result = db.table("commitments").insert(payload.model_dump()).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create commitment")
    return result.data[0]


@router.get("/commitments")
def list_commitments(
    deal_id: Optional[str] = None,
    investor_id: Optional[str] = None,
    status: Optional[str] = None,
):
    db = get_supabase()
    q = db.table("commitments").select("*, investors(investor_name), deals(asking_price, arv, status)")
    if deal_id:
        q = q.eq("deal_id", deal_id)
    if investor_id:
        q = q.eq("investor_id", investor_id)
    if status:
        q = q.eq("status", status)
    result = q.execute()
    return {"commitments": result.data or []}
