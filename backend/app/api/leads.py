"""Lead Engine API — CRUD + scoring + routing for all lead types."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db import get_supabase

router = APIRouter(prefix="/api/leads", tags=["Lead Engine"])


# ─── Models ──────────────────────────────────────────────────────────────────

LEAD_TYPES = (
    "Seller", "Buyer", "Investor", "Agent", "Wholesaler",
    "Vendor", "Partner", "Tenant", "Business", "Media", "Government", "Community",
)

LEAD_SOURCES = (
    "Web Form", "SMS", "Phone Call", "Direct Mail", "Facebook",
    "Cold Outreach", "Referral", "Drive-By", "MLS", "Public Records",
    "Bandit Sign", "Google Ads", "Email Campaign", "Instagram",
)

LEAD_STATUSES = (
    "New", "Contacted", "Qualified", "Nurture", "Hot", "Contract",
    "Closed", "Dead", "Archived",
)


class LeadCreate(BaseModel):
    lead_type: str
    source: Optional[str] = None
    status: str = "New"
    owner: Optional[str] = None
    pipeline_stage: Optional[str] = None
    notes: Optional[str] = None
    next_action_date: Optional[str] = None
    metadata: dict = {}


class LeadUpdate(BaseModel):
    lead_type: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    score: Optional[int] = None
    owner: Optional[str] = None
    pipeline_stage: Optional[str] = None
    notes: Optional[str] = None
    next_action_date: Optional[str] = None
    metadata: Optional[dict] = None


class LeadActivityCreate(BaseModel):
    activity_type: str
    description: str


class LeadRouteRequest(BaseModel):
    routed_to: str
    reason: Optional[str] = None


class LeadScoreBreakdown(BaseModel):
    motivation_score: int = 0
    equity_score: int = 0
    condition_score: int = 0
    timeline_score: int = 0
    price_expectation_score: int = 0
    total_score: int = 0
    grade: str = "D"


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("")
def list_leads(
    lead_type: Optional[str] = None,
    status: Optional[str] = None,
    grade: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    """Return paginated leads with optional filters."""
    db = get_supabase()
    q = db.table("leads").select(
        "*, lead_scoring(grade, total_score), lead_routing(routed_to)"
    )
    if lead_type:
        q = q.eq("lead_type", lead_type)
    if status:
        q = q.eq("status", status)
    q = q.order("date_created", desc=True).range(offset, offset + limit - 1)
    result = q.execute()

    rows = result.data or []

    # Filter by grade post-join if provided
    if grade:
        rows = [
            r for r in rows
            if r.get("lead_scoring") and any(
                s.get("grade") == grade for s in (r["lead_scoring"] if isinstance(r["lead_scoring"], list) else [r["lead_scoring"]])
            )
        ]

    return {"leads": rows, "count": len(rows), "offset": offset}


@router.post("", status_code=201)
def create_lead(payload: LeadCreate):
    """Create a new lead and log a creation activity."""
    if payload.lead_type not in LEAD_TYPES:
        raise HTTPException(400, f"Invalid lead_type. Choose from: {LEAD_TYPES}")

    db = get_supabase()
    result = db.table("leads").insert(payload.model_dump()).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create lead")

    lead = result.data[0]
    lead_id = lead["lead_id"]

    db.table("lead_activities").insert({
        "lead_id": lead_id,
        "activity_type": "Created",
        "description": f"Lead created via API — source: {payload.source or 'unknown'}",
    }).execute()

    return lead


@router.get("/stats")
def lead_stats():
    """Summary counts by status and grade."""
    db = get_supabase()

    def fetch_all(table: str, columns: str) -> list[dict]:
        rows: list[dict] = []
        page_size = 1000
        offset = 0
        while True:
            page = db.table(table).select(columns).range(offset, offset + page_size - 1).execute().data or []
            rows.extend(page)
            if len(page) < page_size:
                return rows
            offset += page_size

    leads = fetch_all("leads", "status, score")
    scores = fetch_all("lead_scoring", "grade")

    by_status: dict[str, int] = {}
    for row in leads:
        s = row.get("status", "Unknown")
        by_status[s] = by_status.get(s, 0) + 1

    by_grade: dict[str, int] = {}
    for row in scores:
        g = row.get("grade", "D")
        by_grade[g] = by_grade.get(g, 0) + 1

    return {
        "total": len(leads),
        "by_status": by_status,
        "by_grade": by_grade,
    }


@router.get("/{lead_id}")
def get_lead(lead_id: UUID):
    """Get a single lead with scoring and activity history."""
    db = get_supabase()
    result = db.table("leads").select(
        "*, lead_scoring(*), lead_activities(*), lead_routing(*)"
    ).eq("lead_id", str(lead_id)).single().execute()

    if not result.data:
        raise HTTPException(404, "Lead not found")
    return result.data


@router.put("/{lead_id}")
def update_lead(lead_id: UUID, payload: LeadUpdate):
    """Partial update a lead."""
    db = get_supabase()
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")

    result = db.table("leads").update(updates).eq("lead_id", str(lead_id)).execute()
    if not result.data:
        raise HTTPException(404, "Lead not found")

    db.table("lead_activities").insert({
        "lead_id": str(lead_id),
        "activity_type": "Updated",
        "description": f"Fields updated: {', '.join(updates.keys())}",
    }).execute()

    return result.data[0]


@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: UUID):
    """Delete a lead and all related records (cascade)."""
    db = get_supabase()
    db.table("leads").delete().eq("lead_id", str(lead_id)).execute()


@router.post("/{lead_id}/activity", status_code=201)
def log_activity(lead_id: UUID, payload: LeadActivityCreate):
    """Log a manual activity against a lead."""
    db = get_supabase()
    result = db.table("lead_activities").insert({
        "lead_id": str(lead_id),
        "activity_type": payload.activity_type,
        "description": payload.description,
    }).execute()

    if not result.data:
        raise HTTPException(500, "Failed to log activity")
    return result.data[0]


@router.post("/{lead_id}/score", status_code=201)
def score_lead(lead_id: UUID, payload: LeadScoreBreakdown):
    """Persist a lead score breakdown and update the lead's aggregate score."""
    total = (
        payload.motivation_score
        + payload.equity_score
        + payload.condition_score
        + payload.timeline_score
        + payload.price_expectation_score
    )
    total = max(0, min(100, total))
    grade = "A" if total >= 80 else "B" if total >= 60 else "C" if total >= 40 else "D"

    db = get_supabase()

    scoring_payload = {
        "lead_id": str(lead_id),
        "motivation_score": payload.motivation_score,
        "equity_score": payload.equity_score,
        "condition_score": payload.condition_score,
        "timeline_score": payload.timeline_score,
        "price_expectation_score": payload.price_expectation_score,
        "total_score": total,
        "grade": grade,
    }

    existing = db.table("lead_scoring").select("scoring_id").eq("lead_id", str(lead_id)).limit(1).execute().data or []
    if existing:
        db.table("lead_scoring").update(scoring_payload).eq("scoring_id", existing[0]["scoring_id"]).execute()
    else:
        db.table("lead_scoring").insert(scoring_payload).execute()

    # Update aggregate score on the lead
    db.table("leads").update({"score": total}).eq("lead_id", str(lead_id)).execute()

    db.table("lead_activities").insert({
        "lead_id": str(lead_id),
        "activity_type": "Scored",
        "description": f"Lead scored {total}/100 — Grade {grade}",
    }).execute()

    return {"lead_id": str(lead_id), "total_score": total, "grade": grade}


@router.post("/{lead_id}/route", status_code=201)
def route_lead(lead_id: UUID, payload: LeadRouteRequest):
    """Route a lead to a team member or workflow queue."""
    db = get_supabase()
    result = db.table("lead_routing").insert({
        "lead_id": str(lead_id),
        "routed_to": payload.routed_to,
        "reason": payload.reason or "Manual routing",
    }).execute()

    if not result.data:
        raise HTTPException(500, "Failed to route lead")

    db.table("leads").update({"owner": payload.routed_to}).eq("lead_id", str(lead_id)).execute()

    db.table("lead_activities").insert({
        "lead_id": str(lead_id),
        "activity_type": "Routed",
        "description": f"Routed to {payload.routed_to} — {payload.reason or 'no reason given'}",
    }).execute()

    return result.data[0]
