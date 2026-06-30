---
name: realtor-outreach-negotiation-dealdesk-handoff
description: "Use when converting an underwritten deal into executed communications, negotiation progression, and contract-ready deal desk output with compliance and escalation controls. Triggers on: outreach sequencing, counter-offers, objection handling, deal structure shifts, contract drafting, and legal escalation."
---

# Realtor Outreach To Deal Desk Handoff Workflow

This skill defines a controlled execution path from underwriting output to outbound outreach, live negotiation, and contract package generation.

## When To Activate

Activate this skill when the user needs to:
- Launch multi-channel outreach from qualified leads.
- Handle counters and concessions in structured negotiation rounds.
- Convert agreed terms into deal-desk-ready contract packages.
- Apply compliance, legal, and approval escalations before send.

## Workflow Overview

1. Outreach Readiness Gate
2. Outreach Execution And Tracking
3. Negotiation Loop
4. Deal Structure Lock
5. Deal Desk Package Assembly
6. Final Approval And Send

## Step 1: Outreach Readiness Gate

Goal: Confirm the lead is communication-eligible.

Actions:
1. Validate consent, quiet-hours, and suppression list status.
2. Confirm owner/contact confidence clears threshold.
3. Pull strategy recommendation context from underwriting.
4. Build outreach persona, channel order, and message objective.

Decision points:
- If compliance is blocked, halt outreach and escalate.
- If owner confidence is low, route back to owner research.

Completion checks:
- Lead status set to `outreach_ready`.
- Channel permissions are explicit by contact and jurisdiction.

## Step 2: Outreach Execution And Tracking

Goal: Start compliant, measurable communication.

Actions:
1. Select templates by strategy and seller profile.
2. Launch sequenced outreach across approved channels.
3. Capture inbound responses with sentiment and intent tags.
4. Update lead temperature and response SLA timers.

Completion checks:
- Every outbound message has template/version attribution.
- Reply outcomes are recorded with timestamp and channel.

## Step 3: Negotiation Loop

Goal: Move toward acceptable terms with structured concessions.

Actions:
1. Compare seller vs buyer positions side-by-side.
2. Generate counter-offer options with rationale.
3. Apply concession matrix (price, terms, close date, contingencies).
4. Use objection handling scripts where needed.
5. Recompute strategy viability when material terms shift.

Decision points:
- If cash path fails, test creative finance alternatives.
- If BATNA threshold is breached, trigger walk-away recommendation.

Completion checks:
- Each round has offer, counter, delta, and decision outcome.
- Negotiation history is complete and auditable.

## Step 4: Deal Structure Lock

Goal: Freeze commercially agreed terms before drafting.

Actions:
1. Confirm final economics, timeline, contingencies, and responsibilities.
2. Select transaction type (cash, subject-to, seller finance, hybrid, etc.).
3. Set attorney-review requirement based on structure complexity.

Completion checks:
- Term sheet is complete and signed off internally.
- Non-standard terms are tagged `attorney_review_required`.

## Step 5: Deal Desk Package Assembly

Goal: Produce contract-ready package with required evidence.

Required components:
1. Contract template selection and populated fields.
2. Clause library insertion (dynamic contingencies/terms).
3. Underwriting summary snapshot attached.
4. Compliance and communication log attached.
5. Redline history initialized.

Completion checks:
- Document completeness validator passes.
- Required signatures and placeholders are present.

## Step 6: Final Approval And Send

Goal: Release documents safely and traceably.

Actions:
1. Run final compliance scan.
2. Run legal/manager approval gate by rule.
3. Publish via e-sign integration hooks.
4. Update pipeline stage and trigger closer handoff.

Completion checks:
- Deal status moved to `under_contract` or `escalated`.
- Full audit event written for send action.

## Escalation Rules

- Compliance block: No outreach or send; escalate to compliance queue.
- Legal complexity (subject-to/novation/hybrid custom clauses): Require attorney review.
- Terms outside underwriting guardrails: Require team lead approval.
- Repeated no-response after max cadence: Return to nurture workflow.

## Example Prompts

- "Run outreach-to-deal-desk handoff for this underwritten lead and show blockers first."
- "Process latest seller counter and return next 3 concession-safe options."
- "Convert accepted terms into a deal desk package and flag legal review items."

## Skill Metadata

Created: 2026-06-12
Last Updated: 2026-06-12
Version: 1.0.0
Scope: Workspace (.github/skills)
