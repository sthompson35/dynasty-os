"""HELIX — Training Commander. Manages onboarding, training, and knowledge base."""
from __future__ import annotations
from datetime import datetime
from typing import Any


TRAINING_TRACKS = [
    "Lead Generation",
    "Deal Analysis",
    "Acquisition Negotiation",
    "Capital Raising",
    "Project Management",
    "Disposition Strategy",
    "Investor Relations",
    "Legal & Compliance",
]


class HelixTrooper:
    name = "HELIX"
    role = "Training Commander"
    domain = "Knowledge & Training"
    capabilities = [
        "onboarding",
        "workflow training",
        "knowledge base management",
        "SOP documentation",
        "performance coaching",
    ]

    def __init__(self) -> None:
        self._knowledge_base: dict[str, dict[str, Any]] = {}
        self._training_records: list[dict[str, Any]] = []
        self._sops: dict[str, dict[str, Any]] = {}

    def onboard_team_member(self, user_id: str, role: str, tracks: list[str] | None = None) -> dict[str, Any]:
        assigned_tracks = tracks or TRAINING_TRACKS[:3]
        record = {
            "user_id": user_id,
            "role": role,
            "assigned_tracks": assigned_tracks,
            "completed_tracks": [],
            "progress": 0.0,
            "onboarded_at": datetime.utcnow().isoformat(),
        }
        self._training_records.append(record)
        return record

    def update_progress(self, user_id: str, track: str, progress_pct: float) -> dict[str, Any]:
        for record in self._training_records:
            if record["user_id"] == user_id:
                if track not in record["completed_tracks"] and progress_pct >= 100:
                    record["completed_tracks"].append(track)
                total = len(record["assigned_tracks"])
                done = len(record["completed_tracks"])
                record["progress"] = round((done / total) * 100, 1) if total else 0
                return record
        return {"error": f"User {user_id} not found"}

    def add_knowledge_article(self, article_id: str, title: str, category: str, content: str) -> dict[str, Any]:
        article = {
            "article_id": article_id,
            "title": title,
            "category": category,
            "content": content,
            "created_at": datetime.utcnow().isoformat(),
        }
        self._knowledge_base[article_id] = article
        return article

    def add_sop(self, sop_id: str, title: str, department: str, steps: list[str]) -> dict[str, Any]:
        sop = {
            "sop_id": sop_id,
            "title": title,
            "department": department,
            "steps": steps,
            "version": "1.0",
            "created_at": datetime.utcnow().isoformat(),
        }
        self._sops[sop_id] = sop
        return sop

    def get_status(self) -> dict[str, Any]:
        return {
            "trooper": self.name,
            "role": self.role,
            "team_members_onboarded": len(self._training_records),
            "knowledge_articles": len(self._knowledge_base),
            "sops_documented": len(self._sops),
        }

    def get_metrics(self) -> dict[str, Any]:
        if not self._training_records:
            return {"total_onboarded": 0}
        avg_progress = sum(r["progress"] for r in self._training_records) / len(self._training_records)
        return {
            "total_onboarded": len(self._training_records),
            "avg_training_progress": round(avg_progress, 1),
            "knowledge_articles": len(self._knowledge_base),
            "sops": len(self._sops),
        }
