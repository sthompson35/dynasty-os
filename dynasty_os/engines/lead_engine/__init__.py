"""Lead Engine — 10 sub-systems for full-cycle lead management."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


LEAD_TYPES = [
    "Seller", "Buyer", "Investor", "Agent", "Wholesaler",
    "Vendor", "Partner", "Tenant", "Business", "Media", "Government", "Community",
]

LEAD_GRADES = ["A", "B", "C", "D"]

PIPELINE_STAGES = [
    "New", "Contacted", "Qualified", "Appointment Set",
    "Offer Sent", "Negotiating", "Under Contract", "Closed", "Dead",
]


@dataclass
class Lead:
    lead_id: str
    lead_type: str
    source: str
    status: str = "New"
    score: int = 0
    owner: str = ""
    pipeline_stage: str = "New"
    notes: str = ""
    next_action_date: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class TrafficEngine:
    """Drives inbound/outbound traffic across all acquisition channels."""

    def __init__(self) -> None:
        self.channels: list[str] = [
            "Direct Mail", "Cold Calling", "SMS", "PPC", "SEO",
            "Social Media", "Driving for Dollars", "Probate", "Foreclosure", "Referral",
        ]
        self._traffic_log: list[dict[str, Any]] = []

    def process(self, channel: str, volume: int, campaign_id: str = "") -> dict[str, Any]:
        record = {
            "channel": channel,
            "volume": volume,
            "campaign_id": campaign_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._traffic_log.append(record)
        return record

    def get_metrics(self) -> dict[str, Any]:
        total = sum(r["volume"] for r in self._traffic_log)
        by_channel: dict[str, int] = {}
        for r in self._traffic_log:
            by_channel[r["channel"]] = by_channel.get(r["channel"], 0) + r["volume"]
        return {"total_traffic": total, "by_channel": by_channel, "log_count": len(self._traffic_log)}


class CaptureEngine:
    """Captures and stores inbound leads from all sources."""

    def __init__(self) -> None:
        self._captured: list[Lead] = []

    def process(self, raw_data: dict[str, Any]) -> Lead:
        lead = Lead(
            lead_id=raw_data.get("lead_id", ""),
            lead_type=raw_data.get("lead_type", "Seller"),
            source=raw_data.get("source", "Unknown"),
            status="New",
            owner=raw_data.get("owner", "Unassigned"),
            metadata=raw_data,
        )
        self._captured.append(lead)
        return lead

    def get_metrics(self) -> dict[str, Any]:
        by_source: dict[str, int] = {}
        for lead in self._captured:
            by_source[lead.source] = by_source.get(lead.source, 0) + 1
        return {"total_captured": len(self._captured), "by_source": by_source}


class EnrichmentEngine:
    """Appends property data, skip-trace results, and market comps to leads."""

    def __init__(self) -> None:
        self._enriched_count = 0

    def process(self, lead: Lead, enrichment_data: dict[str, Any]) -> Lead:
        lead.metadata.update(enrichment_data)
        lead.status = "Enriched"
        self._enriched_count += 1
        return lead

    def get_metrics(self) -> dict[str, Any]:
        return {"total_enriched": self._enriched_count}


class QualificationEngine:
    """Scores and grades leads based on motivation, equity, and timeline."""

    WEIGHTS = {
        "motivation": 0.30,
        "equity": 0.25,
        "condition": 0.15,
        "timeline": 0.20,
        "price_expectation": 0.10,
    }

    def __init__(self) -> None:
        self._qualified: list[dict[str, Any]] = []

    def process(self, lead: Lead, scores: dict[str, int]) -> dict[str, Any]:
        total = sum(
            scores.get(k, 0) * w for k, w in self.WEIGHTS.items()
        )
        total_int = int(total)
        grade = (
            "A" if total_int >= 80
            else "B" if total_int >= 60
            else "C" if total_int >= 40
            else "D"
        )
        lead.score = total_int
        result = {
            "lead_id": lead.lead_id,
            "scores": scores,
            "total_score": total_int,
            "grade": grade,
        }
        self._qualified.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        if not self._qualified:
            return {"total_qualified": 0, "grade_distribution": {}}
        grade_dist: dict[str, int] = {}
        for q in self._qualified:
            g = q["grade"]
            grade_dist[g] = grade_dist.get(g, 0) + 1
        avg = sum(q["total_score"] for q in self._qualified) / len(self._qualified)
        return {
            "total_qualified": len(self._qualified),
            "average_score": round(avg, 1),
            "grade_distribution": grade_dist,
        }


class RoutingEngine:
    """Routes leads to the right team member based on type, score, and workload."""

    def __init__(self) -> None:
        self._routing_rules: dict[str, str] = {
            "A": "senior_acquisitions",
            "B": "acquisitions",
            "C": "follow_up_team",
            "D": "nurture_sequence",
        }
        self._routed: list[dict[str, Any]] = []

    def process(self, lead: Lead, grade: str, override_assignee: str = "") -> dict[str, Any]:
        assignee = override_assignee or self._routing_rules.get(grade, "general_inbox")
        lead.owner = assignee
        result = {
            "lead_id": lead.lead_id,
            "grade": grade,
            "routed_to": assignee,
            "routed_at": datetime.utcnow().isoformat(),
        }
        self._routed.append(result)
        return result

    def get_metrics(self) -> dict[str, Any]:
        by_assignee: dict[str, int] = {}
        for r in self._routed:
            a = r["routed_to"]
            by_assignee[a] = by_assignee.get(a, 0) + 1
        return {"total_routed": len(self._routed), "by_assignee": by_assignee}


class FollowUpEngine:
    """Manages follow-up sequences, callbacks, and task creation."""

    def __init__(self) -> None:
        self._follow_ups: list[dict[str, Any]] = []

    def process(self, lead: Lead, channel: str, message: str, scheduled_at: str = "") -> dict[str, Any]:
        task = {
            "lead_id": lead.lead_id,
            "channel": channel,
            "message": message,
            "scheduled_at": scheduled_at or datetime.utcnow().isoformat(),
            "status": "Scheduled",
        }
        self._follow_ups.append(task)
        return task

    def get_metrics(self) -> dict[str, Any]:
        by_channel: dict[str, int] = {}
        for t in self._follow_ups:
            c = t["channel"]
            by_channel[c] = by_channel.get(c, 0) + 1
        return {"total_follow_ups": len(self._follow_ups), "by_channel": by_channel}


class NurtureEngine:
    """Long-term nurture sequences for not-yet-ready leads."""

    def __init__(self) -> None:
        self._nurture_sequences: list[dict[str, Any]] = []

    def process(self, lead: Lead, sequence_name: str, touchpoints: list[dict[str, Any]]) -> dict[str, Any]:
        seq = {
            "lead_id": lead.lead_id,
            "sequence_name": sequence_name,
            "touchpoints": touchpoints,
            "enrolled_at": datetime.utcnow().isoformat(),
            "status": "Active",
        }
        self._nurture_sequences.append(seq)
        return seq

    def get_metrics(self) -> dict[str, Any]:
        active = sum(1 for s in self._nurture_sequences if s["status"] == "Active")
        return {"total_in_nurture": len(self._nurture_sequences), "active_sequences": active}


class ConversionEngine:
    """Tracks and drives lead-to-contract conversion events."""

    def __init__(self) -> None:
        self._conversions: list[dict[str, Any]] = []

    def process(self, lead: Lead, conversion_type: str, deal_id: str = "") -> dict[str, Any]:
        event = {
            "lead_id": lead.lead_id,
            "conversion_type": conversion_type,
            "deal_id": deal_id,
            "converted_at": datetime.utcnow().isoformat(),
        }
        lead.status = "Converted"
        lead.pipeline_stage = "Under Contract"
        self._conversions.append(event)
        return event

    def get_metrics(self) -> dict[str, Any]:
        by_type: dict[str, int] = {}
        for c in self._conversions:
            t = c["conversion_type"]
            by_type[t] = by_type.get(t, 0) + 1
        return {"total_conversions": len(self._conversions), "by_type": by_type}


class IntelligenceEngine:
    """Aggregates lead intelligence: seller motivations, market data, competitive analysis."""

    def __init__(self) -> None:
        self._intel_records: list[dict[str, Any]] = []

    def process(self, lead: Lead, intel_data: dict[str, Any]) -> dict[str, Any]:
        record = {
            "lead_id": lead.lead_id,
            "intel": intel_data,
            "recorded_at": datetime.utcnow().isoformat(),
        }
        self._intel_records.append(record)
        return record

    def get_metrics(self) -> dict[str, Any]:
        return {"total_intel_records": len(self._intel_records)}


class AnalyticsEngine:
    """Lead pipeline analytics, conversion funnels, and channel performance."""

    def __init__(self) -> None:
        self._snapshots: list[dict[str, Any]] = []

    def process(self, pipeline_data: dict[str, Any]) -> dict[str, Any]:
        snapshot = {
            "data": pipeline_data,
            "captured_at": datetime.utcnow().isoformat(),
        }
        self._snapshots.append(snapshot)
        return snapshot

    def get_metrics(self) -> dict[str, Any]:
        return {"snapshots_taken": len(self._snapshots)}


class LeadEngine:
    """Master orchestrator for all 10 Lead Engine sub-systems."""

    def __init__(self) -> None:
        self.traffic = TrafficEngine()
        self.capture = CaptureEngine()
        self.enrichment = EnrichmentEngine()
        self.qualification = QualificationEngine()
        self.routing = RoutingEngine()
        self.follow_up = FollowUpEngine()
        self.nurture = NurtureEngine()
        self.conversion = ConversionEngine()
        self.intelligence = IntelligenceEngine()
        self.analytics = AnalyticsEngine()

    def process_new_lead(
        self,
        raw_data: dict[str, Any],
        enrichment_data: dict[str, Any] | None = None,
        qualification_scores: dict[str, int] | None = None,
    ) -> dict[str, Any]:
        lead = self.capture.process(raw_data)

        if enrichment_data:
            lead = self.enrichment.process(lead, enrichment_data)

        qual_result: dict[str, Any] = {}
        if qualification_scores:
            qual_result = self.qualification.process(lead, qualification_scores)
            grade = qual_result["grade"]
            self.routing.process(lead, grade)

        return {
            "lead": lead,
            "qualification": qual_result,
        }

    def get_metrics(self) -> dict[str, Any]:
        return {
            "traffic": self.traffic.get_metrics(),
            "capture": self.capture.get_metrics(),
            "enrichment": self.enrichment.get_metrics(),
            "qualification": self.qualification.get_metrics(),
            "routing": self.routing.get_metrics(),
            "follow_up": self.follow_up.get_metrics(),
            "nurture": self.nurture.get_metrics(),
            "conversion": self.conversion.get_metrics(),
            "intelligence": self.intelligence.get_metrics(),
            "analytics": self.analytics.get_metrics(),
        }


__all__ = [
    "Lead",
    "TrafficEngine",
    "CaptureEngine",
    "EnrichmentEngine",
    "QualificationEngine",
    "RoutingEngine",
    "FollowUpEngine",
    "NurtureEngine",
    "ConversionEngine",
    "IntelligenceEngine",
    "AnalyticsEngine",
    "LeadEngine",
]
