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

`backend/app/api/deal_engine.py` gains: `POST /{deal_id}/analyze`, `GET /{deal_id}/intelligence`, `GET /{deal_id}/investor-matches`, and `POST /approve` fans out into Capital (`commitments`)/Operations+Rehab (`projects`)/Disposition (`property_marketing`) on GO/GO_WITH_CONDITIONS.

**Resolved compatibility issue:** initial design made `investor_id` required on GO/GO_WITH_CONDITIONS, which would have broken two existing n8n automation nodes that approve with no `investor_id` (`Deal Intake: Approve Deal` and `Deal Status: APPROVED - HTTP` in `n8n/dynasty-os-v3-workflow.json`, both sending `decision: 'GO'` unconditionally). Fixed by decoupling deal approval from capital assignment instead of patching n8n: `investor_id` is now optional. Without it, the deal status updates and Operations + Disposition sync normally; Capital sync is deferred and flagged in `sync_errors` (informational, not an error — response is still `200`) until a human supplies an investor via a follow-up `/approve` call. Re-approving later with `investor_id` fills only the missing Capital piece — verified against production that Operations/Disposition are not re-created (same `project_id`/`marketing_id` returned) when only Capital is being backfilled.

This means the existing n8n workflow needs **no changes** to keep working with this RC — auto-approval continues to update deal status and stage Operations/Disposition exactly as it already does; Capital commitment now correctly requires a human decision instead of either blocking automation or auto-assigning investor capital unattended.

## Rollback plan

**Backend (Railway):** Railway retains prior deployments and supports one-click rollback from its dashboard (Deployments tab → select a previous deployment → Redeploy). No CLI/git action needed — this is the actual mechanism for this app, unlike the `systemctl`/`pm2` procedures in the pre-existing `PHASE_1_DEPLOYMENT_RUNBOOK.md`, which don't apply to how this app is actually deployed.

**Database (Supabase):** Supabase Cloud provides point-in-time recovery from its dashboard (Database → Backups). Migration 008 is additive-only (new column, new indexes, new UNIQUE constraints on previously-empty-of-conflicts columns) — rolling it back cleanly would require `ALTER TABLE projects DROP COLUMN deal_id` and dropping the five new UNIQUE constraints, which is safe since nothing else depends on them yet. No data migration/backfill was needed, so there's no destructive-rollback risk from this specific migration.

**n8n Cloud:** Independent of both of the above — the n8n workflow fix is already live and unaffected by Railway/Supabase rollback decisions.

**Recovery checklist:**
1. If `/approve` starts rejecting webhook calls post-deploy: check whether `dynasty-deal-status`'s payload includes `investor_id`; either patch the n8n workflow to supply one, or Railway-rollback the backend to the previous deployment while that's fixed.
2. If Charlie's `/analyze` endpoint errors on a specific deal: check for NULL numeric columns on that deal (the bug this session found and fixed) — if a NEW un-anticipated NULL-handling gap surfaces, it fails per-deal, not globally; other endpoints are unaffected.
3. Full rollback: Railway dashboard → redeploy prior deployment. No database rollback needed unless something writes bad data via the new sync paths — check `commitments`/`projects`/`property_marketing` for rows created after the deploy timestamp if a rollback is needed there.
