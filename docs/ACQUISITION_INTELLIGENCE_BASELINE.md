# Acquisition Intelligence + Underwriting Integrity — Baseline

**Release baseline:** `v1.3.0` design scope, verified through commit `d2fa989` on `main`.

This document describes what is actually built, wired, and verified as of this
baseline — not the aspirational design docs elsewhere in this repo (several of
which describe engines that exist only as Python classes with no live HTTP
route, or n8n workflows that were never activated). Everything below has been
exercised against real data or a real browser session.

## Canonical flow

```
Import (CSV / PDF / CLI script)
      |
      v
Normalization (property-import-utils.ts / import-propwire.ts)
      |
      v
Property row (Prisma, dynasty."Property")
      |
      v
GIS/FEMA enrichment (lib/gis-enrichment.ts)
      |
      v
Underwriting score (lib/portfolio-scoring/score-property.ts)
      |
      v
DealScore row + reasons[] (explainable decision)
```

### Import

Two import paths exist and are now field-parity-checked against each other:

- `frontend/scripts/import-propwire.ts` — CLI script, full PropWire column
  coverage (List Price, Last Sale Amount, Owner, APN, County, etc.), writes
  `purchasePrice` and a `notes` metadata summary.
- `frontend/app/api/properties/import/{csv,pdf}` + `frontend/lib/property-import-utils.ts`
  — UI-driven import (CSV upload, or PDF via an LLM Studio extraction step).
  Originally missed `Last Sale Amount` as a purchasePrice alias and never
  populated `notes`; both gaps are now fixed (see "Known incidents" below).

Both paths converge on `buildPropertyMutationData()` /
`serializeProperty()` in `frontend/lib/property-utils.ts` as the single
normalization boundary before anything is read elsewhere in the app.

The import commit route now returns a `completeness` object
(`purchasePrice`/`currentValue`/`notes` % of imported rows) and logs a
warning if `purchasePrice` completeness is under 10% on a 20+ row import —
the same check that would have caught the production data gap below on day
one.

### GIS/FEMA enrichment (`frontend/lib/gis-enrichment.ts`)

Three independent, fail-soft lookups, composed in `enrichPropertyGis()`:

1. **Census Geocoder** (`geocoding.geo.census.gov`) — lat/lon, census
   tract/GEOID, county. Free, no key, no rate limit issues observed.
2. **FEMA NFHL flood zone** (`hazards.fema.gov/arcgis/.../MapServer/28`) —
   queried by the point from step 1. Free, no key.
3. **FEMA disaster declaration history** (`fema.gov/api/open/v2/DisasterDeclarationsSummaries`)
   — queried by county FIPS, derived from the GEOID already obtained in step
   1 (no extra geocoding call). Free, no key.
4. **Zoning** — a pluggable per-jurisdiction adapter registry. **Currently
   empty.** Every property reports `zoningSource: "unknown - verify locally"`.
   This is intentional, not a bug: the one live candidate found (St. Louis
   City's `stlgis.stlouis-mo.gov/.../PDA_ZONING/MapServer`) returned HTTP 500
   on every layer query attempted during implementation, and St. Louis
   County / St. Francois County have no confirmed direct feature-service URL.

Hooked in at three points: synchronous on manual property creation (~5s
budget, fails soft), a per-property re-run route
(`/api/properties/[id]/gis-enrich`), and a batch path (CLI script
`enrich-portfolio-gis.ts` + automation route `/api/automation/gis-enrichment`)
for backfilling the existing portfolio.

**Verified at full portfolio scale (19,138 properties):** 97.9% geocoded,
97.8% flood-zone resolved, 100% of geocoded properties have FEMA disaster
history. 6 transient write failures on the first pass, reproduced as
non-recurring on individual retry (not a data or schema issue).

### Underwriting (`frontend/lib/portfolio-scoring/score-property.ts`)

`scoreProperty()` is the real, live scoring engine behind
`/api/portfolio-scores` and the batch/automation equivalents. It is distinct
from `backend/app/dynasty_ai/core.py`'s `DynastyAIOrchestrator` and from
`calculateDealMetrics()` (a display-only tile calculation) — three separate,
non-equivalent scoring systems exist in this codebase; only this one has
regression tests protecting its output.

Underwriting integrity rules enforced here:

- **No verified purchase price → never GO.** A missing price is not treated
  as zero cost / free equity.
- **All-in basis (purchase + repairs) ≥ ARV → never GO**, always
  RENEGOTIATE or KILL.
- **Property-specific flood zone drives risk directly**: +15 for standard
  SFHA zones (A/AE/AH/AO/AR), +20 for severe coastal Zone VE, no change for
  Zone X.
- **County-wide FEMA disaster count/type is contextual only** — surfaced in
  `reasons` but never moves the score. It conflates all hazard types
  (severe storms, tornadoes, even pandemic declarations) at the county
  level, so a high count doesn't imply elevated flood risk for a specific
  property, and a low count doesn't offset a property that actually sits in
  a mapped floodplain.

All four rules are protected by regression tests in
`score-property.test.ts`, each encoding the underwriting intent (not just
implementation details) with a concrete before/after example.

## Data model additions this phase

Added to `Property` (via `database/migrations/026_property_gis_fields.sql`
and `027_property_fema_disaster_history.sql` — **not**
`supabase/migrations/`, which governs an entirely separate `public` schema
for the Python backend in a different Supabase project):

`latitude`, `longitude`, `censusTract`, `censusGeoid`, `floodZone`,
`floodZoneSource`, `zoningDistrict`, `zoningSource`, `gisEnrichedAt`,
`femaDisasterCount`, `femaLastDisasterDate`, `femaLastDisasterType`,
`femaDisasterSource`.

Migrations are applied via `.github/workflows/predeploy.yml`, which runs
`database/migrations/*.sql` in filename order via `prisma db execute`
against the real `DATABASE_URL` (a Railway-hosted Postgres in production;
local Docker Postgres in dev). This was misidentified once during this
phase — confirm against `list_tables` on the actual Supabase project before
assuming a migration folder is authoritative; it may not apply to the
schema you think it does.

## Known incidents (resolved)

- **Production account had near-zero purchase price data.**
  `sdthompson35@gmail.com`'s 10,181-property portfolio was bulk-loaded
  through a path that captured only address/city/state/currentValue,
  silently dropping price and metadata (confirmed: 0% `notes` coverage vs.
  100% on the correctly-imported `test@example.com` dataset). Root-caused
  by locating the original PropWire export CSVs in `research/` and matching
  identical addresses/values against the DB. Repaired via
  `frontend/scripts/repair-propwire-pricing.ts` (matches by normalized
  address+city+state+zip, updates only empty fields) — recovered real
  pricing for 5,250 properties (51.6%), unlocking 1,491 GO decisions (84
  Elite Deals) where there were previously zero. The same alias/notes gap
  was then fixed in the UI import path so it can't recur.

- **Hydration mismatch on `/property-manager` and `/contractor`.**
  `new Date(x).toLocaleDateString()` renders in the runtime's local
  timezone; the Docker frontend container runs in UTC while the browser
  runs in the host's local timezone, so a date-only string parsed as UTC
  midnight rendered a different calendar day on the server vs. after client
  hydration. Fixed by formatting with an explicit `timeZone: 'UTC'`.

## Known deferred work (not bugs)

- **Zoning has zero live adapters.** See above — needs real endpoint
  verification for St. Louis City/County and St. Francois County (the two
  jurisdictions covering 91% of the real portfolio) before it can be wired.
- **Import consolidation**: two working import paths exist
  (`import-propwire.ts`, the UI CSV/PDF path) with now-matching field
  coverage, but no shared canonical-DTO abstraction. Deferred deliberately —
  two concrete implementations don't yet justify a general `ImportProvider`
  framework; revisit if a third import source is actually added.
  Enrichment-provider framework and a persistent completeness dashboard
  were deferred for the same reason.
- **Flood/FEMA data is not yet surfaced outside `scoreProperty()`'s risk
  score** — no property-list badge, no portfolio-level risk rollup.

## Testing approach

- `frontend/lib/portfolio-metrics.test.ts`,
  `frontend/lib/portfolio-scoring/score-property.test.ts` — regression
  suites, run via `npm run test:portfolio-metrics` /
  `test:portfolio-scoring`, wired into `.github/workflows/predeploy.yml`.
- Backend: `pytest` from the repo-root `.venv` (not `backend/.venv` — no
  such folder exists; not the Docker `dynasty_api` image either, which
  doesn't include `pytest`).
- New code (enrichment, scoring changes, import fixes) verified against
  real production data before being considered done — not just unit tests.
- UI changes verified via Playwright against the live Docker stack
  (`localhost:3005`, login `test@example.com` / `password123`), checking
  for console errors and hydration warnings, not just that a page returns
  200.
- Known environment gotcha: `docker-compose.yml` bind-mounts
  `./frontend:/app`, so running `next build` (production build) on the host
  while `dynasty_frontend`'s `next dev` is running corrupts the shared
  `.next` folder and produces spurious 404s on every static asset across
  every page. Not a product bug — restart the container (`docker restart
  dynasty_frontend`) to recover.
- Similarly, new API route files are sometimes not picked up by `next dev`'s
  file watcher over the Windows Docker bind mount (a known limitation for
  newly-created files specifically); a container restart forces a fresh
  scan.

## Engineering principles that emerged this phase

- Verify against real production data, not synthetic examples, before
  calling anything done.
- Add an abstraction (provider frameworks, version fields, audit tables,
  dashboards) only when a concrete, currently-existing case justifies it —
  not for hypothetical future sources or scale.
- Prefer a completeness/failure signal that's just a log line or JSON
  summary over new persistent infrastructure, until there's evidence the
  simpler thing isn't enough.
- When a data source is genuinely unknown/unverified (zoning), report that
  honestly (`"unknown - verify locally"`) rather than guessing.
- Root-cause surprising results (e.g. 0% GO decisions) before assuming the
  scoring/enrichment logic is at fault — it may be upstream data.
