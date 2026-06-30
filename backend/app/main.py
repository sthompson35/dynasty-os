import os
import logging
import json
from time import perf_counter
from uuid import uuid4
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest, urlopen

from fastapi import FastAPI, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from app.api.deals import router as engines_router
from app.api.leads import router as leads_router
from app.api.deal_engine import router as deal_router
from app.api.property import router as property_router
from app.api.capital import router as capital_router
from app.api.disposition import router as disposition_router
from app.api.land_build_uw_dd import router as land_build_router
from app.api.sync import router as sync_router
from app.api.dynasty_ai import router as dynasty_ai_router
from app.api.automation import router as automation_router

load_dotenv()

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger("dynasty_property_os.api")

CORRELATION_HEADER = "X-Correlation-ID"

app = FastAPI(title="Dynasty PropertyOS API", version="0.3.0")

# ── Compute engines (stateless) ───────────────────────────────────────────────
app.include_router(engines_router)

# ── Lead Engine ───────────────────────────────────────────────────────────────
app.include_router(leads_router)

# ── Deal Engine ───────────────────────────────────────────────────────────────
app.include_router(deal_router)

# ── Property Intelligence ─────────────────────────────────────────────────────
app.include_router(property_router)

# ── Capital Engine ────────────────────────────────────────────────────────────
app.include_router(capital_router)

# ── Disposition Engine ────────────────────────────────────────────────────────
app.include_router(disposition_router)

# ── Land + Build Underwriting & Due Diligence ─────────────────────────────────
app.include_router(land_build_router)
app.include_router(sync_router)
app.include_router(dynasty_ai_router)

# ── Automation event log (n8n write-backs) ────────────────────────────────────
app.include_router(automation_router)


def _parse_origins(value: str | None) -> list[str]:
    if not value:
        return [
            "http://127.0.0.1:3000",
            "http://localhost:3000",
        ]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_origins(os.getenv("CORS_ALLOW_ORIGINS")),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[CORRELATION_HEADER],
)


@app.middleware("http")
async def request_trace_middleware(request: FastAPIRequest, call_next):
    correlation_id = request.headers.get(CORRELATION_HEADER) or str(uuid4())
    request.state.correlation_id = correlation_id
    start = perf_counter()

    logger.info(
        "request_started correlation_id=%s method=%s path=%s query=%s",
        correlation_id,
        request.method,
        request.url.path,
        request.url.query,
    )

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (perf_counter() - start) * 1000
        logger.exception(
            "request_failed correlation_id=%s method=%s path=%s duration_ms=%.2f",
            correlation_id,
            request.method,
            request.url.path,
            duration_ms,
        )
        raise

    duration_ms = (perf_counter() - start) * 1000
    response.headers[CORRELATION_HEADER] = correlation_id
    logger.info(
        "request_completed correlation_id=%s method=%s path=%s status=%s duration_ms=%.2f",
        correlation_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response

class DealInput(BaseModel):
    purchase_price: float
    repair_budget: float
    arv: float
    closing_costs: float = 0
    holding_costs: float = 0
    selling_costs: float = 0
    target_profit_margin: float = 0.30


class InvestorSnapshot(BaseModel):
    market: str
    median_purchase_price: float
    median_arv: float
    renovation_budget: float
    avg_days_to_exit: int
    target_margin: float
    estimated_total_cost: float
    estimated_profit: float
    estimated_roi: float
    decision: str


def _llmstudio_config_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "ai_agents" / "llmstudio"


def _load_json_config(filename: str) -> dict:
    path = _llmstudio_config_dir() / filename
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _probe_llmstudio() -> dict:
    base_url = os.getenv("LLMSTUDIO_BASE_URL", "http://127.0.0.1:1234").rstrip("/")
    timeout_raw = os.getenv("LLMSTUDIO_TIMEOUT_SECONDS", "5")
    try:
        timeout_seconds = float(timeout_raw)
    except (TypeError, ValueError):
        timeout_seconds = 5.0
    req = UrlRequest(url=f"{base_url}/v1/models", method="GET")

    try:
        with urlopen(req, timeout=timeout_seconds) as resp:  # nosec B310
            return {
                "reachable": 200 <= resp.status < 300,
                "status": resp.status,
                "base_url": base_url,
            }
    except (URLError, HTTPError, TimeoutError) as exc:
        return {
            "reachable": False,
            "status": None,
            "base_url": base_url,
            "error": str(exc),
        }
    except Exception as exc:
        return {
            "reachable": False,
            "status": None,
            "base_url": base_url,
            "error": f"unexpected_error: {exc}",
        }

@app.get("/")
def root():
    return {"status": "online", "system": "Dynasty PropertyOS"}

@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/llmstudio/config")
def llmstudio_config():
    return {
        "provider": "llmstudio",
        "base_url": os.getenv("LLMSTUDIO_BASE_URL", "http://127.0.0.1:1234"),
        "default_model": os.getenv("LLMSTUDIO_DEFAULT_MODEL", ""),
        "codeploit_enabled": os.getenv("CODEPLOIT_ENABLED", "true").lower() == "true",
        "agents": _load_json_config("agents.json"),
        "assistants": _load_json_config("assistants.json"),
        "codeploit": _load_json_config("codeploit.json"),
    }


@app.get("/api/llmstudio/health")
def llmstudio_health():
    return _probe_llmstudio()

@app.post("/api/investor/flip-analysis")
def flip_analysis(payload: DealInput):
    total_cost = payload.purchase_price + payload.repair_budget + payload.closing_costs + payload.holding_costs + payload.selling_costs
    profit = payload.arv - total_cost
    roi = profit / total_cost if total_cost else 0
    decision = "GO" if roi >= payload.target_profit_margin else "NO-GO"
    return {
        "total_cost": round(total_cost, 2),
        "profit": round(profit, 2),
        "roi": round(roi, 4),
        "decision": decision
    }


@app.get("/api/investor/market-snapshot", response_model=InvestorSnapshot)
def market_snapshot(market: str = "Atlanta, GA"):
    median_purchase_price = 210000.0
    median_arv = 305000.0
    renovation_budget = 50000.0
    closing_holding_selling = 24000.0
    avg_days_to_exit = 122
    target_margin = 0.30

    estimated_total_cost = median_purchase_price + renovation_budget + closing_holding_selling
    estimated_profit = median_arv - estimated_total_cost
    estimated_roi = estimated_profit / estimated_total_cost if estimated_total_cost else 0
    decision = "GO" if estimated_roi >= target_margin else "NO-GO"

    return InvestorSnapshot(
        market=market,
        median_purchase_price=round(median_purchase_price, 2),
        median_arv=round(median_arv, 2),
        renovation_budget=round(renovation_budget, 2),
        avg_days_to_exit=avg_days_to_exit,
        target_margin=round(target_margin, 2),
        estimated_total_cost=round(estimated_total_cost, 2),
        estimated_profit=round(estimated_profit, 2),
        estimated_roi=round(estimated_roi, 4),
        decision=decision,
    )
