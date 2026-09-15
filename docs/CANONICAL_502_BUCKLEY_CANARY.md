# 502 Buckley — Canonical PropertyOS Production Canary

## Objective

Use 502 Buckley, Park Hills, MO 63601 as the first controlled real-property lifecycle canary for the enhanced Dynasty PropertyOS canonical model.

The canary sequence is locked:

`INTAKE -> UNDERWRITING -> CAPITAL -> OPERATIONS -> INDEPENDENT VERIFICATION`

A later stage cannot make an earlier missing fact true. `HOLD_FOR_DATA` and `BLOCKED` are valid outcomes and must not be converted into optimistic completion states.

## Canonical identity

Reserved stable codes:

- Property: `PROP-502-BUCKLEY`
- Deal: `DEAL-502-BUCKLEY`
- Project: `PRJ-502-BUCKLEY`
- Canary: `502-BUCKLEY-PARK-HILLS-MO`

The API creates/reuses these records only when `persist=true`. A validation call is read-only.

## INTAKE gate

Required property identity:

- address
- parcel/APN
- property type
- beds/baths
- square footage
- lot size
- year built
- current condition

Required contract controls:

- executed purchase price
- financing type
- financing terms or authoritative financing evidence reference
- closing date

Seller concessions, closing-cost assumptions, contingencies, and FHA conditions remain explicit when supplied. They are never inferred.

## UNDERWRITING gate

Requires closed-sale comp evidence references plus low/base/high ARV and confidence from the deterministic underwriting/valuation workflow.

The canonical canary does **not** calculate ARV. It consumes a completed, evidence-backed underwriting result. The valuation workflow remains:

`COMPS -> DISTANCE CHECK -> CONDITION NORMALIZATION -> FEATURE ADJUSTMENTS -> WEIGHTED ARV -> CONFIDENCE SCORE`

Recommendation is not approval. An AI `GO` result cannot authorize acquisition, capital deployment, a draw, or construction execution.

## CAPITAL gate

Consumes a caller-calculated capital stack. The canary never invents APR, term, points, LTV, equity contribution, amortization, or interest-only status.

For each debt-like source, these terms must be explicit:

- principal
- APR
- term months
- interest-only boolean

Cash sources do not require debt metrics.

## OPERATIONS gate

Requires:

- inspection evidence
- scope evidence
- bid/estimate evidence
- rehab budget
- contingency
- schedule

Physical completion, financial completion, and draw completion are distinct fields and must never be collapsed into a single inferred progress number.

The construction control plane adds WorkPackage, BudgetLineItem, QualityCheckpoint, and PhaseGate records. Draw support and completion verification remain evidence-gated.

## Governance controls merged from Enhanced Canonical v2

The additive migration implements:

- Property <-> Deal <-> Project <-> Site identity links
- immutable/versioned underwriting snapshots
- strategy analyses
- Recommendation / Approval / ExecutionCommand separation
- SyncTransaction reconciliation
- EvidenceRequirement and immutable verified EvidenceLog
- DataProvenance classifications
- AuthorityRule and DecisionQueue
- versioned EngineEvent records with correlation/idempotency keys
- ModelRegistry and RiskRegister
- WorkPackage / BudgetLineItem / QualityCheckpoint / PhaseGate
- CanaryTest / ReleaseGate / CanaryRun

## Stale roadmap reconciliation

The workbook's old `008 migration BLOCKED` status is historical and must not be copied into the current OS. The repository contains the deal-sync migration under the reconciled timestamped migration history, and subsequent Supabase Preview validation has passed. The enhanced canonical migration therefore builds forward from the reconciled migration state.

## Production rule

`READY` means only that the inputs/evidence required by the current stage are present. It does not mean independently verified, approved, funded, complete, profitable, compliant, or safe.

The final v1.0 scale gate remains independent verification of the complete Property -> Deal -> Project -> Capital -> Operations evidence trace.
