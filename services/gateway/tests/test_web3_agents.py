"""Tests for Web3 Layer 2 blockchain intelligence agents"""

import pytest
import respx
import httpx

from app.services.web3_agents.price_agent import PriceAgent, PriceAgentError
from app.services.web3_agents.contract_agent import ContractAgent, ContractAgentError
from app.services.web3_agents.onchain_agent import OnChainAgent, OnChainAgentError
from app.core.config import settings


@pytest.mark.asyncio
async def test_price_agent_get_price_success():
    agent = PriceAgent()
    with respx.mock:
        respx.get(f"{settings.coingecko_api_base}/simple/price").mock(
            return_value=httpx.Response(
                200,
                json={"bitcoin": {"usd": 65000.0, "usd_market_cap": 1.2e12}},
            )
        )
        result = await agent.get_price(["bitcoin"], ["usd"])
    await agent.close()

    assert result["bitcoin"]["usd"] == 65000.0


@pytest.mark.asyncio
async def test_price_agent_get_price_http_error():
    agent = PriceAgent()
    with respx.mock:
        respx.get(f"{settings.coingecko_api_base}/simple/price").mock(
            return_value=httpx.Response(500)
        )
        with pytest.raises(PriceAgentError):
            await agent.get_price(["bitcoin"], ["usd"])
    await agent.close()


@pytest.mark.asyncio
async def test_price_agent_market_summary_success():
    agent = PriceAgent()
    with respx.mock:
        respx.get(f"{settings.coingecko_api_base}/coins/bitcoin").mock(
            return_value=httpx.Response(
                200,
                json={
                    "id": "bitcoin",
                    "symbol": "btc",
                    "name": "Bitcoin",
                    "market_cap_rank": 1,
                    "market_data": {
                        "current_price": {"usd": 65000.0},
                        "market_cap": {"usd": 1.2e12},
                        "total_volume": {"usd": 3.0e10},
                        "high_24h": {"usd": 66000.0},
                        "low_24h": {"usd": 64000.0},
                        "price_change_percentage_24h": 1.5,
                        "circulating_supply": 19700000,
                        "total_supply": 21000000,
                        "ath": {"usd": 73000.0},
                        "atl": {"usd": 67.0},
                    },
                },
            )
        )
        result = await agent.get_market_summary("bitcoin")
    await agent.close()

    assert result["name"] == "Bitcoin"
    assert result["market_cap_rank"] == 1


def test_contract_agent_scan_source_detects_reentrancy_and_tx_origin():
    agent = ContractAgent()
    source = """
    pragma solidity ^0.6.0;
    contract Vulnerable {
        function withdraw() public {
            require(tx.origin == owner);
            msg.sender.call{value: balance}("");
        }
    }
    """
    findings = agent.scan_source(source)
    finding_names = {f["finding"] for f in findings}

    assert "reentrancy-risk" in finding_names
    assert "tx-origin-auth" in finding_names
    assert "outdated-pragma-overflow-risk" in finding_names
    assert agent._overall_risk(findings) == "high"


def test_contract_agent_scan_source_clean_contract():
    agent = ContractAgent()
    source = """
    pragma solidity ^0.8.20;
    contract Safe {
        function noop() public pure returns (uint256) {
            return 1;
        }
    }
    """
    findings = agent.scan_source(source)
    assert findings == []
    assert agent._overall_risk(findings) == "none"


@pytest.mark.asyncio
async def test_contract_agent_get_abi_not_verified():
    agent = ContractAgent()
    with respx.mock:
        respx.get(settings.etherscan_api_base).mock(
            return_value=httpx.Response(
                200,
                json={"status": "0", "message": "NOTOK", "result": "Contract source code not verified"},
            )
        )
        with pytest.raises(ContractAgentError):
            await agent.get_abi("0x0000000000000000000000000000000000000000")
    await agent.close()


def test_onchain_agent_rejects_unsupported_chain():
    agent = OnChainAgent()
    with pytest.raises(OnChainAgentError):
        agent.get_wallet_summary(
            "0x0000000000000000000000000000000000000000", chain="solana"
        )


def test_onchain_agent_rejects_invalid_address():
    agent = OnChainAgent()
    with pytest.raises(OnChainAgentError):
        agent.get_wallet_summary("not-an-address", chain="ethereum")
