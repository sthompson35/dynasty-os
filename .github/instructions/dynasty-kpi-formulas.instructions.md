---
description: "Use when building, updating, or validating DynastyOS dashboards and KPI outputs. Enforces consistent formulas, denominator rules, and missing-data handling across lead, deal, capital, operations, and disposition reporting."
applyTo: ["frontend/**", "backend/**", "docs/**"]
---

# Dynasty KPI Formula And Denominator Standards

Use these definitions and rules for all dashboard outputs unless explicitly overridden by the user.

## Global Rules

1. Use one reporting window per output block and display it explicitly.
2. Use distinct IDs in counting KPIs to avoid duplicate inflation.
3. If denominator equals 0, return `MISSING` and explain required source data.
4. Never coerce divide-by-zero results to 0.
5. If source fields are incomplete, return `MISSING` with owner and timeline.
6. Round rates and percentages to 2 decimals.
7. Keep currency values in USD with 2 decimals.

## Lead KPIs

1. Total Leads = count of distinct `lead_id` created in window.
2. Qualified Leads = count of distinct `lead_id` that reached qualified stage in window.
3. Appointments = count of distinct appointment records scheduled in window.
4. Offers Sent = count of distinct written offers sent in window.
5. Contracts Pending = count of distinct deals in pending contract status at snapshot time.
6. Cost Per Lead = total lead acquisition spend / Total Leads.
7. Cost Per Contract = total lead acquisition spend / Contracts Pending.
8. Pipeline Value = sum of expected gross profit for active opportunities.
9. Lead Velocity = ((Qualified Leads current window - Qualified Leads prior equal window) / Qualified Leads prior equal window) * 100.

## Capital KPIs

1. Available Capital = unrestricted cash plus approved undrawn facilities at snapshot.
2. Dry Powder = Available Capital minus committed but not yet deployed capital.
3. Capital Deployed = cumulative invested capital placed into active or completed projects in window.
4. Capital Returned = principal returned to treasury/investors in window.
5. Cost Of Capital = weighted average annualized capital cost across active sources.
6. Investor Count = count of active investors with non-zero committed capital.
7. Portfolio Value = sum of current fair value of all active holdings.
8. Enterprise Value = Portfolio Value plus unrestricted cash minus outstanding debt and liabilities.

## Ratio Guardrails

1. DSCR = NOI / debt service.
2. LTV = total debt / collateral value.
3. For guardrail checks, use latest validated inputs and show timestamp.
4. If any guardrail input is stale or missing, mark guardrail outcome `MISSING`.

## Output Integrity

1. Every KPI must include formula, numerator, denominator where applicable, and source timestamp.
2. Any derived KPI without source traceability must be labeled `MISSING`.
3. When reporting MISSING values, include required source fields plus responsible owner and timeline.