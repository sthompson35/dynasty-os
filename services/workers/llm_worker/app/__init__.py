"""
LLM Worker Tasks - Handles AI inference and analysis tasks
"""

import os
import json
from typing import Dict, Any
import boto3
import structlog
from celery import Celery

from app.core.config import settings

logger = structlog.get_logger()

# Initialize Celery app
celery_app = Celery(
    "llm_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend
)

# Initialize S3 client
s3_client = boto3.client(
    's3',
    endpoint_url=settings.s3_endpoint_url,
    aws_access_key_id=settings.s3_access_key,
    aws_secret_access_key=settings.s3_secret_key
)

@celery_app.task(name="llm_worker.analyze_content")
def analyze_content(parameters: Dict[str, Any], callback_url: str = None):
    """Analyze content using LLM"""
    try:
        logger.info("Starting content analysis", parameters=parameters)

        # TODO: Implement actual LLM analysis
        # For now, return mock analysis
        analysis_result = {
            "content_type": "text",
            "sentiment": "positive",
            "topics": ["AI", "automation"],
            "summary": f"Analysis of: {parameters.get('content', '')[:100]}..."
        }

        # Upload result to S3 if needed
        if settings.s3_bucket_name:
            result_key = f"analysis/{analyze_content.request.id}.json"
            s3_client.put_object(
                Bucket=settings.s3_bucket_name,
                Key=result_key,
                Body=json.dumps(analysis_result),
                ContentType='application/json'
            )
            analysis_result["s3_url"] = f"{settings.s3_endpoint_url}/{settings.s3_bucket_name}/{result_key}"

        # Send callback if provided
        if callback_url:
            _send_callback(callback_url, {
                "status": "completed",
                "job_type": "analysis",
                "result": analysis_result
            })

        logger.info("Content analysis completed", job_id=analyze_content.request.id)
        return analysis_result

    except Exception as e:
        logger.error("Content analysis failed", error=str(e), job_id=analyze_content.request.id)
        if callback_url:
            _send_callback(callback_url, {
                "status": "failed",
                "error": str(e)
            })
        raise

@celery_app.task(name="llm_worker.generate_text")
def generate_text(parameters: Dict[str, Any], callback_url: str = None):
    """Generate text using LLM"""
    try:
        logger.info("Starting text generation", parameters=parameters)

        # TODO: Implement actual text generation
        generated_text = f"Generated text based on: {parameters.get('prompt', '')}"

        result = {
            "generated_text": generated_text,
            "model_used": "mock-llm",
            "tokens_used": len(generated_text.split())
        }

        # Send callback if provided
        if callback_url:
            _send_callback(callback_url, {
                "status": "completed",
                "job_type": "text_generation",
                "result": result
            })

        logger.info("Text generation completed", job_id=generate_text.request.id)
        return result

    except Exception as e:
        logger.error("Text generation failed", error=str(e), job_id=generate_text.request.id)
        if callback_url:
            _send_callback(callback_url, {
                "status": "failed",
                "error": str(e)
            })
        raise

def _send_callback(callback_url: str, payload: Dict[str, Any]):
    """Send callback to Slack"""
    import httpx

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(callback_url, json=payload)
            response.raise_for_status()
            logger.info("Callback sent successfully", callback_url=callback_url)
    except Exception as e:
        logger.error("Failed to send callback", error=str(e), callback_url=callback_url)
