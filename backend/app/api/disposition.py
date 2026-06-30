"""Disposition Engine API — Buyers, Offers, Contracts, Closings, Profit."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db import get_supabase

router = APIRouter(prefix="/api/disposition", tags=["Disposition Engine"])


# ─── Models ──────────────────────────────────────────────────────────────────

class BuyerCreate(BaseModel):
    buyer_name: str
    entity: Optional[str] = None
    markets: list[str] = []
    criteria: dict = {}
    funding_capacity: Optional[float] = None
    close_speed_days: Optional[int] = None
    buyer_type: str = "Cash Buyer"


class OfferCreate(BaseModel):
    property_id: str
    buyer_id: Optional[str] = None
    offer_price: float
    offer_date: str
    notes: Optional[str] = None


class OfferUpdate(BaseModel):
    status: str             # Pending | Countered | Accepted | Rejected | Expired
    notes: Optional[str] = None


class ClosingCreate(BaseModel):
    contract_id: Optional[str] = None
    property_id: str
    buyer_id: Optional[str] = None
    sale_price: float
    net_profit: float
    capital_recovered: float
    close_date: str
    investor_distributions: dict = {}


# ─── Routes ──────────────────────────────────────────────────────────────────

# ── Buyers ────────────────────────────────────────────────────────────────────

@router.get("/buyers")
def list_buyers(
    buyer_type: Optional[str] = None,
    market: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    """Return active buyer list sorted by buyer score."""
    db = get_supabase()
    q = db.table("buyers").select("*, buyer_criteria(*)")
    if buyer_type:
        q = q.eq("buyer_type", buyer_type)
    result = q.order("buyer_score", desc=True).range(offset, offset + limit - 1).execute()
    rows = result.data or []

    if market:
        rows = [r for r in rows if market in (r.get("markets") or [])]

    return {"buyers": rows, "count": len(rows)}


@router.post("/buyers", status_code=201)
def create_buyer(payload: BuyerCreate):
    db = get_supabase()
    result = db.table("buyers").insert(payload.model_dump()).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create buyer")
    return result.data[0]


@router.get("/buyers/{buyer_id}")
def get_buyer(buyer_id: UUID):
    db = get_supabase()
    result = db.table("buyers").select("*, buyer_criteria(*)").eq("buyer_id", str(buyer_id)).single().execute()
    if not result.data:
        raise HTTPException(404, "Buyer not found")
    return result.data


# ── Offers ────────────────────────────────────────────────────────────────────

@router.get("/offers")
def list_offers(
    property_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    db = get_supabase()
    q = db.table("offers").select("*, buyers(buyer_name, buyer_type, close_speed_days)")
    if property_id:
        q = q.eq("property_id", property_id)
    if status:
        q = q.eq("status", status)
    result = q.order("offer_date", desc=True).range(offset, offset + limit - 1).execute()
    return {"offers": result.data or [], "count": len(result.data or [])}


@router.post("/offers", status_code=201)
def create_offer(payload: OfferCreate):
    db = get_supabase()
    result = db.table("offers").insert(payload.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create offer")
    return result.data[0]


@router.put("/offers/{offer_id}")
def update_offer_status(offer_id: UUID, payload: OfferUpdate):
    valid = {"Pending", "Countered", "Accepted", "Rejected", "Expired"}
    if payload.status not in valid:
        raise HTTPException(400, f"status must be one of: {valid}")
    db = get_supabase()
    updates: dict = {"status": payload.status}
    if payload.notes:
        updates["notes"] = payload.notes
    result = db.table("offers").update(updates).eq("offer_id", str(offer_id)).execute()
    if not result.data:
        raise HTTPException(404, "Offer not found")
    return result.data[0]


# ── Closings ──────────────────────────────────────────────────────────────────

@router.get("/closings")
def list_closings(
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    db = get_supabase()
    result = db.table("closings").select(
        "*, buyers(buyer_name), contracts(sale_price, closing_date)"
    ).order("close_date", desc=True).range(offset, offset + limit - 1).execute()
    return {"closings": result.data or [], "count": len(result.data or [])}


@router.post("/closings", status_code=201)
def create_closing(payload: ClosingCreate):
    db = get_supabase()
    result = db.table("closings").insert(payload.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(500, "Failed to record closing")

    closing = result.data[0]

    # Update property status to 'sold'
    db.table("properties").update({"status": "sold"}).eq("id", payload.property_id).execute()

    return closing


# ── Profit Analysis ───────────────────────────────────────────────────────────

@router.get("/profit")
def profit_analysis(
    year: Optional[int] = None,
):
    """Portfolio-level profit and capital recovery summary."""
    db = get_supabase()
    q = db.table("closings").select("net_profit, capital_recovered, sale_price, close_date")
    if year:
        q = q.gte("close_date", f"{year}-01-01").lte("close_date", f"{year}-12-31")
    closings = q.execute().data or []

    total_profit    = sum(float(r.get("net_profit") or 0) for r in closings)
    total_recovered = sum(float(r.get("capital_recovered") or 0) for r in closings)
    total_revenue   = sum(float(r.get("sale_price") or 0) for r in closings)
    avg_profit      = total_profit / len(closings) if closings else 0

    # Offer conversion rates
    all_offers = db.table("offers").select("status").execute().data or []
    accepted = sum(1 for o in all_offers if o.get("status") == "Accepted")
    conversion = round(accepted / len(all_offers), 4) if all_offers else 0

    return {
        "closed_deals": len(closings),
        "total_net_profit": round(total_profit, 2),
        "total_capital_recovered": round(total_recovered, 2),
        "total_revenue": round(total_revenue, 2),
        "avg_profit_per_deal": round(avg_profit, 2),
        "offer_conversion_rate": conversion,
        "year_filter": year,
    }
