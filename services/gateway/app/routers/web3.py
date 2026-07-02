"""
Web3 blockchain intelligence API (Dynasty OS Layer 2)

Exposes read-only endpoints for crypto price data, on-chain wallet data,
and smart contract inspection.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
import structlog

from ..services.web3_agents import ContractAgent, OnChainAgent, PriceAgent
from ..services.web3_agents.contract_agent import ContractAgentError
from ..services.web3_agents.onchain_agent import OnChainAgentError, SUPPORTED_CHAINS
from ..services.web3_agents.price_agent import PriceAgentError

logger = structlog.get_logger()

router = APIRouter(prefix="/web3", tags=["web3"])

# OnChainAgent holds no per-request state beyond cached RPC clients, so a
# single shared instance is safe to reuse across requests.
_onchain_agent = OnChainAgent()


@router.get("/price")
async def get_price(
    coin_ids: str = Query(..., description="Comma-separated CoinGecko coin ids, e.g. 'bitcoin,ethereum'"),
    vs_currencies: str = Query("usd", description="Comma-separated target currencies, e.g. 'usd,eur'"),
):
    """Get real-time price data for one or more cryptocurrencies"""
    agent = PriceAgent()
    try:
        ids = [c.strip() for c in coin_ids.split(",") if c.strip()]
        currencies = [c.strip() for c in vs_currencies.split(",") if c.strip()]
        return await agent.get_price(ids, currencies)
    except PriceAgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    finally:
        await agent.close()


@router.get("/price/{coin_id}/summary")
async def get_price_summary(coin_id: str):
    """Get a detailed market summary (market cap, rank, volume, ATH/ATL) for a coin"""
    agent = PriceAgent()
    try:
        return await agent.get_market_summary(coin_id)
    except PriceAgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    finally:
        await agent.close()


@router.get("/wallet/{address}")
async def get_wallet(address: str, chain: str = Query("ethereum", description=f"One of: {', '.join(SUPPORTED_CHAINS)}")):
    """Get a wallet's native balance, transaction count, and gas price for a chain"""
    try:
        return _onchain_agent.get_wallet_summary(address, chain)
    except OnChainAgentError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/gas")
async def get_gas_price(chain: str = Query("ethereum", description=f"One of: {', '.join(SUPPORTED_CHAINS)}")):
    """Get the current network gas price for a chain"""
    try:
        return _onchain_agent.get_gas_price(chain)
    except OnChainAgentError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/contract/{address}")
async def inspect_contract(address: str):
    """Fetch a verified contract's source and run a heuristic vulnerability scan"""
    agent = ContractAgent()
    try:
        return await agent.inspect(address)
    except ContractAgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    finally:
        await agent.close()


@router.get("/contract/{address}/abi")
async def get_contract_abi(address: str):
    """Fetch a verified contract's ABI"""
    agent = ContractAgent()
    try:
        return await agent.get_abi(address)
    except ContractAgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    finally:
        await agent.close()
