# Disposition Engine Agent

You select and execute the best exit path for a property after Strategy
scoring: rank exit strategies, match buyers, price the listing, run the
marketing campaign, negotiate offers, close the transaction, and distribute
investor proceeds. You are deterministic-first — every score and price comes
from a fixed formula, not model judgment. No dedicated AI-trooper persona
wraps this engine yet (unlike Deal Engine's TROOPER_CHARLIE); it runs as
plain orchestration logic.

Position in the pipeline:
`Lead -> Intake -> Underwriting -> Strategy -> Deal -> Rehab -> Capital -> Investor -> **Disposition** -> Operations -> Portfolio Dashboard`

## Inputs

- recommended exit (from Deal/Strategy Engine)
- ARV, asking price, repairs, rent, taxes, insurance
- buyer demand / buyer registry (type, funding capacity, price band, close speed)
- property package (marketing channels + assets)
- target assignment: Wholesale, Flip, BRRRR, Hold, or Development

## The 10 Sub-Systems

*(implemented in `dynasty_os/engines/disposition_engine`; not yet wired into the live API — see "Current Wiring" below)*

1. **Exit Strategy** — builds a `DispositionMatrix` for 5 exits (Wholesale, Flip, BRRRR, Hold, Development), each with `estimated_profit`, a fixed `timeline_days`, a risk tier, and a risk multiplier (LOW `1.0`, MODERATE `0.85`, HIGH `0.70`, CRITICAL `0.50`) applied to get `risk_adjusted_return`. Ranks by that adjusted return; the top strategy is `recommended`.
2. **Buyer** — matches registered buyers where `min_price <= asking_price <= max_price` and `funding_capacity >= asking_price`, sorted by `buyer_score` descending.
3. **Marketing** — launches a campaign across up to 10 channels (MLS, Zillow, BiggerPockets, Facebook Marketplace, Instagram, Email Blast, Direct Mail, Bandit Signs, Text Blast, Investor Network); tracks `views`/`inquiries` and campaign status (Draft/Active/Paused/Complete).
4. **Pricing** — generates 5 price tiers off ARV: Aggressive `arv*0.95`, Market `arv*0.90`, Quick Sale `arv*0.85`, Wholesale `arv*0.70 - repairs - 5000`, Investor `arv*0.75 - repairs`.
5. **Transaction** — submits offers (`Pending`), then actions them (`Countered`/`Accepted`/`Rejected`/`Expired`), tracking counter-price when countered.
6. **Investor Exit** — splits net profit on close: preferred return `= invested_amount * preferred_return` (default 8%) paid first, then 70% of remaining profit to the investor, 30% retained.
7. **Rental Conversion** — evaluates converting a flip/wholesale candidate to a hold: `NOI = rent*12 - ((taxes/12 + insurance/12 + rent*management_rate)*12)`, `cap_rate = NOI/ARV`; recommends hold when `cap_rate >= 0.06`.
8. **Performance Analytics** — tracks days-on-market, price-reduction $ and %, and exit strategy per closed property; rolls up averages across all recorded sales.
9. **Capital Recovery** — `net_proceeds = sale_price - closing_costs - agent_fees`; `net_profit = net_proceeds - total_invested`; `roi = net_profit / total_invested`.
10. **Portfolio Optimization** — scores HOLD vs SELL 0-8 across 4 signals (appreciation `>0.05`, rental demand `High`, cap rate `>0.07`, positive cash flow — each worth 2 points); `HOLD` at score `>=5`, else `SELL`.

## Outputs

- disposition score / risk-adjusted return ranking across the 5 exits
- buyer assignment (matched buyer pool, sorted by buyer score)
- marketing package tasks (channels, assets, campaign status)
- pricing posture (5-tier price ladder)
- send / hold / revise recommendation on each offer
- investor distribution breakdown on close
- hold-vs-sell portfolio recommendation

## Current Wiring (as implemented)

The live `/api/disposition` routes (`backend/app/api/disposition.py`) are
direct Supabase CRUD, not yet routed through the 10-subsystem
`DispositionEngine` module:

- `GET/POST /api/disposition/buyers`, `GET /api/disposition/buyers/{id}` — buyer registry, sorted by `buyer_score`
- `GET/POST /api/disposition/offers`, `PUT /api/disposition/offers/{id}` — offer intake and status transitions (`Pending/Countered/Accepted/Rejected/Expired`)
- `GET/POST /api/disposition/closings` — records a closed sale and flips `properties.status` to `sold`
- `GET /api/disposition/profit` — portfolio-level net profit, capital recovered, revenue, and offer-conversion rate, optionally filtered by year

The exit-ranking, pricing-tier, rental-conversion, and portfolio-optimization
math above exists and is unit-testable in `dynasty_os/engines/disposition_engine`,
but a caller must invoke it directly (e.g. from a trooper or a future
`/analyze` route) — the current API does not call it automatically the way
Deal Engine's `/analyze` calls `TrooperCharlie`.

## DB Schema (`supabase/migrations/006_disposition_engine.sql`)

`buyers`, `buyer_criteria`, `property_marketing`, `offers`, `contracts`, `closings` — see migration for full column list and status enums.
