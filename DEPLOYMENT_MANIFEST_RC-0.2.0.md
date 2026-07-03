# Deployment Manifest — RC-0.2.0

## What this is

Origin/main and this session's local work had **zero common git ancestor** (confirmed via `git merge-base`) — two independent histories that happened to share most underlying file content. This RC was built by porting the verified Charlie Deal Intelligence Panel work onto `origin/main` as the canonical base, on branch `charlie-panel-port`. See `git log charlie-panel-port` for the exact commits.

## Services & versions

| Service | Where | What's deployed |
|---|---|---|
| Backend (FastAPI) | Railway, service `dynasty-os`, Root Directory = `backend/` (dashboard-configured, not in repo) | `backend/app/api/deal_engine.py` + `dynasty_os/` package (see below) |
| Frontend (Next.js) | Not currently deployed to Railway — local Docker only (`docker-compose.yml`, port 3005) | `frontend/` |
| Database | Supabase Cloud, project `dynasty-property-os` (`ouvjuupterqarjokeiid`), Postgres 17.6.1 | See migration state below |
| n8n workflow | n8n Cloud (`ultimate-dynasty-os.app.n8n.cloud`), workflow `OEGkyufLk21eS6lz` | Fixed and verified this session (brace-escaping + body-encoding bugs) — this is a separate deploy target from Railway/GitHub, already live |

`dynasty_os/` (the actual decision-engine package `backend/app/api/deal_engine.py` imports) must remain resolvable from wherever `backend/` runs on Railway — confirmed working today via the live `/api/land-build/*` and `/api/deal/*` routes, but the exact resolution mechanism (PYTHONPATH vs. Railway's build root) isn't visible from the repo, only Railway's dashboard.

## Migration state

Applied directly to production Supabase this session (via the Supabase MCP connector, independent of git/Railway deploys):

```
008_deal_sync_fields.sql
  - projects.deal_id (+ index)
  - UNIQUE(deal_id) on property_analysis, underwriting, risk_scores, exit_models, stress_tests
```

Migrations 001-007 were already live prior to this session. `supabase/migrations/008_deal_sync_fields.sql` is committed to `charlie-panel-port` for source-control completeness — **the schema change itself is already live regardless of which git branch gets deployed.**

## What's new in this RC vs. what's currently live on Railway

`backend/app/api/deal_engine.py` gains: `POST /{deal_id}/analyze`, `GET /{deal_id}/intelligence`, `GET /{deal_id}/investor-matches`, and `POST /approve` now requires `investor_id` on GO/GO_WITH_CONDITIONS decisions and fans out into `commitments`/`projects`/`property_marketing`. **This changes `/approve`'s request contract and WILL break two existing n8n automation nodes on deploy**, confirmed by reading `n8n/dynasty-os-v3-workflow.json` directly:
- `Deal Intake: Approve Deal` (line 576) — sends `{deal_id, decision: 'GO', approved_by: 'dynasty_os_automation', notes}`, no `investor_id`.
- `Deal Status: APPROVED - HTTP` (line 894) — same shape, same gap.

Both have `continueOnFail: true`, so the workflows won't crash outright, but auto-approval will silently stop working (400 response, swallowed) until either these nodes are updated to supply an `investor_id`, or `/approve`'s validation is relaxed for automation-originated calls. **Fix this in the n8n workflow before deploying this backend change**, or auto-approved deals will stop syncing to Capital/Operations/Disposition without any visible error.

## Rollback plan

**Backend (Railway):** Railway retains prior deployments and supports one-click rollback from its dashboard (Deployments tab → select a previous deployment → Redeploy). No CLI/git action needed — this is the actual mechanism for this app, unlike the `systemctl`/`pm2` procedures in the pre-existing `PHASE_1_DEPLOYMENT_RUNBOOK.md`, which don't apply to how this app is actually deployed.

**Database (Supabase):** Supabase Cloud provides point-in-time recovery from its dashboard (Database → Backups). Migration 008 is additive-only (new column, new indexes, new UNIQUE constraints on previously-empty-of-conflicts columns) — rolling it back cleanly would require `ALTER TABLE projects DROP COLUMN deal_id` and dropping the five new UNIQUE constraints, which is safe since nothing else depends on them yet. No data migration/backfill was needed, so there's no destructive-rollback risk from this specific migration.

**n8n Cloud:** Independent of both of the above — the n8n workflow fix is already live and unaffected by Railway/Supabase rollback decisions.

**Recovery checklist:**
1. If `/approve` starts rejecting webhook calls post-deploy: check whether `dynasty-deal-status`'s payload includes `investor_id`; either patch the n8n workflow to supply one, or Railway-rollback the backend to the previous deployment while that's fixed.
2. If Charlie's `/analyze` endpoint errors on a specific deal: check for NULL numeric columns on that deal (the bug this session found and fixed) — if a NEW un-anticipated NULL-handling gap surfaces, it fails per-deal, not globally; other endpoints are unaffected.
3. Full rollback: Railway dashboard → redeploy prior deployment. No database rollback needed unless something writes bad data via the new sync paths — check `commitments`/`projects`/`property_marketing` for rows created after the deploy timestamp if a rollback is needed there.
