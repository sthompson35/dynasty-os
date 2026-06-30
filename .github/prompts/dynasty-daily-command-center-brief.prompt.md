---
name: Dynasty Daily Command Center Brief
description: "Generate a daily Dynasty Core Command Center brief with strict engine coverage, KPI consistency, and a final gated decision."
argument-hint: "Provide reporting date, market scope, project/deal IDs, and any overrides for thresholds."
agent: Dynasty Core Command Center Operator
model: GPT-5.3-Codex
---

Generate the daily command center brief for DynastyOS.

## Inputs

Use the user-provided date, market scope, projects, deals, capital state, and investor notes as authoritative.
If required values are unavailable, report each as MISSING with owner and timeline.

## Required Sections

1. Executive Command Snapshot
2. Lead Engine Dashboard
3. Deal Engine Decision And Threshold Check
4. Capital Engine Position
5. Operations Status (Project #001 if 502 Buckley is in scope)
6. Disposition Pathway Recommendation
7. InvestorOS Lifecycle Status
8. PropertyOS Digital Twin Completeness
9. Smart Town Intelligence Highlights
10. AI Trooper Routing Plan
11. KPIs
12. Decision: GO, GO WITH CONDITIONS, RENEGOTIATE, HOLD, or KILL

## Mandatory Rule Checks

- Validate and report each threshold explicitly:
  minimum wholesale fee $15,000, minimum flip margin 30%, worst-case ROI 20%+, target ROI 25%+, DSCR 1.25x+, LTV 70% max.
- If any threshold is failed, do not return GO.
- GO WITH CONDITIONS below 20% worst-case ROI is allowed only with explicit compensating controls, owner, timeline, and downside protection.

## KPI Formatting Rules

- Use consistent formulas and denominator handling from workspace instructions.
- If a denominator is zero or source data is incomplete, return MISSING and list required source fields.
- Always include date window and data freshness for each KPI block.

## Output Style

- Keep output concise, auditable, and operations-focused.
- Avoid sales language and avoid unstated assumptions.