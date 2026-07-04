# Portfolio Dashboard Agent

You turn completed activity across every engine into performance
intelligence: a single command-center view of leads, deals, capital,
operations, disposition, and investors, plus a rolled-up portfolio health
score. Read this file's "What's Actually Implemented" section carefully —
the real dashboard users see today runs on a completely different stack
than the Python engine of the same name.

Position in the pipeline:
`Lead -> Intake -> Underwriting -> Strategy -> Deal -> Rehab -> Capital -> Investor -> Disposition -> Operations -> **Portfolio Dashboard**`

## Inputs

- closed deals, failed offers, wholesale assignments, flips, BRRRRs, rentals
- capital outcomes (available/committed/deployed/returned)
- lead pipeline counts by status/type
- project budget and completion stats
- disposition/closing outcomes

## What's Actually Implemented

**Two unrelated implementations exist — know which one you're talking about:**

1. **`CommandCenterDashboard`** (`dynasty_os/command_center/dashboard.py`) — a standalone Python class, **not wired into any backend API route** (no FastAPI router imports or exposes it anywhere). Only `get_lead_status()` actually branches on an injected `db_client` (calling a `.count(table, filters)` method that doesn't match the real Supabase client's query interface — this path has never been connected to production data). Every other section getter (`get_deal_status`, `get_capital_status`, `get_operations_status`, `get_disposition_status`, `get_investor_status`) unconditionally returns hardcoded zero placeholders regardless of `db_client`. `get_full_dashboard()` assembles all six sections plus a `_compute_health_score()` (100 minus fixed penalties for zero new leads today, kill-deals outnumbering go-deals 2:1, zero dry powder, or >30% of projects behind schedule) and a `_health_label()` (EXCELLENT ≥85, GOOD ≥70, NEEDS_ATTENTION ≥50, else CRITICAL). Treat this whole module as **scaffolding, not a live data source.**
2. **The actual live dashboard** is `frontend/app/command-center/page.tsx` — a Next.js server component that queries Prisma directly (`property`, `lead`, `deal`, `investor`, `project`, `disposition`, `capitalTransaction`, all scoped to the session user) and computes every aggregate in TypeScript at request time: available/committed/deployed/returned capital and dry powder, qualified/seller/buyer/investor lead counts, pipeline value and approved/killed deal counts, active-project and budget-variance stats, for-sale/pending-closing/capital-recovered/profit stats, active-investor count, and total portfolio value from property `currentValue`/`purchasePrice`. It passes all of this as props into `CommandCenterClient` (`frontend/components/dynasty/command-center-client.tsx`). **No Python engine, no FastAPI route, and no `dynasty_os` module is involved in what a user actually sees at `/command-center`.**

`dynasty_os/analytics_os/__init__.py` is a one-line docstring stub ("market intelligence, portfolio analytics, KPI dashboards") — same aspirational-placeholder pattern as `investor_os`, with no implementation behind it.

## Outputs

- buy-box learning — not implemented anywhere yet (no code computes actual-vs-projected buy-box drift)
- market performance — not implemented (no `dynasty_os` module or API route produces this)
- actual-vs-projected accuracy — not implemented
- Dynasty Fit tuning signals — not implemented; ATLAS's `dynasty_fit_score` (in `backend/app/dynasty_ai/core.py`) is computed per-deal at analysis time, not fed back from closed-deal outcomes
- executive dashboard insights — this is the one output that **is** live today, via the TypeScript command-center page described above: capital position, lead funnel, deal pipeline value, project budget variance, disposition/profit totals, and total portfolio value

## If Asked to Extend This

Prefer extending `frontend/app/command-center/page.tsx` (the real, live path) over `dynasty_os/command_center/dashboard.py` (unwired scaffolding) unless the task is specifically to wire the Python engine into a new FastAPI route. Don't assume `CommandCenterDashboard`'s hardcoded zero-stubs reflect current portfolio state — they don't reflect anything; they're placeholders that were never connected to a database.
