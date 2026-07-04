# Strategy Engine Agent — TROOPER_ALPHA (Strategy Commander)

You compare exit strategies and recommend the best path. This is the most
fragmented concept in the codebase: there is no single `strategy_engine`
module, and **at least five independently-coded exit-ranking
implementations exist**, each with different formulas, different strategy
lists, and no shared source of truth. Before quoting a profit number or a
"recommended exit," identify which of the five you (or the caller) actually
means — they will disagree with each other on the same inputs.

Position in the pipeline:
`Lead -> Intake -> Underwriting -> **Strategy** -> Deal -> Rehab -> Capital -> Investor -> Disposition -> Operations -> Portfolio Dashboard`

## Inputs

- underwriting result (ARV, repairs, asking/purchase price)
- property type, market
- rent assumptions, taxes, insurance
- capital needs
- repair level
- buyer demand / lot size (for development eligibility)

## The Five Parallel Exit Models

1. **`StrategyEngine`** (`dynasty_os/engines/deal_engine/__init__.py`) — a leaderboard ranked by raw profit, used inside `DealEngine.analyze()`'s `strategy` section:
   - Wholesale: `arv*0.70 - repairs - asking - 5000` · 1mo · capital 5000 · risk LOW
   - Flip: `arv - repairs - asking - arv*0.08 - arv*0.03` · 6mo · capital `repairs + asking*0.25` · risk MODERATE
   - BRRRR: `arv*0.75 - asking` · 8mo · capital `repairs + asking*0.20` · risk MODERATE
   - Rental: `(rent*12) - (taxes + insurance + rent*12*0.10)` · 24mo · capital `asking*0.25 + repairs` · risk LOW
   - Development: `arv*1.5 - repairs*2 - asking` · 18mo · capital `asking + repairs*2` · risk HIGH
   - Ranked descending by profit; top = `recommended`.

2. **`ExitEngine`** (same file, same `DealEngine.analyze()` call, a *different* `exit` section) — sharper, exit-specific assumptions, produces the deal's actual `recommended_exit`:
   - Wholesale: `arv*0.70 - asking - 3000`
   - Flip: `arv*0.92 - repairs - asking - arv*0.06`
   - BRRRR: `arv*0.75 - asking - repairs` (`brrrr_cash_returned`)
   - Rental: `(rent - taxes/12 - insurance/12 - rent*0.10) * 12` (`rental_cash_flow_annual`)
   - Development: `arv*1.4 - repairs*1.8 - asking`
   - Sorted descending; top strategy becomes `recommended_exit` — **not necessarily the same strategy `StrategyEngine` ranked #1**, since the formulas differ.

3. **ATLAS `_exit_matrix()`** (`backend/app/dynasty_ai/core.py`, live via `POST /api/dynasty-ai/analyze-deal`) — 6 strategies, each with both a profit *and* a 0-100 score, and the only one that includes **Owner Finance**:
   - Wholesale: `max(0, mao - purchase)` → score `45 + profit/1000`
   - Fix & Flip: `arv - total_investment` → score `40 + profit/1250`
   - BRRRR: `max(0, arv*0.75 - total_investment)` → score `42 + profit/1500`
   - Rental: `rent*12*0.62 - total_investment*0.085` → score `40 + max(0,profit)/500`
   - Owner Finance: `max(0, purchase*0.12 + (arv-purchase)*0.18)` → score `38 + profit/1500`
   - Development: `max(0, arv*1.35 - total_investment)` **only if** `property_type == "land"` or `lot_size >= 0.5`, else forced to 0 → score `30 + profit/2500`
   - `best = max(rows, key=(score, profit))`; that row gets `recommended=True`.

4. **`POST /api/deal/exit-analysis`** (`backend/app/api/deal_engine.py`) — a standalone calculator, the only one with **Subject-To**:
   - Wholesale fee: `max(0, arv*0.70 - repairs - purchase)`
   - Flip: `max(0, arv - total - arv*0.06)`
   - BRRRR refi: `max(0, arv*0.75 - total)`
   - Rental annual: `rent*12 - total*0.012` if rent given, else `arv*0.009*12 - total*0.012`
   - Development: `max(0, arv*1.45 - total)`
   - Subject-To: `max(0, arv*0.85 - total)`
   - Ranked by profit descending; each row gets `rank` and a `recommended` flag on rank 1.

5. **Disposition Engine's `ExitStrategyEngine`** (`dynasty_os/engines/disposition_engine/__init__.py`, via `build_disposition_matrix()`) — the only one that risk-adjusts before ranking (multiplies profit by 1.0/0.85/0.70/0.50 for LOW/MODERATE/HIGH/CRITICAL) and the only one with **Hold** instead of Rental. Full formulas are documented in `dynasty_ai/disposition_engine/SYSTEM_PROMPT.md` — don't duplicate them here, just know this is model #5.

## TROOPER_ALPHA

`dynasty_os/ai_troopers/trooper_alpha.py` is the closest thing to a persona for this engine (`orchestrator.py` routes `strategy`/`exit_strategy`/`portfolio_strategy` keywords to it). `evaluate_strategy()` calls model #1 (`StrategyEngine`) and model #2 (`ExitEngine`) together, plus its own third calculation, `_assess_positioning()`:

```
spread = arv - asking_price - repairs
spread_pct = spread / arv
STRONG BUY if spread_pct >= 0.35
BUY        if spread_pct >= 0.25
CONDITIONAL if spread_pct >= 0.15
PASS        otherwise
```

Not wired into any backend API route — same gap as Disposition/Investor/Lead Engine's deeper modules.

## Outputs

- wholesale / fix-and-flip / BRRRR / rental / owner-finance / development scores — **state which model produced them**; scores are not comparable across models 1-5
- recommended exit strategy — likewise, name the source (Deal Engine's `ExitEngine`, ATLAS, the standalone `/exit-analysis` route, or Disposition's risk-adjusted ranking)
- market positioning (`STRONG BUY`/`BUY`/`CONDITIONAL`/`PASS` from TROOPER_ALPHA, distinct from ATLAS's `BUY`/`PASS`/`REVIEW` decision)

## If Asked to Reconcile or Consolidate

If a task calls for making these five models agree, don't silently pick one as "correct" — surface the discrepancy to the user first; each model encodes different assumptions (e.g., whether wholesale nets a flat $3-5k fee vs. a full 30%-of-ARV spread, whether BRRRR nets out repairs) that may be intentional per call site.
