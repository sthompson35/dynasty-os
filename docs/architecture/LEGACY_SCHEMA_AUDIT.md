# Legacy Schema Audit — `001_dynasty_propertyos_schema.sql`

**Trigger:** `scripts/verify_migration_state.ts` flagged this migration as PENDING — its 18 tables don't exist in the live database, in any Prisma model, or in any other migration.

**Root cause:** This file predates the current architecture. Migration `002_dynasty_engine_tables.sql` runs `SET search_path TO dynasty;` and creates quoted CamelCase tables (`"Property"`, `"Deal"`, `"User"`, ...) matching `prisma/schema.prisma` — that is the schema the live app actually runs on. Migration `001` targets Supabase's default `public` schema with lowercase snake_case tables, UUID primary keys, and a completely different data model (multi-tenant `organizations`, a Blender/GLB "digital twin" 3D pipeline, a materials takeoff system, a double-entry accounting ledger, blockchain document notarization). Copies of this same file also exist under `supabase/migrations/` and in three folders under `_archive/` — including one literally named `dynasty_propertyos_supabase_blender` — confirming this was an earlier, separately-scoped product direction that was set aside, not a migration someone forgot to run.

**Scope of this document:** classify each of the 18 tables. No files are deleted or modified as part of this audit — classification only, per instruction.

---

## Multi-tenant / user model (superseded)

### `organizations`
- **Purpose:** Multi-tenant organization record owning users and properties.
- **Referenced anywhere?** No — only appears within this migration's own file cluster (duplicates in `supabase/migrations/`, `_archive/`).
- **Prisma model exists?** No.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Delete.** The live app is single-tenant (every model keys off `userId` directly). Reviving multi-tenancy would be a deliberate architecture decision made fresh, not a resurrection of this table.

### `users_profile`
- **Purpose:** Extended user profile with org link and a role `CHECK` enum (owner/admin/investor/contractor/lender/appraiser/property_manager/viewer).
- **Referenced anywhere?** No.
- **Prisma model exists?** No — but `User` (NextAuth-backed, simple `role` string) already serves this exact purpose.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Delete.** Functionally replaced by `User`.

### `properties` (lowercase, public schema)
- **Purpose:** Core property record — a full, incompatible duplicate of the current `Property` model (different columns: `property_code`, `beds`/`baths` vs `bedrooms`/`bathrooms`, no `notes`/`photoUrl`/`virtualTourUrl`, etc.).
- **Referenced anywhere?** No.
- **Prisma model exists?** No — `Property` (dynasty schema, cuid) is the live equivalent.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Delete.** Direct duplicate of a model that already exists and is in active use.

---

## Digital twin / 3D visualization (partially superseded, partially unbuilt)

### `property_plans`
- **Purpose:** Uploaded blueprint/plan files with OCR-extracted text.
- **Referenced anywhere?** No.
- **Prisma model exists?** No — `PropertyDocument` covers generic file uploads but has no extracted-text field.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Archive.** Real unbuilt idea (plan-specific OCR extraction), not yet superseded, not currently planned either.

### `digital_twins`
- **Purpose:** Stored 3D model files (Blender/GLB/FBX) plus a viewer URL.
- **Referenced anywhere?** The *concept* is live — `property-3d-scene.tsx`, `property-3d-viewer.tsx`, `PropertyViewer.tsx`, and `twin-utils.ts` render a procedural 3D "digital twin" computed from `Property` fields at request time. No persisted 3D asset files exist.
- **Prisma model exists?** No `DigitalTwin` model.
- **API uses it?** No.
- **UI uses it?** Indirectly — the current 3D viewer is a different, simpler implementation of the same idea.
- **Classification: Archive.** The product direction is alive and shipped in a lighter form; this specific table (authored/uploaded 3D assets) is a plausible future extension, not something to build verbatim from a 2026-era draft.

### `rooms`
- **Purpose:** Persisted room dimensions/layout (x/y/width/length/height per room).
- **Referenced anywhere?** No — the current 3D viewer computes room blocks procedurally; nothing persists room geometry.
- **Prisma model exists?** No.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Archive.** Dependent on the `digital_twins` roadmap item above; not standalone.

### `building_components`
- **Purpose:** Per-room fixture/component tracking with a condition rating and replace-or-repair flag.
- **Referenced anywhere?** No.
- **Prisma model exists?** Partially — `RehabItem` has `room` and `category` fields but no condition rating or structured component taxonomy.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Archive.** Real gap versus `RehabItem`'s flatter model, but no current pressure to build it.

---

## Materials takeoff system (unbuilt, over-normalized)

### `material_categories`
- **Purpose:** Material taxonomy (name + parent category).
- **Referenced anywhere?** No.
- **Prisma model exists?** No — `RehabItem.category` is free text.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Delete.** A standalone taxonomy table has no value without the `materials` catalog it supports; if that catalog is ever built, category should likely just be an enum/string on it rather than a separate join.

### `materials`
- **Purpose:** Material catalog — SKU, cost/unit, labor cost/unit, lifespan, ROI score, texture/normal/roughness map URLs.
- **Referenced anywhere?** No.
- **Prisma model exists?** No.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Archive.** Plausible real roadmap item for the Rehab Engine (cost estimation from a real materials catalog instead of manual `RehabItem` entry), not currently planned but not dead either.

### `component_material_options`
- **Purpose:** Compare material options per building component (selected flag, estimated cost).
- **Referenced anywhere?** No.
- **Prisma model exists?** No.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Delete.** Depends on two other unbuilt tables (`building_components`, `materials`); this specific join structure would be redesigned from scratch if the parent tables are ever built.

---

## Rehab / underwriting (superseded)

### `rehab_projects`
- **Purpose:** Project wrapper around rehab work — name, strategy, dates, total budget, contingency %.
- **Referenced anywhere?** No.
- **Prisma model exists?** No — `RehabItem` and `Draw` attach directly to `Property`, with no project-level wrapper (no contingency %, no explicit start/target-completion dates at the project level).
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Archive.** Only relevant if a property ever needs multiple distinct rehab phases/projects tracked separately; no current signal that's needed.

### `rehab_scopes`
- **Purpose:** Scope-of-work line items (category, quantity, material/labor cost, status).
- **Referenced anywhere?** Also independently listed in `docs/STLLC_Realtor_Investment_Agent_Blueprint.md` as a separate, still-unbuilt schema proposal.
- **Prisma model exists?** Yes, functionally — `RehabItem` already covers category, quantity, cost, status, room, and sort order.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Delete.** Directly superseded by `RehabItem`, which is live and in use.

### `deal_analyses`
- **Purpose:** Underwriting inputs — purchase price, closing costs, repair budget, holding costs, ARV, financing terms.
- **Referenced anywhere?** No.
- **Prisma model exists?** Yes, functionally — these are already fields on `Property` (`purchasePrice`, `arv`, `repairCosts`, `holdingCosts`, `closingCosts`).
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Delete.** Redundant with fields already on `Property`.

### `deal_outputs`
- **Purpose:** Computed underwriting results — MAO, wholesale fee, flip ROI, cash-on-cash, cap rate, DSCR, decision, risk score.
- **Referenced anywhere?** No.
- **Prisma model exists?** Yes — `DealScore` (decision, riskScore, strategy, scoreBucket, reasons/inputs as JSON) is the live equivalent, and more flexible (JSON reasons vs. fixed columns).
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Delete.** Directly superseded by `DealScore`.

---

## Accounting engine (unbuilt, still on the roadmap)

### `chart_of_accounts`
- **Purpose:** Accounting ledger taxonomy (account code/name/type, parent account for hierarchy).
- **Referenced anywhere?** `dynasty_os/accounting_os/__init__.py` docstring references it conceptually; matches the empty `accounting/chart_of_accounts/` scaffold directory referenced in the repo's README layout.
- **Prisma model exists?** No.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Archive.** Real, documented roadmap item (a proper accounting engine), just not built. Matches empty scaffolding that already exists elsewhere in the repo.

### `property_ledgers`
- **Purpose:** Per-property, per-fiscal-year ledger container.
- **Referenced anywhere?** Same `accounting_os` stub; matches the empty `accounting/ledgers/` scaffold directory.
- **Prisma model exists?** No — `CapitalTransaction` only tracks investor capital calls/returns, not a general property ledger.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Archive.** Same roadmap item as `chart_of_accounts`.

### `transactions` (general ledger)
- **Purpose:** Debit/credit transaction log tied to a ledger and chart-of-accounts entry.
- **Referenced anywhere?** Same `accounting_os` stub; matches empty `accounting/job_costing/` and `accounting/reports/` scaffold directories.
- **Prisma model exists?** No — `CapitalTransaction` and `Draw` are narrower (investor capital and construction draws respectively), not general double-entry bookkeeping.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Archive.** Same roadmap item; distinct from anything currently built.

---

## Document notarization (unbuilt, on the roadmap)

### `document_hashes`
- **Purpose:** SHA-256 hash + optional blockchain transaction hash per document, with a verified flag.
- **Referenced anywhere?** Matches the empty `blockchain/nft_property_passports/` and `blockchain/metadata/` scaffold directories described in the repo's README.
- **Prisma model exists?** No — `PropertyDocument` has no hash or verification fields.
- **API uses it?** No.
- **UI uses it?** No.
- **Classification: Archive.** Real, documented roadmap item (document notarization / property passport), just not built.

---

## Summary

| Classification | Count | Tables |
|---|---|---|
| **Delete** | 8 | `organizations`, `users_profile`, `properties`, `material_categories`, `component_material_options`, `rehab_scopes`, `deal_analyses`, `deal_outputs` |
| **Archive** | 10 | `property_plans`, `digital_twins`, `rooms`, `building_components`, `materials`, `rehab_projects`, `chart_of_accounts`, `property_ledgers`, `transactions`, `document_hashes` |
| **Keep** | 0 | — |

**Why zero "Keep":** nothing in this migration is currently referenced by live code, an active API route, or a UI component that would break if the file were removed. The "Archive" group represents genuine, still-relevant product directions (accounting engine, document notarization, richer 3D/materials modeling) that show up elsewhere as empty scaffolding or docstrings — worth designing fresh against the current `dynasty` schema conventions when their time comes, not resurrecting verbatim from a 2026-era draft aimed at a different (`public` schema, UUID, multi-tenant) architecture. The "Delete" group is functionally duplicated by models that already exist and are live.

**No action taken.** This document classifies only. Suggested next step, for a separate decision: move `001_dynasty_propertyos_schema.sql` (and its `supabase/migrations/` duplicate) into `_archive/` alongside the other copies already there, with a comment pointing here — but that's a deletion-adjacent action and should get its own explicit go-ahead.
