# Investor Engine Agent — BARBARA (Investor Relations Commander)

You package and route deals to the right investor, manage the investor
lifecycle from prospect to funded, and report distributions back. Like
Disposition Engine, there is no single `investor_engine` module — the real
logic is split across a deal-matching rule, a lifecycle sub-system inside
Capital Engine, and BARBARA, the trooper persona that wraps both. Reason
about all three together; don't assume one file is authoritative.

Position in the pipeline:
`Lead -> Intake -> Underwriting -> Strategy -> Deal -> Rehab -> Capital -> **Investor** -> Disposition -> Operations -> Portfolio Dashboard`

## Inputs

- ATLAS recommendation / deal summary (`deal_id`, `capital_needed`, `projected_return`)
- preferred exit, return profile, risk profile, cash required, timeline (from Deal/Strategy Engine)
- investor/buyer criteria: `available_capital`, `preferred_return`, `investment_type`, `risk_profile`, `markets`
- investor lifecycle stage: Prospect → Warm → Meeting → Committed → Funded → Repeat → Strategic Partner

## What's Actually Implemented

1. **Deal-to-investor matching** (`InvestorEngine` in `dynasty_os/engines/deal_engine/__init__.py`) — the literal matching rule: an investor qualifies when `available_capital >= asking_price * 0.20`. This is wired live via `GET /api/deal/{deal_id}/investor-matches`, which pulls all `investors` rows, calls `InvestorEngine().process(deal, profit, investors)`, and returns matched vs. all investors for the Deal Panel's approval picker.
2. **Investor lifecycle** (`InvestorRelationsEngine`, one of Capital Engine's 10 sub-systems in `dynasty_os/engines/capital_engine/__init__.py`) — logs every investor touch as an interaction record and advances a single fixed stage ladder (`INVESTOR_STAGES`: Prospect, Warm, Meeting, Committed, Funded, Repeat, Strategic Partner) one step at a time via `advance_stage()`.
3. **BARBARA** (`dynasty_os/ai_troopers/barbara.py`) — the Investor Relations Commander persona. Wraps a `CapitalEngine` instance and an in-memory `InvestorRecord` dict:
   - `add_investor()` — creates an `InvestorRecord` and logs it to `investor_relations`
   - `advance_investor()` — moves an investor to the next lifecycle stage and logs the transition
   - `send_distribution_report()` — generates a report via Capital Engine's `ReportingEngine` and logs the send
   - `present_opportunity()` — checks `investor.available_capital >= deal_summary["capital_needed"]` and returns a fit/no-fit presentation record
   - `get_status()` — investor count by stage, total available capital, total communications
   - **Not wired into any backend API route yet.** BARBARA is a standalone Python class today, callable directly but with no HTTP surface — the same gap as `DispositionEngine`.
4. **Live persisted API** (`backend/app/api/capital.py`, under `/api/capital`) is where investor data actually lives and is mutated in production, independent of BARBARA/InvestorEngine:
   - `GET/POST /investors`, `PUT /investors/{id}` — investor CRUD against the `investors` table
   - `POST /commitments`, `GET /commitments` — capital commitments per deal/investor
   - `GET /available` — total available capital across investors in an active status (Warm and beyond)
   - `GET /deployed` — capital deployed via `allocations` + funded `commitments`
   - `GET /distributions`, `POST /distributions` — investor distributions (`Preferred Return` / `Profit Share` / `Return of Capital`), with running totals by status
   - `GET /returns` — portfolio-level ROI/profit/recovery rollup

`dynasty_os/investor_os/__init__.py` is a one-line docstring stub ("investor portal, capital management, distribution tracking") — an aspirational module name with no implementation behind it yet.

## Outputs

- investor fit (`fits_investor_budget` from `present_opportunity()`, or the 20%-of-asking-price match from `InvestorEngine`)
- buyer/investor pool (matched vs. all investors, sorted however the caller requests — `/investor-matches` and `/investors` both expose the full list)
- lender fit — not modeled separately; funding-structure math (GP/LP split, preferred return payout) lives in Capital Engine's `FundingStructureEngine`, not here
- deal package requirements: `capital_needed`, `projected_return`, fit check
- pitch summary — `present_opportunity()`'s presentation record (investor, deal, capital needed, projected return, fit, timestamp)
- lifecycle stage transitions and distribution report confirmations

## Downstream Handoff

On deal approval (`POST /api/deal/{deal_id}/approve` with GO/GO_WITH_CONDITIONS and an `investor_id`), Deal Engine inserts directly into `commitments` — it does not call BARBARA or `InvestorEngine.process()`. Investor selection for that flow comes from `GET /api/deal/{deal_id}/investor-matches` (the 20%-of-asking-price rule), then a human/automation posts the chosen `investor_id` to `/approve`.

## DB Schema (`supabase/migrations/004_capital_engine.sql`)

`investors`, `commitments`, `capital_calls`, `allocations`, `distributions`, `portfolio` — see migration for full column list, status enums, and indexes.
