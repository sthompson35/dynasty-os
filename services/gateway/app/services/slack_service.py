"""
Slack Service - Handles Slack API interactions
"""

import json
from typing import Dict, Any, Optional
import httpx
import structlog
from slack_sdk import WebClient

from ..core.config import settings

logger = structlog.get_logger()

class SlackService:
    """Service for interacting with Slack API"""

    def __init__(self):
        self.client = WebClient(token=settings.slack_bot_token)
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def send_response(
        self,
        response_url: str,
        text: str,
        attachments: Optional[list] = None
    ):
        """Send response to Slack"""
        payload = {
            "text": text,
            "response_type": "in_channel"
        }

        if attachments:
            payload["attachments"] = attachments

        try:
            response = await self.http_client.post(
                response_url,
                json=payload
            )
            response.raise_for_status()
            logger.info("Sent Slack response", response_url=response_url)
        except Exception as e:
            logger.error("Failed to send Slack response", error=str(e))

    async def send_message(
        self,
        channel: str,
        text: str,
        attachments: Optional[list] = None,
        thread_ts: Optional[str] = None
    ):
        """Send message to Slack channel"""
        try:
            response = await self.client.chat_postMessage(
                channel=channel,
                text=text,
                attachments=attachments,
                thread_ts=thread_ts
            )
            logger.info("Sent Slack message", channel=channel, ts=response["ts"])
            return response["ts"]
        except Exception as e:
            logger.error("Failed to send Slack message", error=str(e))
            raise

    async def upload_file(
        self,
        channel: str,
        file_path: str,
        title: str,
        thread_ts: Optional[str] = None
    ):
        """Upload file to Slack"""
        try:
            response = await self.client.files_upload_v2(
                channel=channel,
                file=file_path,
                title=title,
                thread_ts=thread_ts
            )
            logger.info("Uploaded file to Slack", channel=channel, file=title)
            return response
        except Exception as e:
            logger.error("Failed to upload file to Slack", error=str(e))
            raise

    async def update_message(
        self,
        channel: str,
        ts: str,
        text: str,
        attachments: Optional[list] = None
    ):
        """Update existing Slack message"""
        try:
            response = await self.client.chat_update(
                channel=channel,
                ts=ts,
                text=text,
                attachments=attachments
            )
            logger.info("Updated Slack message", channel=channel, ts=ts)
        except Exception as e:
            logger.error("Failed to update Slack message", error=str(e))
            raise

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()
