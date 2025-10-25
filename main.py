"""
Slack AI Gateway - Flask Application
Handles Slack webhooks, job orchestration, and LLM routing
"""

import os
import hmac
import hashlib
import json
from typing import Dict, Any, Optional
from datetime import datetime

from flask import Flask, request, jsonify
from pydantic import BaseModel
import structlog
from slack_sdk import WebClient
import httpx
from asgiref.wsgi import WsgiToAsgi

from services.gateway.app.core.config import settings
from services.gateway.app.core.celery_app import celery_app
from services.gateway.app.services.llm_router import LLMRouter
from services.gateway.app.services.slack_service import SlackService
from services.gateway.app.models import Job, SlackMessage
from services.gateway.app.core.database import get_db
from sqlalchemy.orm import Session

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

app = Flask(__name__)

# Initialize services
llm_router = LLMRouter()
slack_service = SlackService()

class SlackCommand(BaseModel):
    token: str
    team_id: str
    team_domain: str
    channel_id: str
    channel_name: str
    user_id: str
    user_name: str
    command: str
    text: str
    response_url: str
    trigger_id: str

def verify_slack_request(request_data: bytes, timestamp: str, signature: str) -> bool:
    """Verify Slack request signature"""
    if not timestamp or not signature:
        return False

    # Check timestamp to prevent replay attacks
    current_time = datetime.now().timestamp()
    if abs(current_time - int(timestamp)) > 60 * 5:  # 5 minutes
        return False

    # Create signature base string
    sig_basestring = f"v0:{timestamp}:{request_data.decode('utf-8')}"

    # Create expected signature
    my_signature = "v0=" + hmac.new(
        settings.slack_signing_secret.encode(),
        sig_basestring.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(my_signature, signature)

@app.route("/slack/commands", methods=["POST"])
def handle_slack_command():
    """Handle Slack slash commands"""
    request_data = request.get_data()

    # Verify request signature
    timestamp = request.headers.get("X-Slack-Request-Timestamp")
    signature = request.headers.get("X-Slack-Signature")

    if not verify_slack_request(request_data, timestamp, signature):
        return jsonify({"error": "Invalid request signature"}), 403

    # Parse form data
    form_data = request.form
    command_data = SlackCommand(**dict(form_data))

    logger.info("Received Slack command", command=command_data.command, user=command_data.user_name)

    # Acknowledge command immediately and process in background
    import threading
    threading.Thread(target=process_slack_command, args=(command_data,)).start()

    return jsonify({"response_type": "in_channel", "text": "Processing your request..."})

@app.route("/slack/events", methods=["POST"])
def handle_slack_events():
    """Handle Slack events (mentions, messages, etc.)"""
    request_data = request.get_data()

    # Verify request signature
    timestamp = request.headers.get("X-Slack-Request-Timestamp")
    signature = request.headers.get("X-Slack-Signature")

    if not verify_slack_request(request_data, timestamp, signature):
        return jsonify({"error": "Invalid request signature"}), 403

    event_data = request.get_json()

    # Handle URL verification
    if event_data.get("type") == "url_verification":
        return jsonify({"challenge": event_data["challenge"]})

    # Handle actual events
    if "event" in event_data:
        import threading
        threading.Thread(target=process_slack_event, args=(event_data["event"],)).start()

    return jsonify({"ok": True})

def process_slack_command(command: SlackCommand):
    """Process Slack command in background"""
    db: Session = next(get_db())

    try:
        # Save Slack message to database first
        slack_message = SlackMessage(
            id=f"{command.channel_id}_{command.user_id}_{datetime.now().timestamp()}",
            slack_message_id=f"{command.channel_id}_{command.user_id}_{datetime.now().timestamp()}",
            channel_id=command.channel_id,
            user_id=command.user_id,
            message_text=command.text,
            message_type="command",
        )
        db.add(slack_message)
        db.commit()  # Commit the message record immediately

        # Route to LLM for interpretation
        llm_response = llm_router.process_request_sync(
            text=command.text,
            context={
                "command": command.command,
                "user": command.user_name,
                "channel": command.channel_name,
                "platform": "slack"
            }
        )

        # Extract actions from LLM response
        actions = llm_response.get("actions", [])

        # Queue jobs for workers and save to database
        job_ids = []
        for action in actions:
            job_id = f"{command.user_id}_{datetime.now().timestamp()}_{len(job_ids)}"

            if action["type"] == "render":
                # Create job record
                job = Job(
                    id=job_id,
                    job_type="render",
                    status="pending",
                    slack_user_id=command.user_id,
                    slack_channel_id=command.channel_id,
                    parameters=action["parameters"]
                )
                db.add(job)

                # Queue Blender job
                task = celery_app.send_task(
                    "blender_worker.render_scene",
                    args=[action["parameters"]],
                    kwargs={"callback_url": command.response_url, "job_id": job_id}
                )
                job_ids.append(job_id)

            elif action["type"] == "analyze":
                # Create job record
                job = Job(
                    id=job_id,
                    job_type="analyze",
                    status="pending",
                    slack_user_id=command.user_id,
                    slack_channel_id=command.channel_id,
                    parameters=action["parameters"]
                )
                db.add(job)

                # Queue LLM analysis job
                task = celery_app.send_task(
                    "llm_worker.analyze_content",
                    args=[action["parameters"]],
                    kwargs={"callback_url": command.response_url, "job_id": job_id}
                )
                job_ids.append(job_id)

        # Commit job records
        if job_ids:
            db.commit()

        # Send initial response
        if job_ids:
            slack_service.send_response_sync(
                command.response_url,
                f"🚀 Processing request with {len(job_ids)} job(s). Job IDs: {', '.join(job_ids[:3])}"
            )
        else:
            slack_service.send_response_sync(
                command.response_url,
                "✅ Command received and logged. No specific actions identified."
            )

    except Exception as e:
        db.rollback()
        logger.error("Error processing Slack command", error=str(e))
        slack_service.send_response_sync(
            command.response_url,
            f"❌ Error processing request: {str(e)}"
        )
    finally:
        db.close()

def process_slack_event(event: Dict[str, Any]):
    """Process Slack events in background"""
    # Handle mentions, messages, etc.
    logger.info("Processing Slack event", event_type=event.get("type"))

@app.route("/health")
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    })

@app.route("/jobs/<job_id>")
def get_job_status(job_id: str):
    """Get job status"""
    # Check Celery task status
    from celery.result import AsyncResult
    result = AsyncResult(job_id, app=celery_app)

    return jsonify({
        "job_id": job_id,
        "status": result.status,
        "result": result.result if result.ready() else None
    })

# Wrap the Flask app with ASGI compatibility
asgi_app = WsgiToAsgi(app)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
