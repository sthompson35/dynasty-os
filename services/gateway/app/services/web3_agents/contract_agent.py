"""
Contract Inspection Agent - fetches verified contract ABI/source from
Etherscan-compatible explorers and performs a heuristic static scan for
common Solidity vulnerability patterns.

This is a lightweight, dependency-free heuristic scanner intended to give a
quick first-pass summary. It is not a substitute for a full audit
(e.g. Slither/Mythril, planned for Layer 4).
"""

import re
from typing import Any, Dict, List, Optional

import httpx
import structlog

from ...core.config import settings

logger = structlog.get_logger()


class ContractAgentError(Exception):
    """Raised when the Contract Inspection Agent fails to retrieve data"""


# Heuristic vulnerability patterns: (finding name, regex, severity, description)
_VULNERABILITY_PATTERNS = [
    (
        "reentrancy-risk",
        re.compile(r"\.call\s*(\{[^}]*\})?\s*\(", re.IGNORECASE),
        "high",
        "Low-level `.call(...)` found; ensure state changes happen before "
        "external calls (checks-effects-interactions) to avoid reentrancy.",
    ),
    (
        "tx-origin-auth",
        re.compile(r"tx\.origin"),
        "high",
        "`tx.origin` used, possibly for authorization; this is vulnerable to "
        "phishing via malicious intermediate contracts. Use `msg.sender` instead.",
    ),
    (
        "unchecked-send",
        re.compile(r"\.send\s*\("),
        "medium",
        "`.send(...)` return value may be unchecked; a failed transfer could "
        "go unnoticed. Prefer `.call{value: ...}(\"\")` with an explicit check.",
    ),
    (
        "outdated-pragma-overflow-risk",
        re.compile(r"pragma\s+solidity\s*[\^~]?0\.[4-7]\."),
        "medium",
        "Solidity version below 0.8.x does not have built-in overflow/underflow "
        "checks; verify SafeMath (or equivalent) is used for arithmetic.",
    ),
    (
        "delegatecall-usage",
        re.compile(r"delegatecall"),
        "high",
        "`delegatecall` found; verify the target is trusted and immutable, as "
        "it executes in the caller's storage context.",
    ),
    (
        "self-destruct",
        re.compile(r"selfdestruct\s*\("),
        "medium",
        "`selfdestruct` found; confirm this is access-controlled to avoid "
        "unauthorized contract destruction/fund extraction.",
    ),
]


class ContractAgent:
    """Fetches contract ABI/source from Etherscan and runs a heuristic audit"""

    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self.base_url = settings.etherscan_api_base
        self._client = client
        self._owns_client = client is None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def _fetch(self, params: Dict[str, str]) -> Dict[str, Any]:
        client = await self._get_client()
        request_params = dict(params)
        if settings.etherscan_api_key:
            request_params["apikey"] = settings.etherscan_api_key

        try:
            response = await client.get(self.base_url, params=request_params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            logger.error("ContractAgent request failed", error=str(exc))
            raise ContractAgentError(f"Failed to reach block explorer: {exc}") from exc

    async def get_abi(self, address: str) -> Dict[str, Any]:
        """Fetch a contract's verified ABI from Etherscan"""
        data = await self._fetch({
            "module": "contract",
            "action": "getabi",
            "address": address,
        })

        if data.get("status") != "1":
            raise ContractAgentError(
                f"Could not retrieve ABI for {address}: {data.get('result')}"
            )

        return {"address": address, "abi": data["result"]}

    async def get_source(self, address: str) -> Dict[str, Any]:
        """Fetch a contract's verified source code from Etherscan"""
        data = await self._fetch({
            "module": "contract",
            "action": "getsourcecode",
            "address": address,
        })

        if data.get("status") != "1" or not data.get("result"):
            raise ContractAgentError(
                f"Could not retrieve source for {address}: {data.get('result')}"
            )

        result = data["result"][0]
        return {
            "address": address,
            "contract_name": result.get("ContractName"),
            "compiler_version": result.get("CompilerVersion"),
            "is_proxy": result.get("Proxy") == "1",
            "source_code": result.get("SourceCode", ""),
        }

    def scan_source(self, source_code: str) -> List[Dict[str, str]]:
        """Run heuristic vulnerability pattern matching against source code"""
        findings = []
        for name, pattern, severity, description in _VULNERABILITY_PATTERNS:
            if pattern.search(source_code):
                findings.append({
                    "finding": name,
                    "severity": severity,
                    "description": description,
                })
        return findings

    async def inspect(self, address: str) -> Dict[str, Any]:
        """
        Fetch a contract's source and produce a summary with heuristic
        vulnerability findings.
        """
        source_info = await self.get_source(address)
        findings = self.scan_source(source_info["source_code"])

        return {
            "address": source_info["address"],
            "contract_name": source_info["contract_name"],
            "compiler_version": source_info["compiler_version"],
            "is_proxy": source_info["is_proxy"],
            "findings": findings,
            "risk_level": self._overall_risk(findings),
        }

    @staticmethod
    def _overall_risk(findings: List[Dict[str, str]]) -> str:
        severities = {f["severity"] for f in findings}
        if "high" in severities:
            return "high"
        if "medium" in severities:
            return "medium"
        if findings:
            return "low"
        return "none"

    async def close(self):
        if self._owns_client and self._client is not None:
            await self._client.aclose()
