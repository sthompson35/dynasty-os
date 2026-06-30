# Backend - Dynasty PropertyOS

FastAPI service layer for Dynasty PropertyOS.

## Purpose

The backend provides:

- Core health and root service endpoints
- Investor analysis endpoints
- LLMStudio configuration and health endpoints
- Request tracing with correlation IDs

Main entrypoint: `app/main.py`

## Stack

- Python 3.12+
- FastAPI
- Uvicorn
- Pydantic
- python-dotenv
- Supabase Python client

Dependencies are pinned in `requirements.txt`.

## Setup

From repository root:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

## Run (Development)

From repository root:

```bash
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Open API docs:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Environment Variables

Backend reads from root `.env`.

Important keys:

- `CORS_ALLOW_ORIGINS`
- `LOG_LEVEL`
- `LLMSTUDIO_BASE_URL`
- `LLMSTUDIO_DEFAULT_MODEL`
- `LLMSTUDIO_TIMEOUT_SECONDS`
- `CODEPLOIT_ENABLED`

## Current Endpoints

- `GET /`
- `GET /health`
- `GET /api/llmstudio/config`
- `GET /api/llmstudio/health`
- `POST /api/investor/flip-analysis`
- `GET /api/investor/market-snapshot`

## Test and Validation

Run full verification from repo root:

```bat
scripts\verify_all.bat
```

or

```powershell
./scripts/verify_all.ps1
```

Backend unit test target used by verification:

```bash
python -m unittest -q tests.test_investor_flow
```
