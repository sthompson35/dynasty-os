from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_BASE = "https://dynasty-os-production.up.railway.app"
WORKFLOW = Path("n8n/dynasty-os-v3-workflow.json")


def request(method: str, path: str, body: dict[str, Any] | None = None) -> tuple[int, Any]:
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    req = Request(
        f"{API_BASE}{path}",
        data=payload,
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urlopen(req, timeout=30) as response:
            text = response.read().decode("utf-8")
            return response.status, json.loads(text) if text else {}
    except HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            data = text
        return exc.code, data
    except URLError as exc:
        return 0, str(exc)


def load_workflow() -> dict[str, Any]:
    return json.loads(WORKFLOW.read_text(encoding="utf-8-sig"))


def get_first(path: str, key: str) -> dict[str, Any]:
    status, data = request("GET", f"{path}?limit=1")
    if status != 200 or not data.get(key):
        raise RuntimeError(f"Could not read {path}: status={status} data={data}")
    return data[key][0]


def workflow_summary(workflow: dict[str, Any]) -> dict[str, Any]:
    webhooks = []
    http_nodes = []
    for node in workflow.get("nodes", []):
        params = node.get("parameters", {})
        node_type = node.get("type", "")
        if node_type == "n8n-nodes-base.webhook":
            webhooks.append(
                {
                    "name": node.get("name"),
                    "method": params.get("httpMethod", "GET"),
                    "path": params.get("path"),
                    "responseMode": params.get("responseMode"),
                }
            )
        if "httpRequest" in node_type or "toolHttpRequest" in node_type:
            http_nodes.append(
                {
                    "name": node.get("name"),
                    "method": params.get("method", "GET"),
                    "url": params.get("url"),
                    "continueOnFail": node.get("continueOnFail", False),
                }
            )
    return {"webhooks": webhooks, "http_nodes": http_nodes}


def run_api_contract_tests() -> list[dict[str, Any]]:
    lead = get_first("/api/leads", "leads")
    deal = get_first("/api/deal", "deals")
    property_id = deal["property_id"]
    deal_id = deal["deal_id"]
    lead_id = lead["lead_id"]

    tests: list[tuple[str, str, str, dict[str, Any] | None, set[int]]] = [
        ("health", "GET", "/health", None, {200}),
        ("lead_stats", "GET", "/api/leads/stats", None, {200}),
        ("capital_available", "GET", "/api/capital/available", None, {200}),
        ("capital_deployed", "GET", "/api/capital/deployed", None, {200}),
        ("capital_investors", "GET", "/api/capital/investors", None, {200}),
        ("disposition_profit", "GET", "/api/disposition/profit", None, {200}),
        ("deal_lookup", "GET", f"/api/deal/{deal_id}", None, {200}),
        ("lead_lookup", "GET", f"/api/leads/{lead_id}", None, {200}),
        (
            "flip_analysis",
            "POST",
            "/api/investor/flip-analysis",
            {
                "purchase_price": 100000,
                "repair_budget": 25000,
                "arv": 180000,
                "closing_costs": 5000,
                "holding_costs": 3000,
                "selling_costs": 8000,
            },
            {200},
        ),
        (
            "land_build_offer",
            "POST",
            "/api/land-build/offer-calculation",
            {
                "property_id": property_id,
                "arv": 180000,
                "repair_cost": 25000,
                "exit_strategy": "Flip",
                "target_roi": 0.2,
                "holding_cost_monthly": 1000,
                "holding_months": 6,
            },
            {200},
        ),
        (
            "deal_approve_compat",
            "POST",
            "/api/deal/approve",
            {"deal_id": deal_id, "decision": "GO_WITH_CONDITIONS", "approved_by": "n8n-v3-validator", "notes": "Contract test"},
            {200},
        ),
        (
            "automation_log",
            "POST",
            "/api/automation/log",
            {
                "event": "n8n_v3_contract_test",
                "trigger": "validate_n8n_v3_production.py",
                "result": "pass",
                "payload": {"deal_id": deal_id, "lead_id": lead_id},
            },
            {200},
        ),
    ]

    results = []
    for name, method, path, body, expected in tests:
        status, data = request(method, path, body)
        results.append(
            {
                "name": name,
                "method": method,
                "path": path,
                "status": status,
                "ok": status in expected,
                "sample_keys": sorted(data.keys()) if isinstance(data, dict) else [],
            }
        )
    return results


def main() -> int:
    workflow = load_workflow()
    summary = workflow_summary(workflow)
    tests = run_api_contract_tests()
    report = {
        "workflow": {
            "valid_json": True,
            "name": workflow.get("name"),
            "nodes": len(workflow.get("nodes", [])),
            "connections": len(workflow.get("connections", {})),
        },
        "webhooks": summary["webhooks"],
        "http_node_count": len(summary["http_nodes"]),
        "api_contract_tests": tests,
        "failed_tests": [test for test in tests if not test["ok"]],
    }
    print(json.dumps(report, indent=2))
    return 1 if report["failed_tests"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
