"""Automation event log - receives write-backs from the Dynasty n8n V3 workflow."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/automation", tags=["Automation"])
logger = logging.getLogger("dynasty_property_os.automation")

_MAX_EVENTS = 500
_recent_events: list[dict[str, Any]] = []


class AutomationEvent(BaseModel):
    event: str
    trigger: str | None = None
    timestamp: str | None = None
    result: str | None = None
    owner: str | None = "dynasty_os_n8n"
    payload: dict[str, Any] = Field(default_factory=dict)

    class Config:
        extra = "allow"


@router.post("/log")
def log_automation_event(event: AutomationEvent) -> dict:
    record = event.model_dump()
    record["received_at"] = datetime.now(timezone.utc).isoformat()
    logger.info("automation_event %s", record)
    _recent_events.append(record)
    del _recent_events[:-_MAX_EVENTS]
    return {"status": "logged", "event": record["event"]}


@router.get("/log")
def list_automation_events(limit: int = 50) -> dict:
    return {"events": _recent_events[-limit:], "total": len(_recent_events)}
