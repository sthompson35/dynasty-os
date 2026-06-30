---
applyTo: "realtor_agent/**"
description: "Apply strict compliance gates and default underwriting thresholds for Realtor Agent lead-to-deal workflows."
---

# Realtor Compliance And Threshold Defaults

Use these defaults unless the user overrides them.

## Compliance Gates (Hard Requirements)

1. Always run compliance checks before outreach enablement.
2. If DNC/TCPA/Fair Housing checks fail, block outreach immediately.
3. Continue underwriting analysis even when outreach is blocked.
4. Add explicit escalation tags: `compliance_blocked`, `attorney_review_required`, `manual_review_required` when applicable.
5. Never infer consent status from partial data; unresolved consent is treated as non-consent.

## Default Thresholds

1. Minimum data quality score: 0.80
2. Minimum contact confidence score: 0.70
3. Minimum DSCR for debt-dependent strategies: 1.20
4. Maximum aggregate risk score to auto-recommend: 0.45
5. Minimum comp count for ARV recommendation: 3

## Recommendation Rules

1. Output all passing strategies ranked by risk-adjusted return.
2. Provide one primary recommendation and one fallback note.
3. Any strategy violating threshold defaults must be marked `FAIL` with explicit reason.
4. If key fields are missing, mark recommendation `CONDITIONAL` and list exact blockers.

## Data Integrity Rules

1. Every derived value must reference source assumptions.
2. Never suppress nulls; print `MISSING`.
3. Keep `deal_id` as the primary cross-system key in all structured outputs.
