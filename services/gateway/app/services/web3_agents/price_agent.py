"""
Price & Market Agent - real-time crypto market data via CoinGecko
"""

from typing import Any, Dict, List, Optional

import httpx
import structlog

from ...core.config import settings

logger = structlog.get_logger()


class PriceAgentError(Exception):
    """Raised when the Price & Market Agent fails to retrieve data"""


class PriceAgent:
    """Fetches real-time cryptocurrency price and market data from CoinGecko"""

    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self.base_url = settings.coingecko_api_base
        self._client = client
        self._owns_client = client is None

    def _headers(self) -> Dict[str, str]:
        headers = {"Accept": "application/json"}
        if settings.coingecko_api_key:
            headers["x-cg-demo-api-key"] = settings.coingecko_api_key
        return headers

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def get_price(
        self,
        coin_ids: List[str],
        vs_currencies: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Get current price(s) for one or more coins.

        Args:
            coin_ids: CoinGecko coin ids, e.g. ["bitcoin", "ethereum"]
            vs_currencies: Target currencies, e.g. ["usd", "eur"]

        Returns:
            Mapping of coin id to currency price data
        """
        vs_currencies = vs_currencies or ["usd"]
        client = await self._get_client()

        try:
            response = await client.get(
                f"{self.base_url}/simple/price",
                params={
                    "ids": ",".join(coin_ids),
                    "vs_currencies": ",".join(vs_currencies),
                    "include_market_cap": "true",
                    "include_24hr_vol": "true",
                    "include_24hr_change": "true",
                },
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            logger.error("PriceAgent failed to fetch price", error=str(exc))
            raise PriceAgentError(f"Failed to fetch price data: {exc}") from exc

    async def get_market_summary(self, coin_id: str) -> Dict[str, Any]:
        """
        Get a detailed market summary for a single coin (market cap, rank,
        volume, supply, ATH/ATL, etc.)
        """
        client = await self._get_client()

        try:
            response = await client.get(
                f"{self.base_url}/coins/{coin_id}",
                params={
                    "localization": "false",
                    "tickers": "false",
                    "community_data": "false",
                    "developer_data": "false",
                },
                headers=self._headers(),
            )
            response.raise_for_status()
            data = response.json()
            market_data = data.get("market_data", {})

            return {
                "id": data.get("id"),
                "symbol": data.get("symbol"),
                "name": data.get("name"),
                "current_price": market_data.get("current_price", {}),
                "market_cap": market_data.get("market_cap", {}),
                "market_cap_rank": data.get("market_cap_rank"),
                "total_volume": market_data.get("total_volume", {}),
                "high_24h": market_data.get("high_24h", {}),
                "low_24h": market_data.get("low_24h", {}),
                "price_change_percentage_24h": market_data.get("price_change_percentage_24h"),
                "circulating_supply": market_data.get("circulating_supply"),
                "total_supply": market_data.get("total_supply"),
                "ath": market_data.get("ath", {}),
                "atl": market_data.get("atl", {}),
            }
        except httpx.HTTPError as exc:
            logger.error("PriceAgent failed to fetch market summary", error=str(exc))
            raise PriceAgentError(f"Failed to fetch market summary: {exc}") from exc

    async def close(self):
        if self._owns_client and self._client is not None:
            await self._client.aclose()
