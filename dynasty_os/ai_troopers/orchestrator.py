"""Dynasty OS Orchestrator — routes user requests to the correct AI Trooper."""
from __future__ import annotations
from datetime import datetime
from typing import Any

from dynasty_os.ai_troopers.atlas import ATLASTrooper
from dynasty_os.ai_troopers.trooper_alpha import TrooperAlpha
from dynasty_os.ai_troopers.trooper_charlie import TrooperCharlie
from dynasty_os.ai_troopers.edison import EdisonTrooper
from dynasty_os.ai_troopers.helix import HelixTrooper
from dynasty_os.ai_troopers.barbara import BarbaraTrooper
from dynasty_os.ai_troopers.adam import AdamTrooper
from dynasty_os.ai_troopers.cina import CinaTrooper
from dynasty_os.ai_troopers.watcher import WatcherTrooper
from dynasty_os.ai_troopers.listener import ListenerTrooper


ROUTING_MAP = {
    "operations": "ATLAS",
    "project": "ATLAS",
    "construction": "ATLAS",
    "strategy": "TROOPER_ALPHA",
    "exit_strategy": "TROOPER_ALPHA",
    "portfolio_strategy": "TROOPER_ALPHA",
    "deal": "TROOPER_CHARLIE",
    "analyze_deal": "TROOPER_CHARLIE",
    "underwriting": "TROOPER_CHARLIE",
    "technology": "EDISON",
    "digital_twin": "EDISON",
    "integration": "EDISON",
    "training": "HELIX",
    "onboarding": "HELIX",
    "knowledge": "HELIX",
    "investor": "BARBARA",
    "capital": "BARBARA",
    "distribution": "BARBARA",
    "acquisition": "ADAM",
    "arv": "ADAM",
    "mao": "ADAM",
    "comps": "ADAM",
    "market": "CINA",
    "market_intelligence": "CINA",
    "county": "CINA",
    "monitoring": "WATCHER",
    "alert": "WATCHER",
    "kpi": "WATCHER",
    "communications": "LISTENER",
    "email": "LISTENER",
    "sms": "LISTENER",
    "message": "LISTENER",
}


class DynastyOrchestrator:
    """Routes user requests to the correct Dynasty OS AI Trooper."""

    def __init__(self) -> None:
        self.troopers: dict[str, Any] = {
            "ATLAS": ATLASTrooper(),
            "TROOPER_ALPHA": TrooperAlpha(),
            "TROOPER_CHARLIE": TrooperCharlie(),
            "EDISON": EdisonTrooper(),
            "HELIX": HelixTrooper(),
            "BARBARA": BarbaraTrooper(),
            "ADAM": AdamTrooper(),
            "CINA": CinaTrooper(),
            "WATCHER": WatcherTrooper(),
            "LISTENER": ListenerTrooper(),
        }
        self._request_log: list[dict[str, Any]] = []

    def route(self, user_request: dict[str, Any]) -> dict[str, Any]:
        request_type = user_request.get("type", "").lower()
        explicit_trooper = user_request.get("trooper", "").upper()

        if explicit_trooper and explicit_trooper in self.troopers:
            trooper_name = explicit_trooper
        else:
            trooper_name = self._resolve_trooper(request_type)

        trooper = self.troopers.get(trooper_name)
        if not trooper:
            return {
                "error": f"No trooper found for request type: {request_type}",
                "available_troopers": list(self.troopers.keys()),
            }

        result = self._dispatch(trooper, trooper_name, user_request)

        log_entry = {
            "request_type": request_type,
            "routed_to": trooper_name,
            "success": "error" not in result,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._request_log.append(log_entry)

        return {
            "routed_to": trooper_name,
            "trooper_role": getattr(trooper, "role", ""),
            "result": result,
            "request_id": f"REQ-{len(self._request_log):08d}",
        }

    def _resolve_trooper(self, request_type: str) -> str:
        for keyword, trooper in ROUTING_MAP.items():
            if keyword in request_type:
                return trooper
        return "TROOPER_CHARLIE"

    def _dispatch(self, trooper: Any, trooper_name: str, request: dict[str, Any]) -> dict[str, Any]:
        payload = request.get("payload", {})

        if trooper_name == "ATLAS":
            return trooper.route(payload)
        elif trooper_name == "TROOPER_ALPHA":
            return trooper.evaluate_strategy(payload)
        elif trooper_name == "TROOPER_CHARLIE":
            return trooper.analyze_deal(payload)
        elif trooper_name == "EDISON":
            action = request.get("action", "status")
            if action == "optimize_twin":
                return trooper.optimize_digital_twin(
                    payload.get("property_id", ""), payload.get("sensor_data", {})
                )
            return trooper.get_status()
        elif trooper_name == "HELIX":
            action = request.get("action", "status")
            if action == "onboard":
                return trooper.onboard_team_member(
                    payload.get("user_id", ""), payload.get("role", "")
                )
            return trooper.get_status()
        elif trooper_name == "BARBARA":
            action = request.get("action", "status")
            if action == "present_opportunity":
                return trooper.present_opportunity(
                    payload.get("investor_id", ""), payload
                )
            return trooper.get_status()
        elif trooper_name == "ADAM":
            return trooper.analyze_property(
                payload, payload.get("comps", [])
            )
        elif trooper_name == "CINA":
            action = request.get("action", "snapshot")
            if action == "snapshot":
                return trooper.record_market_snapshot(
                    payload.get("market", ""), payload.get("indicators", {})
                )
            return trooper.get_status()
        elif trooper_name == "WATCHER":
            action = request.get("action", "status")
            if action == "watch":
                return trooper.watch(
                    payload.get("metric", ""), payload.get("threshold", 0)
                )
            if action == "check":
                return trooper.check(
                    payload.get("metric", ""), payload.get("value", 0)
                )
            return trooper.get_status()
        elif trooper_name == "LISTENER":
            return trooper.send(
                payload.get("channel", "email"),
                payload.get("recipient", ""),
                payload.get("message", ""),
            )

        return {"error": f"No dispatch handler for {trooper_name}"}

    def get_all_statuses(self) -> dict[str, Any]:
        statuses: dict[str, Any] = {}
        for name, trooper in self.troopers.items():
            if hasattr(trooper, "get_status"):
                statuses[name] = trooper.get_status()
            elif hasattr(trooper, "get_metrics"):
                statuses[name] = trooper.get_metrics()
        return {
            "orchestrator": "DynastyOrchestrator",
            "total_troopers": len(self.troopers),
            "total_requests_routed": len(self._request_log),
            "trooper_statuses": statuses,
            "checked_at": datetime.utcnow().isoformat(),
        }
