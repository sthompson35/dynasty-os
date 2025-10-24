"""
Celery configuration for task queuing
"""

from celery import Celery
from .config import settings

celery_app = Celery(
    "slack_ai_gateway",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "llm_worker.*": {"queue": "llm"},
        "blender_worker.*": {"queue": "blender"},
    },
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",
)
