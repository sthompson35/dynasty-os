---
mode: ask
model: GPT-5.3-Codex
description: "Generate strict, lender-ready underwriting output using the intake-to-underwriting workflow schema."
argument-hint: "Provide property address, acquisition assumptions, rent/sale assumptions, and risk constraints."
---

Produce a lender-ready underwriting package using the workspace skill `realtor-intake-underwriting-workflow`.

## Input

Use the user-provided deal inputs as authoritative. If critical inputs are missing, ask only for required fields.

## Required Output Sections

1. Executive Summary
- Property
- Primary strategy recommendation
- Top risk flags
- Go/No-Go decision with rationale

2. Intake And Data Quality
- Source attribution summary
- Deduplication status
- Data quality score and missing fields

3. Owner And Compliance Readiness
- Ownership confidence
- Contact confidence
- Compliance status (DNC/TCPA/Fair Housing gate)
- Outreach eligibility

4. Core Underwriting
- ARV estimate with comp adjustment rationale
- Rehab estimate by scope tier
- MAO by three methods: 70% Rule, 65% Rule, ROI-based
- Break-even months

5. Strategy Screen (24-Strategy Framework)
- Rank all passing strategies by risk-adjusted return
- For each strategy include: ROI, Cap Rate, NOI, DSCR, Cash-on-Cash, MOIC, Equity Capture, Rent-to-Price, Price/SqFt, Cash Left In, Infinite Return Flag
- Explicitly list failed/rejected strategies and failure reason

6. Stress Test And Sensitivity
- 7x7 sensitivity summary
- Best/Base/Worst outputs
- Downside threshold breaches

7. Risk And Confidence
- Title/lien risk
- Condition risk
- Market risk
- Concentration risk
- Overall confidence score (0 to 1)

8. Recommendation And Next Actions
- Primary strategy
- Backup strategy
- Immediate next 5 actions
- Escalation flags for legal/compliance/manual review

## Formatting Rules

- Use deterministic headings in the exact section order above.
- Use explicit assumptions table before calculations.
- Never hide missing inputs; report them as `MISSING`.
- If compliance fails, continue analysis but mark outreach as blocked.
- Keep outputs concise and auditable; no marketing language.
