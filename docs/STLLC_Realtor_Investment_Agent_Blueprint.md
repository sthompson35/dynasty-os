# Realtor + Investment Agent Development Blueprint

## Executive Assessment

The uploaded system is viable as a real estate acquisition and investment-agent platform, but it is not production-ready yet. The strongest assets are the underwriting calculators, multi-bot architecture, SQLAlchemy models, web UI templates, Excel analyzers, land-flip operating system, and governance framework. The weakest areas are missing live data integrations, empty contract/script/governance templates, broken spreadsheet formulas in the land workbook, dependency/setup gaps, and synthetic listing generation inside Web Scout.

## File Inventory Reviewed

### realtor_agent.zip
Core application skeleton with:
- Python package: `realtor_agent/`
- Multi-bot framework: Web Scout, Data Clean, Underwriter, Owner Finder, Outreach, Negotiator, Deal Desk, Compliance QA, Closer
- SQLAlchemy data models for users, deal intakes, underwriting results, rehab scopes, closed deals, leads, contacts, documents, outreach logs, and bot runs
- Web UI templates and static assets
- PHP bridge layer
- Infrastructure: Docker, database schema, environments, monitoring, security config
- Excel toolkit folder
- Governance folder
- Automation/webhook folder
- Tests

### LandOSSuperCharged.zip
Workbook system:
- Command Center
- Land Deal Analyzer 2.0
- Buyer Database
- Quick Entry
- Due Diligence Scorecard
- Mail Campaign Engine
- Property Pipeline
- Note Manager
- Investment Dashboard
- State & County Hub
- Contact Database
- Formula Reference
- Monthly Goals
- VBA macro text

### REAL ESTATE SUPERCHARGED.zip
Workbook system:
- Real Estate Command Center
- Dashboard
- Property Database with Desloge/St. Francois County property records
- Deal Analyzer
- Rental Analyzer
- Lead Tracker
- Marketing Campaigns
- Buyer Database
- Active Deals
- Monthly P&L
- Quick Entry
- User manual, cheat sheet, macro code

## Current System Strengths

1. Multi-agent architecture already exists.
2. Underwriting modules already include wholesale, flip, BRRRR, rental, creative finance, land, lending, wholetail, and novation logic.
3. Database models cover the right operating concepts: deals, leads, owners, documents, bot runs, underwriting, rehab scopes, and closed deals.
4. Excel systems already support land, residential, rental, marketing, lead tracking, buyer database, and portfolio analytics.
5. Web UI already has templates for dashboard, deals, financials, analytics, contacts, market, executive summary, draw schedule, and bot activity.
6. Governance intent exists: fair housing, outreach compliance, attorney review, audit, RBAC, encryption, and two-factor modules.

## Current System Gaps

1. Web Scout currently generates synthetic listings. It must be upgraded into a live-source ingestion layer using permitted APIs, CSV imports, public records downloads, PropWire exports, MLS/comps uploads, county GIS, and user-uploaded spreadsheets.
2. Several folders contain empty templates:
   - Contract templates
   - Outreach scripts
   - Negotiation playbooks
   - Public-record source lists
   - Risk-flag references
   - Governance files
   - Market-data CSVs
3. Test suite does not run in the current sandbox because required dependencies such as `structlog` are not installed. This is a setup issue, not necessarily a code-failure verdict.
4. Land workbook contains `#NAME?` formula errors in command/dashboard KPI cells. These likely come from formulas/macros/functions not supported in the workbook runtime or missing named ranges.
5. Workbook logic and Python underwriting logic are not yet fully synchronized through one canonical field map.
6. There is no confirmed production API boundary for:
   - lead ingestion
   - deal underwriting
   - document storage
   - packet export
   - buyer matching
   - outbound communication
   - compliance approval
7. The system needs Missouri-first market intelligence because the uploaded property database is centered around Desloge / St. Francois County and the user’s operating market is Missouri.

## Target Product

Build one complete operating platform:

**STLLC Realtor + Investment Agent**

A multi-agent real estate acquisition, underwriting, CRM, compliance, document, and investment-decision system that can evaluate wholesale, flip, BRRRR, buy-and-hold, land flip, land note, development, seller-finance, subject-to, and novation opportunities.

## Agent Roster

### 1. Web Scout
Purpose: Find and ingest leads.
Inputs:
- PropWire exports
- County GIS / assessor exports
- Zillow/Realtor/Homes.com manual exports or permitted feeds
- Land.com / DiscountLots / Craigslist permitted/manual imports
- Direct mail lists
- Driving-for-dollars uploads
- User-entered leads

Outputs:
- Raw lead records
- Source URL
- Property identity
- APN / parcel ID when available
- Initial asking price
- Preliminary asset type

Production upgrade:
Replace synthetic lead generation with import adapters and source-specific ingestion modules.

### 2. Data Clean
Purpose: Normalize and enrich data.
Tasks:
- Deduplicate by address/APN
- Normalize address/city/state/ZIP/county
- Attach owner profile
- Parse property type, beds, baths, sqft, lot size
- Identify vacant/distress indicators
- Validate missing fields

Outputs:
- Clean property profile
- Owner/contact profile
- Data confidence score

### 3. Market Intel
Purpose: Build comp/rent/market context.
Tasks:
- Sales comp import
- Rent comp import
- ARV confidence scoring
- DOM trend tracking
- Missouri county scoring
- Flood, zoning, road access, utility, and buildability signals for land

Outputs:
- ARV range
- Rent range
- Market risk score
- Comp pack

### 4. Underwriter
Purpose: Run every eligible strategy.
Strategies:
- Wholesale assignment
- Fix-and-flip
- Wholetail
- BRRRR
- Rental / buy-and-hold
- Seller finance
- Subject-to
- Lease option
- Novation
- Multifamily
- Land wholesale
- Land cash flip
- Land terms/note
- Subdivision/development

Outputs:
- MAO by strategy
- Project profit
- ROI
- cash required
- DSCR
- CoC return
- cap rate
- refinance viability
- lender-ready draw schedule
- kill-switch flags

### 5. Risk Engine
Purpose: Kill bad deals early.
Hard stops:
- Negative NOI without credible exit plan
- DSCR under minimum threshold without mitigation
- No road access on land
- Not buildable land when buildability is required
- Flood zone AE/VE without proper discount/insurance strategy
- Title/liens/tax issues unresolved
- Wholesale fee below minimum
- Flip ROI below required floor
- Missing exit strategy

Outputs:
- GO / NO-GO / RENEGOTIATE / KILL
- Required mitigation steps
- Decision memo

### 6. Buyer Match
Purpose: Match deals to cash buyers/investors.
Inputs:
- Buyer database
- Asset preference
- target counties
- minimum ROI
- max price
- financing capability
- past performance

Outputs:
- top buyers
- expected assignment spread
- buyer confidence score

### 7. Outreach Agent
Purpose: Run compliant communication sequences.
Channels:
- call
- SMS
- email
- direct mail
- follow-up task queue

Rules:
- Respect DNC and consent flags.
- Use no misleading licensed-agent language unless properly licensed.
- Flag legal review when required.
- Avoid fair-housing violations.

Outputs:
- scripts
- follow-up schedule
- contact log
- response classification

### 8. Negotiator
Purpose: Structure offers and counteroffers.
Functions:
- Anchor offer
- Seller motivation mapping
- concession ladder
- creative-finance term design
- BATNA calculation
- walk-away point

Outputs:
- offer strategy
- seller script
- counteroffer plan
- renegotiation memo

### 9. Deal Desk
Purpose: Generate packets and document workflows.
Documents:
- offer summary
- purchase agreement checklist
- seller-finance term sheet
- subject-to checklist
- lease-option checklist
- assignment packet
- lender packet
- investor packet
- rehab scope
- draw schedule
- comp packet
- photo/bid attachment index

Rules:
- Contract templates must be treated as drafts requiring attorney review.

### 10. Compliance QA
Purpose: Stop legal/compliance problems before outreach or contract use.
Checks:
- fair housing
- spam/TCPA/CAN-SPAM
- unauthorized legal advice
- licensing language
- source terms of use
- document attorney-review flag
- privacy and data retention

Outputs:
- pass/fail
- required edits
- legal-review required flag

### 11. Portfolio CFO
Purpose: Track closed deals and capital performance.
Metrics:
- capital deployed
- realized profit
- projected equity
- cash-on-cash
- ROI
- IRR when timeline data exists
- lender exposure
- buyer concentration
- monthly P&L

Outputs:
- dashboard
- investor/lender report
- closed deal archive

## Canonical Workflow

1. Lead enters system.
2. Data Clean normalizes and enriches.
3. Market Intel builds comps and rent context.
4. Underwriter runs all viable strategies.
5. Risk Engine determines GO / NO-GO / RENEGOTIATE / KILL.
6. Buyer Match estimates exit confidence.
7. Orchestrator ranks lead priority.
8. Outreach Agent prepares compliant seller contact.
9. Negotiator structures offer.
10. Deal Desk generates packet.
11. Compliance QA approves/rejects packet.
12. Human approves final action.
13. Deal moves into active pipeline.
14. Portfolio CFO tracks closed result.

## Priority Build Roadmap

### Phase 1 — Stabilize the Existing App
- Install dependencies with locked environment.
- Run test suite.
- Fix import/runtime errors.
- Add `.env.example` completion.
- Remove duplicate `.claude/worktrees` content from deployable build.
- Repair broken workbook formulas or replace them with Python/API-computed KPI endpoints.
- Populate empty governance/script/template files.

### Phase 2 — Build the Unified Database
Unify around these tables:
- users
- properties
- owners
- leads
- deal_intakes
- comps
- rent_comps
- underwriting_results
- risk_flags
- outreach_events
- offers
- buyers
- documents
- rehab_scopes
- draw_schedules
- closed_deals
- bot_runs
- audit_logs

### Phase 3 — Create Live Ingestion
Build importers for:
- PropWire CSV
- assessor/GIS CSV
- property database workbook
- buyer database workbook
- land workbook pipeline
- manual quick-entry form
- uploaded photos/bids/scopes

### Phase 4 — Wire Investment Logic
Use Python underwriting as the source of truth, then push outputs to:
- web dashboard
- Excel exports
- PDF/lender packets
- investor read-only packet
- closed-deal archive

### Phase 5 — Build UI Modules
Required screens:
- Command Center
- Lead Inbox
- Deal Analyzer
- Property Detail
- Underwriting Matrix
- Risk Engine
- Buyer Match
- Outreach Queue
- Negotiation Desk
- Documents/Packet Builder
- Portfolio Dashboard
- Admin/Compliance

### Phase 6 — Production Hardening
- RBAC
- audit logs
- file storage
- encrypted sensitive fields
- rate limiting
- backup strategy
- error monitoring
- compliance approvals
- source terms controls

## First Development Sprint

### Sprint Goal
Convert the current skeleton into a working Missouri-first investment agent MVP.

### Sprint Deliverables
1. Working local app startup.
2. Unified database migration.
3. PropWire/CSV import endpoint.
4. Deal intake form.
5. Underwriting matrix endpoint.
6. GO / NO-GO / RENEGOTIATE / KILL decision engine.
7. Buyer database import.
8. PDF packet placeholder with deal summary.
9. Compliance checklist gate.
10. Dashboard metrics with no `#NAME?` dependency.

### Acceptance Criteria
- A new property lead can be entered or imported.
- The system normalizes the property.
- The system runs wholesale, flip, rental, BRRRR, and land logic when applicable.
- The system generates MAO, ROI, profit, cash required, DSCR, risk flags, and decision status.
- The lead can be moved through pipeline statuses.
- The user can export a basic investor/lender packet.
- Compliance review is required before outreach or contract use.

## Investment Decision Rules

Default thresholds:
- Wholesale minimum fee: $15,000
- Flip minimum ROI: 20%
- Target flip ROI: 25%+
- Rental DSCR floor: 1.25 preferred
- Rental CoC target: 8%–10%+
- Land cash flip minimum ROI: 20%
- Seller-finance/terms deal must show positive yield and buyer exit logic
- Any strategy with weak comps must be marked `RENEGOTIATE` or `MORE_DD_REQUIRED`

## Missouri-First Operating Mode

Default geography:
- St. Louis area
- Desloge
- St. Francois County
- surrounding Missouri counties

Local intelligence required:
- assessor/GIS links by county
- permit/zoning contacts
- flood-zone workflow
- rent-comp source list
- investor buyer list
- contractor pricing table
- title company contacts
- lender packet standards

## Bottom Line

The uploaded files give us 60% of the bones and 25% of the production-grade muscle. The right move is not to rebuild from scratch. The right move is to consolidate, stabilize, wire live data, replace placeholders, and make Python underwriting the single source of truth while Excel/PDF/web become outputs.
