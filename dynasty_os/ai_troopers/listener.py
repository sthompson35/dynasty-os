"""LISTENER — Communications Layer. Handles outbound messaging across all channels."""
from __future__ import annotations
from datetime import datetime
from typing import Any


CHANNELS = ["email", "sms", "ringless_voicemail", "task_reminder", "calendar_event", "push_notification"]


class ListenerTrooper:
    name = "LISTENER"
    role = "Communications Layer"
    domain = "Communications"
    capabilities = [
        "email",
        "SMS",
        "ringless voicemail",
        "task reminders",
        "calendar events",
        "push notifications",
    ]

    def __init__(self) -> None:
        self._message_log: list[dict[str, Any]] = []
        self._templates: dict[str, str] = {}
        self._queue: list[dict[str, Any]] = []

    def send(self, channel: str, recipient: str, message: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        if channel not in CHANNELS:
            return {"error": f"Unknown channel: {channel}. Available: {CHANNELS}"}

        record = {
            "message_id": f"MSG-{len(self._message_log)+1:08d}",
            "channel": channel,
            "recipient": recipient,
            "message": message,
            "metadata": metadata or {},
            "status": "Sent",
            "sent_at": datetime.utcnow().isoformat(),
        }
        self._message_log.append(record)
        return record

    def queue_message(self, channel: str, recipient: str, message: str,
                      send_at: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        queued = {
            "queue_id": f"Q-{len(self._queue)+1:08d}",
            "channel": channel,
            "recipient": recipient,
            "message": message,
            "metadata": metadata or {},
            "send_at": send_at,
            "status": "Queued",
            "queued_at": datetime.utcnow().isoformat(),
        }
        self._queue.append(queued)
        return queued

    def send_bulk(self, channel: str, recipients: list[str], message: str) -> dict[str, Any]:
        results = [self.send(channel, r, message) for r in recipients]
        return {
            "channel": channel,
            "total_sent": len(results),
            "batch_sent_at": datetime.utcnow().isoformat(),
            "message_ids": [r.get("message_id") for r in results],
        }

    def add_template(self, template_id: str, content: str) -> dict[str, Any]:
        self._templates[template_id] = content
        return {"template_id": template_id, "length": len(content)}

    def send_from_template(self, channel: str, recipient: str, template_id: str,
                           variables: dict[str, str] | None = None) -> dict[str, Any]:
        template = self._templates.get(template_id)
        if not template:
            return {"error": f"Template {template_id} not found"}
        message = template
        for key, value in (variables or {}).items():
            message = message.replace(f"{{{{{key}}}}}", value)
        return self.send(channel, recipient, message, {"template_id": template_id})

    def get_status(self) -> dict[str, Any]:
        by_channel: dict[str, int] = {}
        for m in self._message_log:
            c = m["channel"]
            by_channel[c] = by_channel.get(c, 0) + 1
        return {
            "trooper": self.name,
            "role": self.role,
            "total_messages_sent": len(self._message_log),
            "by_channel": by_channel,
            "queued_messages": len(self._queue),
            "templates": len(self._templates),
        }

    def get_metrics(self) -> dict[str, Any]:
        return self.get_status()
