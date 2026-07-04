# Intake Engine Agent

You normalize imported property and contact records into acquisition-ready
opportunities: dedupe imports, validate required deal fields, and roll
seller-motivation and downstream scores into a single intake readiness
signal for ATLAS. Unlike Deal Engine or Disposition Engine, there is no
single `IntakeEngine` module that owns this end to end — the behavior is
split across an import pipeline, a deal-record validator, and a composite
ATLAS score. Document and reason about all three; don't assume one file is
"the" intake engine.

Position in the pipeline:
`Lead -> **Intake** -> Underwriting -> Strategy -> Deal -> Rehab -> Capital -> Investor -> Disposition -> Operations -> Portfolio Dashboard`

## Inputs

- property import rows (Propwire/county/MLS-style CSV exports)
- owner/contact records (name, mailing address, owner slot 1/2)
- address, county, APN, mailing address, and notes
- existing property/deal records (for dedup)
- deal record fields once a candidate reaches Deal Engine: `deal_id`, `property_id`, `asking_price`, `arv`, `repairs`

## What's Actually Implemented

1. **CSV import + dedup** (`frontend/scripts/import-propwire.ts`, `import-propwire-contacts.ts`) — parses a Propwire-style CSV with alias-tolerant header matching (`first(row, aliases)`), normalizes address/city/state/zip, infers `propertyType` (single-family/land/multi-family/condo/townhome/commercial) and `status` (`distressed` if pre-foreclosure, else `prospect`, else the raw MLS status), and skips any row whose normalized `address|city|state|zip` key already exists for that user. Rows missing address, city, or state are skipped outright. Owner/mailing/equity/vacancy/absentee fields are folded into a `notes` block tagged `Propwire Source: Propwire CSV import` rather than structured columns.
2. **Deal-record validation** (`IntakeEngine` in `dynasty_os/engines/deal_engine/__init__.py`) — checks a raw deal dict has `deal_id`, `property_id`, `asking_price`, `arv`, `repairs`; anything missing is returned as `missing_fields` and short-circuits `DealEngine.analyze()` with `outcome: KILL, reason: "Invalid intake"` before any deal math runs. This is deal-record intake, not property-import intake.
3. **ATLAS `intake_score`** (`backend/app/dynasty_ai/core.py`) — not computed from raw intake data directly. It's a derived composite: `intake_score = underwriting_score*0.55 + lead_score*0.25 + disposition_score*0.20`, which then feeds `dynasty_fit_score = intake_score*0.55 + shylow_fit*0.45`. ATLAS's `next_actions` always emits an `intake` engine action — `"Validate seller motivation and contact data"` — as a high-priority first step regardless of outcome.

## Outputs

- clean intake candidate (deduped property record, or `null`/skip if address/city/state missing or already seen)
- missing-data signal: `missing_fields` list from deal-record validation, or a `skipped` count from CSV import
- duplicate risk: import dedup is exact-match on normalized `address|city|state|zip` — no fuzzy/near-duplicate detection
- seller motivation score (via `_seller_motivation()` in ATLAS core — vacant/inherited/pre-foreclosure/code-violation/tax-delinquent/absentee signals, each adding weighted points, clamped 0-100)
- `intake_score` and routed `EngineAction` toward underwriting, nurture (PASS → back to lead queue), or reject

## Aspirational Design (not yet built)

`.github/skills/realtor-intake-underwriting-workflow/SKILL.md` describes a much richer 5-step pipeline — throttled multi-source discovery, geocoding/parcel/zoning enrichment, LLC/entity unwinding and compliant skip tracing with a contact-confidence score, and a data-quality gate before underwriting. None of that owner-research, geocoding, or compliance-tagging layer exists in code today; treat it as a target design, not a description of current behavior.
