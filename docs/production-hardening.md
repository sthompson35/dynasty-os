# Production Hardening — Migration & Deployment Guide

This document covers the changes introduced in the Workstream 1 + 2 production-hardening PR and provides a Railway rollout checklist.

---

## 1. What Changed and Why

### 1a. Unified SQLAlchemy Base

**Before:** Two separate `Base = declarative_base()` instances existed — one in `app/core/database.py` and one in `app/models.py`. This meant models in `models.py` were invisible to Alembic migrations and could diverge from the managed schema silently.

**After:** A single canonical `Base` lives in `app/core/database.py`. `app/models.py` now imports that shared `Base`, ensuring all models are tracked by the same metadata object and by Alembic.

### 1b. Removed Runtime `create_all`

**Before:** `main.py` called `Base.metadata.create_all(bind=engine)` at import time. In production this:
- Can create tables that bypass migration history.
- Can mask schema drift (columns added via migration may be out of sync with ORM).
- Causes non-deterministic schema state across restarts.

**After:** `create_all` has been removed. Schema changes must go through Alembic migrations exclusively.

> **Local dev note:** If you are starting fresh with no existing database, you must run `alembic upgrade head` before starting the app. SQLite for local development is still supported; set `DATABASE_URL=sqlite:///./test.db`.

### 1c. Cleaned Configuration Contract

**Before:** `app/core/config.py` had duplicate field declarations (`lm_studio_base_url`, `s3_*`, `database_*` all appeared twice). The second declaration silently overrode the first, creating hidden defaults.

**After:** Each field appears exactly once. A `model_validator` enforces production-specific requirements when `APP_ENV=production`:
- `DATABASE_URL` must be a PostgreSQL connection string (not SQLite).
- `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN` must be set.

### 1d. Hardened `/readyz` Endpoint

**Before:** `/readyz` only checked Redis and raised a 503 if Redis was unavailable, treating Redis as a hard requirement.

**After:** `/readyz` checks three dimensions:

| Check | Behavior on failure |
|-------|---------------------|
| Database connectivity (`SELECT 1`) | Hard failure → 503 |
| Redis availability | Degraded status, but not fatal — 200 with `"redis": "degraded"` |
| Critical config presence (`DATABASE_URL`) | Hard failure → 503 |

Response shape:
```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "config": "ok"
  }
}
```
Or when degraded:
```json
{
  "status": "not_ready",
  "checks": {
    "database": "error: connection refused",
    "redis": "degraded",
    "config": "ok"
  }
}
```

### 1e. Redis Failure Logging

The Redis init block now uses `logger.warning(...)` (structured JSON) instead of `print(...)`, so the failure is visible in Railway's structured log stream.

### 1f. Supabase Config Scaffolding (Workstream 2)

Three new environment-driven fields have been added to `Settings`:

| Field | Env var | Required | Default |
|-------|---------|----------|---------|
| `supabase_url` | `SUPABASE_URL` | No (yet) | `None` |
| `supabase_service_role_key` | `SUPABASE_SERVICE_ROLE_KEY` | No (yet) | `None` |
| `supabase_db_schema` | `SUPABASE_DB_SCHEMA` | No | `"public"` |

These are scaffolded and ready for future integration. No client code or Supabase calls are wired yet — that comes in the next workstream.

---

## 2. Environment Variable Reference

### Required in all environments

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Full SQLAlchemy connection string. PostgreSQL required in staging/production. |

### Required in production (`APP_ENV=production`)

| Variable | Description |
|----------|-------------|
| `SLACK_SIGNING_SECRET` | Used to verify incoming Slack webhook signatures. |
| `SLACK_BOT_TOKEN` | OAuth token for posting messages to Slack. |

### Optional / service-specific

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | Runtime mode: `development`, `staging`, `production`. |
| `DEBUG` | `false` | Enable SQLAlchemy query echo and verbose logging. |
| `LOG_LEVEL` | `INFO` | Structlog level: `DEBUG`, `INFO`, `WARNING`, `ERROR`. |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection string. Supports `rediss://` for TLS. |
| `CELERY_BROKER_URL` | same as REDIS_URL default | Celery broker. |
| `CELERY_RESULT_BACKEND` | same as REDIS_URL default | Celery results backend. |
| `ABACUS_API_KEY` | — | Abacus.AI API key. |
| `OPENAI_API_KEY` | — | OpenAI API key. |
| `LM_STUDIO_BASE_URL` | `http://host.docker.internal:1234/v1` | LM Studio local endpoint. |
| `S3_ENDPOINT_URL` | `http://localhost:9000` | S3-compatible storage endpoint. |
| `S3_ACCESS_KEY` | `minioadmin` | S3 access key. |
| `S3_SECRET_KEY` | `minioadmin` | S3 secret key. |
| `S3_BUCKET_NAME` | `slack-ai-outputs` | Output bucket name. |

### Supabase (Workstream 2 — scaffolded)

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | — | Your Supabase project URL (`https://<ref>.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service role key for server-side access. Never expose client-side. |
| `SUPABASE_DB_SCHEMA` | `public` | Target schema for Supabase operations. |

---

## 3. Migrations-First Workflow

Schema changes must be managed through Alembic. `create_all` is no longer called at startup.

### Creating a new migration

```bash
cd services/gateway
# Ensure DATABASE_URL points to your target DB
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

### Verifying migration state

```bash
alembic current          # shows current revision
alembic history --verbose  # full migration history
```

### Local fresh start (SQLite dev)

```bash
export DATABASE_URL=sqlite:///./test.db
alembic upgrade head
uvicorn app.main:app --reload
```

---

## 4. Railway Rollout Checklist

### Pre-deploy checks

- [ ] All required environment variables are set in Railway project settings (see Section 2).
- [ ] `APP_ENV` is set to `production`.
- [ ] `DATABASE_URL` points to your PostgreSQL (Supabase or Railway Postgres) instance.
- [ ] `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN` are set.
- [ ] Run `alembic upgrade head` against the production database before deploying (or include it in your Railway start command / release phase).

### Deploy steps

1. Push the branch / merge the PR to `master`.
2. Railway will detect the push and trigger a new build.
3. If using a release command, ensure it runs `alembic upgrade head` before starting `uvicorn`.
   Example `Procfile` or `railway.toml` start command:
   ```
   alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
4. Monitor the Railway build and deploy logs for errors.

### Post-deploy verification

```bash
# Liveness check — should return 200 {"status": "healthy"}
curl https://<your-railway-domain>/healthz

# Readiness check — should return 200 {"status": "ready", "checks": {...}}
curl https://<your-railway-domain>/readyz

# Smoke test — expect 200 or 403 (valid Slack signature required for POST endpoints)
curl -I https://<your-railway-domain>/health
```

Expected `/readyz` response for a healthy deployment:
```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "config": "ok"
  }
}
```

If `"redis": "degraded"` appears but `"status": "ready"`, the app is running but async job queuing is unavailable until Redis is connected.

### Rollback guidance

If the deployment fails:

1. In Railway: navigate to **Deployments** → select the previous successful deployment → **Redeploy**.
2. If a migration ran that needs to be rolled back:
   ```bash
   alembic downgrade -1
   ```
   Then redeploy the previous code version.
3. Check `/readyz` after rollback to confirm the service is healthy.
