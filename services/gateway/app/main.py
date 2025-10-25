"""
Slack AI Gateway - Main FastAPI Application
Handles Slack webhooks, job orchestration, and LLM routing
"""

import os
import hmac
import hashlib
import json
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import structlog
from slack_sdk import WebClient
import httpx

import redis
from urllib.parse import urlparse
from rq import Queue


from .core.config import settings
from .core.celery_app import celery_app
from .services.llm_router import LLMRouter
from .services.slack_service import SlackService
from .models import Job, SlackMessage
from .core.database import get_db
from sqlalchemy.orm import Session
import urllib.parse

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


app = FastAPI(
    title="Slack AI Gateway",
    description="Event-driven AI/3D rendering system with Slack integration",
    version="1.0.0"
)

# --- Railway Redis compatibility ---
import redis
from urllib.parse import urlparse

try:
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        parsed = urlparse(redis_url)
        r = redis.Redis(
            host=parsed.hostname,
            port=parsed.port,
            password=parsed.password,
            ssl=True if parsed.scheme == "rediss" else False,
        )
    else:
        r = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            password=os.getenv("REDIS_PASSWORD"),
        )
    # Test connection
    r.ping()
    redis_available = True
except Exception as e:
    print(f"Redis connection failed: {e}. Running without Redis.")
    r = None
    redis_available = False

if redis_available:
    q_default = Queue("default", connection=r)
    q_renders = Queue("renders", connection=r)
else:
    q_default = None
    q_renders = None

# Initialize services
llm_router = LLMRouter()
slack_service = SlackService() if settings.slack_bot_token else None

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

def verify_slack_request(request: Request, body: bytes) -> bool:
    """Verify Slack request signature"""
    secret = settings.slack_signing_secret
    if not secret:
        return True  # dev mode, skip verification

    timestamp = request.headers.get("X-Slack-Request-Timestamp")
    signature = request.headers.get("X-Slack-Signature")

    if not timestamp or not signature:
        return False

    # Check timestamp to prevent replay attacks
    current_time = datetime.now().timestamp()
    if abs(current_time - int(timestamp)) > 60 * 5:  # 5 minutes
        return False

    # Create signature base string
    sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"

    # Create expected signature
    my_signature = "v0=" + hmac.new(
        secret.encode(),
        sig_basestring.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(my_signature, signature)

@app.post("/slack/commands")
async def handle_slack_command(
    request: Request,
    background_tasks: BackgroundTasks
):
    """Handle Slack slash commands"""
    body = await request.body()

    # Verify request signature
    if not verify_slack_request(request, body):
        raise HTTPException(status_code=403, detail="Invalid request signature")

    # Parse form data
    form_data = await request.form()
    command_data = SlackCommand(**dict(form_data))

    logger.info("Received Slack command", command=command_data.command, user=command_data.user_name)

    # Acknowledge command immediately
    background_tasks.add_task(
        process_slack_command,
        command_data
    )

    return JSONResponse({"response_type": "in_channel", "text": "Processing your request..."})

@app.post("/slack/events")
async def handle_slack_events(request: Request, background_tasks: BackgroundTasks):
    """Handle Slack events (mentions, messages, etc.)"""
    body = await request.body()

    if not verify_slack_request(request, body):
        raise HTTPException(status_code=403, detail="Invalid request signature")

    event_data = await request.json()

    # Handle URL verification
    if event_data.get("type") == "url_verification":
        return JSONResponse({"challenge": event_data["challenge"]})

    # Handle actual events
    if "event" in event_data:
        background_tasks.add_task(
            process_slack_event,
            event_data["event"]
        )

    return JSONResponse({"ok": True})

async def process_slack_command(command: SlackCommand):
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
        llm_response = await llm_router.process_request(
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
                if q_renders:
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
                if q_default:
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
            await slack_service.send_response(
                command.response_url,
                f"🚀 Processing request with {len(job_ids)} job(s). Job IDs: {', '.join(job_ids[:3])}"
            )
        else:
            await slack_service.send_response(
                command.response_url,
                "✅ Command received and logged. No specific actions identified."
            )

    except Exception as e:
        db.rollback()
        logger.error("Error processing Slack command", error=str(e))
        await slack_service.send_response(
            command.response_url,
            f"❌ Error processing request: {str(e)}"
        )
    finally:
        db.close()

async def process_slack_event(event: Dict[str, Any]):
    """Process Slack events in background"""
    # Handle mentions, messages, etc.
    logger.info("Processing Slack event", event_type=event.get("type"))


@app.get("/health")
def health_check():
    """Health check endpoint"""
    from datetime import datetime
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/healthz")
def healthz():
    """Health check endpoint for Docker/Railway compatibility"""
    from datetime import datetime
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/readyz")
def readyz():
    """Readiness check endpoint - verifies Redis connection"""
    if not redis_available:
        raise HTTPException(status_code=503, detail="Redis not available")
    try:
        r.ping()
        return {"ready": True}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get job status"""
    # Check Celery task status
    from celery.result import AsyncResult
    result = AsyncResult(job_id, app=celery_app)

    return {
        "job_id": job_id,
        "status": result.status,
        "result": result.result if result.ready() else None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)