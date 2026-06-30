"""Property Intelligence API — Vacancy, Tax, Ownership, Comps, Rent."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db import get_supabase

router = APIRouter(prefix="/api/property", tags=["Property Intelligence"])


# ─── Models ──────────────────────────────────────────────────────────────────

class PropertyCreate(BaseModel):
    property_code: str
    address: str
    city: str = "Park Hills"
    state: str = "MO"
    zip: Optional[str] = None
    county: str = "St. Francois"
    property_type: str = "single_family"
    year_built: Optional[int] = None
    sqft: Optional[float] = None
    beds: Optional[float] = None
    baths: Optional[float] = None
    lot_size: Optional[float] = None
    acquisition_price: Optional[float] = None
    estimated_arv: Optional[float] = None
    estimated_rent: Optional[float] = None
    status: str = "planning"
    metadata: dict = {}


class VacancyCreate(BaseModel):
    address: str
    city: str = "Park Hills"
    state: str = "MO"
    zip: Optional[str] = None
    parcel_id: Optional[str] = None
    vacancy_type: str
    years_vacant: Optional[float] = None
    owner_name: Optional[str] = None
    owner_mailing: Optional[str] = None
    notes: Optional[str] = None


class TaxCreate(BaseModel):
    address: str
    parcel_id: Optional[str] = None
    owner_name: Optional[str] = None
    tax_year: int
    amount_owed: float
    years_delinquent: int = 1
    lien_filed: bool = False
    county: str = "St. Francois"
    status: str = "Active"


class OwnershipCreate(BaseModel):
    address: str
    parcel_id: Optional[str] = None
    owner_name: Optional[str] = None
    owner_type: str = "Unknown"
    mailing_address: Optional[str] = None
    phone: list[str] = []
    email: list[str] = []
    absentee: bool = False
    out_of_state: bool = False
    years_owned: Optional[float] = None
    purchase_price: Optional[float] = None


class CompCreate(BaseModel):
    subject_id: Optional[str] = None
    comp_address: str
    sale_price: float
    sale_date: str
    sqft: float
    beds: float
    baths: float
    distance_miles: Optional[float] = None
    condition: str = "Similar"
    source: Optional[str] = None


class RentCreate(BaseModel):
    address: str
    beds: float
    baths: float
    sqft: Optional[float] = None
    asking_rent: Optional[float] = None
    market_rent_low: Optional[float] = None
    market_rent_mid: Optional[float] = None
    market_rent_high: Optional[float] = None
    occupancy_rate: float = 0.95
    source: Optional[str] = None


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("")
def list_properties(
    city: Optional[str] = None,
    status: Optional[str] = None,
    property_type: Optional[str] = None,
    address: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    db = get_supabase()
    q = db.table("properties").select("*")
    if city:
        q = q.eq("city", city)
    if status:
        q = q.eq("status", status)
    if property_type:
        q = q.eq("property_type", property_type)
    if address:
        q = q.ilike("address", f"%{address}%")
    result = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"properties": result.data or [], "offset": offset}


@router.post("", status_code=201)
def create_property(payload: PropertyCreate):
    db = get_supabase()
    result = db.table("properties").insert(payload.model_dump()).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create property")
    return result.data[0]


# ── Vacancy ─────────────────────────────────────────────────────────────────

@router.get("/vacancy")
def list_vacant(
    city: Optional[str] = None,
    vacancy_type: Optional[str] = None,
    skip_traced: Optional[bool] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
):
    """Return vacant properties — primary feed for Park Hills Smart Town Scanner."""
    db = get_supabase()
    q = db.table("property_vacancy").select("*")
    if city:
        q = q.eq("city", city)
    if vacancy_type:
        q = q.eq("vacancy_type", vacancy_type)
    if skip_traced is not None:
        q = q.eq("skip_traced", skip_traced)
    result = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"vacant_properties": result.data or [], "count": len(result.data or [])}


@router.post("/vacancy", status_code=201)
def add_vacancy(payload: VacancyCreate):
    db = get_supabase()
    result = db.table("property_vacancy").insert(payload.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(500, "Failed to add vacancy record")
    return result.data[0]


# ── Tax Delinquencies ────────────────────────────────────────────────────────

@router.get("/tax")
def list_tax_delinquent(
    years_delinquent_gte: int = 1,
    status: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
):
    """Return tax-delinquent properties sorted by severity."""
    db = get_supabase()
    q = db.table("property_tax").select("*").gte("years_delinquent", years_delinquent_gte)
    if status:
        q = q.eq("status", status)
    result = q.order("years_delinquent", desc=True).range(offset, offset + limit - 1).execute()
    return {"tax_delinquent": result.data or [], "count": len(result.data or [])}


@router.post("/tax", status_code=201)
def add_tax_record(payload: TaxCreate):
    db = get_supabase()
    result = db.table("property_tax").insert(payload.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create tax record")
    return result.data[0]


# ── Ownership / Skip Trace ───────────────────────────────────────────────────

@router.get("/{property_id}/ownership")
def get_ownership(property_id: UUID):
    db = get_supabase()
    result = db.table("property_ownership").select("*").eq("property_id", str(property_id)).execute()
    return {"ownership": result.data or []}


@router.post("/ownership", status_code=201)
def add_ownership(payload: OwnershipCreate):
    db = get_supabase()
    result = db.table("property_ownership").insert(payload.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create ownership record")
    return result.data[0]


# ── Comps ────────────────────────────────────────────────────────────────────

@router.get("/{property_id}/comps")
def get_comps(property_id: UUID):
    db = get_supabase()
    result = db.table("property_comps").select("*").eq("subject_id", str(property_id)).order("sale_date", desc=True).execute()
    rows = result.data or []
    avg_price = sum(r["sale_price"] for r in rows) / len(rows) if rows else 0
    avg_ppsf  = sum(r.get("price_per_sqft") or 0 for r in rows) / len(rows) if rows else 0
    return {
        "comps": rows,
        "count": len(rows),
        "avg_sale_price": round(avg_price, 2),
        "avg_price_per_sqft": round(avg_ppsf, 2),
    }


@router.post("/comps", status_code=201)
def add_comp(payload: CompCreate):
    db = get_supabase()
    result = db.table("property_comps").insert(payload.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(500, "Failed to add comp")
    return result.data[0]


# ── Rent Estimates ───────────────────────────────────────────────────────────

@router.get("/{property_id}/rent")
def get_rent(property_id: UUID):
    db = get_supabase()
    result = db.table("property_rent").select("*").eq("property_id", str(property_id)).order("as_of_date", desc=True).limit(1).execute()
    return result.data[0] if result.data else {}


@router.get("/rent")
def market_rent(
    beds: Optional[float] = None,
    city: Optional[str] = "Park Hills",
    limit: int = Query(default=20, le=100),
):
    """Return current rental market data for comparable units."""
    db = get_supabase()
    q = db.table("property_rent").select("*")
    if beds is not None:
        q = q.eq("beds", beds)
    result = q.order("as_of_date", desc=True).limit(limit).execute()
    rows = result.data or []
    avg_mid = sum(r.get("market_rent_mid") or 0 for r in rows) / len(rows) if rows else 0
    return {"market_rents": rows, "avg_market_rent_mid": round(avg_mid, 2)}


@router.post("/rent", status_code=201)
def add_rent(payload: RentCreate):
    db = get_supabase()
    result = db.table("property_rent").insert(payload.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(500, "Failed to add rent record")
    return result.data[0]


@router.get("/{property_id}")
def get_property(property_id: UUID):
    db = get_supabase()
    result = db.table("properties").select("*").eq("id", str(property_id)).single().execute()
    if not result.data:
        raise HTTPException(404, "Property not found")
    return result.data
