"""
LLM Router Service - Routes requests to appropriate LLM providers
"""

import json
import asyncio
from typing import Dict, Any, Optional
import httpx
import structlog

from ..core.config import settings

logger = structlog.get_logger()

class LLMRouter:
    """Routes LLM requests to Abacus.AI RouteLLM, OpenAI, or LM Studio"""

    def __init__(self):
        self.abacus_base_url = "https://api.abacus.ai/v1"  # Placeholder
        self.openai_base_url = "https://api.openai.com/v1"
        self.lm_studio_base_url = settings.lm_studio_base_url

        self.client = httpx.AsyncClient(timeout=60.0)

    async def process_request(
        self,
        text: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process user request and determine appropriate actions

        Args:
            text: User input text
            context: Request context (command, user, channel, etc.)

        Returns:
            Dict containing actions to take
        """
        try:
            # Use Abacus.AI RouteLLM for intelligent routing
            routing_decision = await self._route_request(text, context)

            # Execute the request with the chosen provider
            response = await self._execute_request(
                text,
                routing_decision["provider"],
                routing_decision.get("model", "gpt-4")
            )

            # Parse response for actions
            actions = await self._parse_actions(response, context)

            return {
                "provider": routing_decision["provider"],
                "model": routing_decision.get("model"),
                "response": response,
                "actions": actions
            }

        except Exception as e:
            logger.error("Error processing LLM request", error=str(e))
            raise

    async def _route_request(
        self,
        text: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Determine which LLM provider to use"""
        # Simple routing logic - can be enhanced with Abacus.AI RouteLLM
        if "render" in text.lower() or "3d" in text.lower():
            # Use local LM Studio for 3D-related tasks (privacy/cost)
            return {"provider": "lm_studio", "model": "local-model"}
        elif "analyze" in text.lower() or "vision" in text.lower():
            # Use OpenAI for vision/analysis tasks
            return {"provider": "openai", "model": "gpt-4-vision-preview"}
        else:
            # Use Abacus.AI RouteLLM for general routing
            return {"provider": "abacus", "model": "routed-model"}

    async def _execute_request(
        self,
        text: str,
        provider: str,
        model: str
    ) -> Dict[str, Any]:
        """Execute request with specified provider"""
        if provider == "abacus":
            return await self._call_abacus(text, model)
        elif provider == "openai":
            return await self._call_openai(text, model)
        elif provider == "lm_studio":
            return await self._call_lm_studio(text, model)
        else:
            raise ValueError(f"Unknown provider: {provider}")

    async def _call_abacus(self, text: str, model: str) -> Dict[str, Any]:
        """Call Abacus.AI RouteLLM API"""
        headers = {
            "Authorization": f"Bearer {settings.abacus_api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "messages": [{"role": "user", "content": text}],
            "model": model,
            "temperature": 0.7
        }

        response = await self.client.post(
            f"{self.abacus_base_url}/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()

        return response.json()

    async def _call_openai(self, text: str, model: str) -> Dict[str, Any]:
        """Call OpenAI API"""
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": text}],
            "temperature": 0.7
        }

        response = await self.client.post(
            f"{self.openai_base_url}/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()

        return response.json()

    async def _call_lm_studio(self, text: str, model: str) -> Dict[str, Any]:
        """Call LM Studio local API"""
        headers = {"Content-Type": "application/json"}

        payload = {
            "messages": [{"role": "user", "content": text}],
            "temperature": 0.7,
            "max_tokens": 1000
        }

        response = await self.client.post(
            f"{self.lm_studio_base_url}/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()

        return response.json()

    async def _parse_actions(
        self,
        response: Dict[str, Any],
        context: Dict[str, Any]
    ) -> list:
        """Parse LLM response for actionable items"""
        content = response["choices"][0]["message"]["content"]

        # Simple action parsing - can be enhanced with structured outputs
        actions = []

        if "render" in content.lower():
            actions.append({
                "type": "render",
                "parameters": {
                    "scene": "default.blend",
                    "output_format": "png",
                    "resolution": [1920, 1080]
                }
            })

        if "analyze" in content.lower():
            actions.append({
                "type": "analyze",
                "parameters": {
                    "content": content,
                    "analysis_type": "sentiment"
                }
            })

        return actions

    async def __aenter__(self):
        return self

    def process_request_sync(
        self,
        text: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Synchronous wrapper for process_request
        """
        import asyncio
        return asyncio.run(self.process_request(text, context))
