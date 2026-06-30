"""WATCHER — Monitoring Layer. Tracks pipeline health, capital velocity, and risk alerts."""
from __future__ import annotations
from datetime import datetime
from typing import Any


class WatcherTrooper:
    name = "WATCHER"
    role = "Monitoring Layer"
    domain = "System Monitoring"
    capabilities = [
        "deal pipeline monitoring",
        "capital velocity tracking",
        "risk alerts",
        "deadline tracking",
        "KPI surveillance",
    ]

    def __init__(self) -> None:
        self._watches: dict[str, dict[str, Any]] = {}
        self._alerts: list[dict[str, Any]] = []
        self._snapshots: list[dict[str, Any]] = []

    def watch(self, metric: str, threshold: float, direction: str = "above") -> dict[str, Any]:
        watch = {
            "metric": metric,
            "threshold": threshold,
            "direction": direction,
            "active": True,
            "alert_count": 0,
            "registered_at": datetime.utcnow().isoformat(),
        }
        self._watches[metric] = watch
        return watch

    def check(self, metric: str, current_value: float) -> dict[str, Any]:
        watch = self._watches.get(metric)
        if not watch:
            return {"warning": f"No watch registered for metric: {metric}"}

        direction = watch["direction"]
        threshold = watch["threshold"]

        if direction == "above" and current_value > threshold:
            triggered = True
        elif direction == "below" and current_value < threshold:
            triggered = True
        else:
            triggered = False

        result: dict[str, Any] = {
            "metric": metric,
            "current_value": current_value,
            "threshold": threshold,
            "triggered": triggered,
            "checked_at": datetime.utcnow().isoformat(),
        }

        if triggered:
            alert = {
                "alert_id": f"ALERT-{len(self._alerts)+1:06d}",
                "metric": metric,
                "value": current_value,
                "threshold": threshold,
                "severity": "HIGH" if abs(current_value - threshold) / threshold > 0.20 else "MODERATE",
                "status": "Open",
                "triggered_at": datetime.utcnow().isoformat(),
            }
            self._alerts.append(alert)
            watch["alert_count"] += 1
            result["alert"] = alert

        return result

    def take_snapshot(self, system_data: dict[str, Any]) -> dict[str, Any]:
        snapshot = {
            "snapshot_id": f"SNAP-{len(self._snapshots)+1:06d}",
            "data": system_data,
            "active_watches": len(self._watches),
            "open_alerts": sum(1 for a in self._alerts if a["status"] == "Open"),
            "captured_at": datetime.utcnow().isoformat(),
        }
        self._snapshots.append(snapshot)
        return snapshot

    def resolve_alert(self, alert_id: str, resolution: str = "") -> dict[str, Any]:
        for alert in self._alerts:
            if alert["alert_id"] == alert_id:
                alert["status"] = "Resolved"
                alert["resolution"] = resolution
                alert["resolved_at"] = datetime.utcnow().isoformat()
                return alert
        return {"error": f"Alert {alert_id} not found"}

    def get_status(self) -> dict[str, Any]:
        open_alerts = [a for a in self._alerts if a["status"] == "Open"]
        return {
            "trooper": self.name,
            "role": self.role,
            "active_watches": len(self._watches),
            "total_alerts": len(self._alerts),
            "open_alerts": len(open_alerts),
            "high_severity_alerts": sum(1 for a in open_alerts if a["severity"] == "HIGH"),
            "snapshots_taken": len(self._snapshots),
        }

    def get_metrics(self) -> dict[str, Any]:
        return self.get_status()
