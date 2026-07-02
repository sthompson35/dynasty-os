"""
Web3 blockchain intelligence agents (Dynasty OS Layer 2)

Provides read-only, non-custodial agents for:
- Real-time crypto price/market data (PriceAgent)
- On-chain wallet/gas data across EVM chains (OnChainAgent)
- Smart contract ABI retrieval and heuristic auditing (ContractAgent)

None of these agents ever hold or request private keys; all functionality
is limited to public, read-only blockchain and market data.
"""

from .price_agent import PriceAgent
from .onchain_agent import OnChainAgent
from .contract_agent import ContractAgent

__all__ = ["PriceAgent", "OnChainAgent", "ContractAgent"]
