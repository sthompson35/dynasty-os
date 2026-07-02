"""
On-Chain Data Agent - queries wallet balances, transaction counts, and gas
prices across EVM-compatible chains (Ethereum, Polygon, Base, Arbitrum, BSC).

Read-only: only ever connects to public JSON-RPC endpoints and never
requests or stores private keys.
"""

from typing import Any, Dict, Optional

import structlog
from web3 import Web3

from ...core.config import settings

logger = structlog.get_logger()

SUPPORTED_CHAINS = ("ethereum", "polygon", "base", "arbitrum", "bsc")


class OnChainAgentError(Exception):
    """Raised when the On-Chain Data Agent fails to retrieve data"""


class OnChainAgent:
    """Reads public on-chain data (balances, nonce, gas price) via web3.py"""

    def __init__(self):
        self._web3_clients: Dict[str, Web3] = {}

    def _get_web3(self, chain: str) -> Web3:
        chain = chain.lower()
        if chain not in SUPPORTED_CHAINS:
            raise OnChainAgentError(
                f"Unsupported chain '{chain}'. Supported chains: {', '.join(SUPPORTED_CHAINS)}"
            )

        if chain not in self._web3_clients:
            rpc_url = settings.chain_rpc_urls.get(chain)
            if not rpc_url:
                raise OnChainAgentError(f"No RPC URL configured for chain '{chain}'")
            self._web3_clients[chain] = Web3(Web3.HTTPProvider(rpc_url))

        return self._web3_clients[chain]

    def get_wallet_summary(self, address: str, chain: str = None) -> Dict[str, Any]:
        """
        Get a wallet's native token balance, transaction count, and the
        current network gas price for the requested chain.

        Args:
            address: A checksummed or lowercase EVM wallet address
            chain: One of SUPPORTED_CHAINS (defaults to settings.default_chain)

        Returns:
            Dict with balance (in native token and wei), tx count, and gas price
        """
        chain = (chain or settings.default_chain).lower()
        w3 = self._get_web3(chain)

        if not Web3.is_address(address):
            raise OnChainAgentError(f"Invalid EVM address: {address}")

        checksum_address = Web3.to_checksum_address(address)

        try:
            balance_wei = w3.eth.get_balance(checksum_address)
            tx_count = w3.eth.get_transaction_count(checksum_address)
            gas_price_wei = w3.eth.gas_price

            return {
                "chain": chain,
                "address": checksum_address,
                "balance_wei": str(balance_wei),
                "balance_native": float(Web3.from_wei(balance_wei, "ether")),
                "transaction_count": tx_count,
                "gas_price_wei": str(gas_price_wei),
                "gas_price_gwei": float(Web3.from_wei(gas_price_wei, "gwei")),
            }
        except OnChainAgentError:
            raise
        except Exception as exc:
            logger.error("OnChainAgent failed to fetch wallet summary", error=str(exc))
            raise OnChainAgentError(f"Failed to fetch wallet data: {exc}") from exc

    def get_gas_price(self, chain: str = None) -> Dict[str, Any]:
        """Get the current network gas price for the requested chain"""
        chain = (chain or settings.default_chain).lower()
        w3 = self._get_web3(chain)

        try:
            gas_price_wei = w3.eth.gas_price
            return {
                "chain": chain,
                "gas_price_wei": str(gas_price_wei),
                "gas_price_gwei": float(Web3.from_wei(gas_price_wei, "gwei")),
            }
        except Exception as exc:
            logger.error("OnChainAgent failed to fetch gas price", error=str(exc))
            raise OnChainAgentError(f"Failed to fetch gas price: {exc}") from exc
