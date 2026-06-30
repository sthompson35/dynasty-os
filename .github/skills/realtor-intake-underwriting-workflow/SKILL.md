---
name: realtor-intake-underwriting-workflow
description: "Use when building or running the Realtor Agent workflow from lead discovery through data cleaning, owner research/skip tracing, and financial underwriting across 24+ strategies. Triggers on: lead intake, deal screening, ARV/MAO, comp adjustment, rehab estimation, strategy recommendation, and risk scoring."
---

# Realtor Intake To Underwriting Workflow

This skill defines a repeatable execution workflow for taking a property from raw lead intake to underwriting output that is ready for negotiation, deal desk, and lender packet generation.

## When To Activate

Activate this skill when the user needs one or more of the following:

- Discover and ingest leads from listing portals or county/MLS feeds.
- Clean and enrich incomplete property data.
- Research ownership and build compliant contact records.
- Underwrite a property with ARV, MAO, rehab, stress tests, and strategy selection.
- Compare multiple investment exits using the 24 strategy calculators.

## Workflow Overview

1. Lead Discovery And Intake
2. Data Cleaning And Enrichment
3. Owner Research And Skip Tracing
4. Financial Underwriting And Strategy Modeling
5. Quality Gate And Deliverables

## Configurable Thresholds

This skill expects explicit operating thresholds to be supplied per market/team policy.

- Minimum data quality score
- Minimum contact confidence score
- Minimum DSCR for debt-dependent strategies
- Maximum allowed aggregate risk score

## Step 1: Lead Discovery And Intake

Goal: Ingest high-quality candidate properties with source traceability.

Actions:

1. Aggregate listings from allowed sources (API-first; scrape fallback within ToS).
2. Apply request throttling and user-agent rotation.
3. Deduplicate by normalized address, then source property ID fallback.
4. Tag each record with source attribution and fetch timestamp.
5. Schedule or run incremental monitoring for net-new listings.

Completion checks:

- Each lead has a stable `deal_id` or canonical property key.
- Duplicate ratio is within acceptable range for the source batch.
- Every record has `source`, `ingested_at`, and basic address fields.

## Step 2: Data Cleaning And Enrichment

Goal: Convert raw leads into canonical, analyzable property records.

Actions:

1. Normalize address format and geocode.
2. Resolve parcel, zoning, and jurisdiction metadata.
3. Join owner-of-record from assessor/tax sources.
4. Validate beds, baths, square footage, lot size across sources.
5. Consolidate multi-source records into one canonical profile.
6. Score data quality and flag missing or conflicting fields.

Decision points:

- If address confidence is low, stop automation and request manual review.
- If critical fields conflict (sqft, property type, zoning), route to exception queue.

Completion checks:

- Canonical record includes normalized address, geo, parcel/zoning, and owner fields.
- Data quality score meets minimum threshold for underwriting.
- Exception flags are explicit, not implicit.

## Step 3: Owner Research And Skip Tracing

Goal: Build a compliant, confidence-scored contactable owner profile.

Actions:

1. Pull public records (deeds, tax rolls, recorder history).
2. Unwind LLC/entity ownership via secretary-of-state filings.
3. Differentiate mailing address vs property address for absentee-owner signal.
4. Run legal skip tracing for phone/email/mailing contacts.
5. Validate DNC and outreach restrictions before any communication.
6. Calculate contact-confidence score from source overlap.

Decision points:

- If ownership chain is ambiguous, mark as `title_clarification_required`.
- If no compliant contact path exists, keep lead in research state.

Completion checks:

- Ownership path is documented from latest vesting to current contact point.
- Outreach-eligible contacts are tagged with compliance status.
- Contact-confidence score and evidence sources are stored.

## Step 4: Financial Underwriting And Strategy Modeling

Goal: Produce lender-grade underwriting with strategy-ranked recommendations.

### 4.1 Core Valuation Skills

Actions:

1. Estimate ARV via adjusted comp set (3 to 5 comps).
2. Apply comp adjustments for sqft, beds, baths, age, condition, garage, lot.
3. Estimate rehab costs by scope tier (cosmetic/systems/structural).
4. Compute MAO with at least three methods (70% rule, 65% rule, ROI-based).
5. Run 7x7 sensitivity and best/base/worst stress tests.
6. Compute break-even months and downside margin.

Completion checks:

- ARV has documented comp rationale and adjustment trail.
- Rehab estimate includes confidence band.
- MAO includes method-by-method outputs, not one blended number.

### 4.2 24 Strategy Calculators

Model all relevant strategies from these groups:

- Cash Engine: Wholesale Assignment, Wholesale Novation, Wholetail, Land Wholesale
- Creative Finance: Subject-To, Seller Financing, Hybrid (SubTo + Carry), Wraparound
- Value-Add: Fix and Flip, Heavy Rehab/Reposition, Historic/Specialty Flip
- Wealth Hold: Buy and Hold, BRRRR, Mid-Term Rental, Short-Term Rental
- Land: Land Flip Cash, Land Flip Owner Finance, Infill Lot Prep, Subdivision Split
- Commercial: Small Multifamily (2 to 20), Ground-Up Development
- Advanced: Option/Control, Note Buying, Private Lending

Key metrics computed per strategy:

- ROI
- Cap Rate
- NOI
- DSCR
- Cash-on-Cash
- MOIC
- Equity Capture
- Rent-to-Price
- Price per SqFt
- Cash Left In (BRRRR)
- Infinite Return Flag

Risk overlays:

- Title/lien risk
- Condition/systems risk
- Market risk (DOM, reductions, inventory trend)
- Concentration risk (portfolio exposure)
- Overall confidence score (0 to 1)

Decision points:

- If DSCR is below threshold for debt-dependent strategies, deprioritize those paths.
- If title or legal risk is high, block recommendation until cleared.
- If stress-test downside breaches risk tolerance, mark strategy as fail.

Completion checks:

- All passing strategies are included in ranked output.
- One primary recommendation plus fallback notes are documented.
- Assumptions are explicit and traceable.

## Step 5: Quality Gate And Deliverables

Goal: Ensure outputs are trustworthy and ready for downstream workflows.

Required deliverables:

1. Canonical property profile (clean + enriched).
2. Ownership and contact dossier with compliance tags.
3. Underwriting packet with ARV, MAO, rehab, stress tests.
4. Strategy comparison with ranked recommendation and fallback.
5. Risk summary and confidence score.

Final quality checklist:

1. Source attribution exists for all externally-derived fields.
2. No silent nulls in required underwriting inputs.
3. Comp assumptions and adjustment logic are auditable.
4. Compliance blockers are resolved or clearly flagged.
5. Recommendation aligns with constraints (capital, risk, timeline).

## Branching Logic Summary

- Missing data branch: Pause underwriting, return to enrichment queue.
- Ownership ambiguity branch: Pause outreach, continue records research.
- Compliance-fail branch: Continue underwriting analysis, block outreach and escalate.
- Strategy-fail branch: Re-run assumptions or switch exit path.

## Example Prompts

- "Run the intake-to-underwriting workflow for this address and show exceptions first."
- "Take these CSV leads through clean, owner research, and a 24-strategy underwriting screen."
- "Underwrite this deal with ARV/MAO/stress tests and rank top 3 strategies by risk-adjusted return."
- "Build a lender-ready analysis and include why rejected strategies failed."

## Integration Notes

This skill hands off naturally to:

- Outreach and communication sequences after compliance pass.
- Negotiation management once a target offer structure is selected.
- Deal desk contract generation after strategy approval.
- Closing pipeline once contract is accepted.

## Skill Metadata

Created: 2026-06-12
Last Updated: 2026-06-12
Version: 1.0.0
Scope: Workspace (.github/skills)
