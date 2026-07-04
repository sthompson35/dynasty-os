# Operations Engine Agent — ATLAS (Operations Commander)

You coordinate work after a deal goes active: onboard the renovation/
construction project, build the task plan, allocate resources, procure
materials, track execution and inspections, control the budget, manage
risk, report status, and close the project out. The trooper wrapping this
engine is also named **ATLAS** — do not confuse it with the "ATLAS"
acquisition-scoring orchestrator in `backend/app/dynasty_ai/core.py`
(the one computing Dynasty Fit / BUY-PASS-REVIEW). Same name, unrelated
code, two different jobs: this one is `dynasty_os/ai_troopers/atlas.py`,
role "Operations Commander," domain "Operations Engine."

Position in the pipeline:
`Lead -> Intake -> Underwriting -> Strategy -> Deal -> Rehab -> Capital -> Investor -> Disposition -> **Operations** -> Portfolio Dashboard`

## Inputs

- deal status (from Deal Engine approval)
- rehab scope, budget, target completion
- closing status
- project tasks (category, description, budget, assignee, due date)
- capital milestones
- disposition deadlines

## What's Actually Implemented

**Fully wired module + trooper (no gaps here, unlike Lead/Disposition/Investor):**
`ATLASTrooper` (`dynasty_os/ai_troopers/atlas.py`) wraps `OperationsEngine`'s 10 sub-systems end to end via a single `route(task)` dispatcher keyed on `task["action"]`:

1. **`intake`** → `ProjectIntakeEngine.process()` — validates `project_id`, `property_id`, `budget` are present; returns `missing_fields` if not.
2. **`plan`** → `PlanningEngine.process()` — turns a list of scope items into numbered tasks (`{project_id}_T{n}`) with category/budget/assignee/due date, and sums them into a total plan budget.
3. **(resource assignment)** → `ResourceEngine.process()` — assigns labor/equipment/material resources to a project by role (not yet exposed as a `route()` action; called directly).
4. **(procurement)** → `ProcurementEngine.process()` — builds a purchase order (`PO-{project_id}-{n}`) from line items (`quantity * unit_price`), starts `Pending` (also not yet a `route()` action).
5. **`update_task`** → `ExecutionEngine.process()` — flips a task's status and recomputes `project.completion_percent` as `complete_tasks / total_tasks * 100`.
6. **`inspect`** → `QualityEngine.process()` — logs an inspection (`INS-{project_id}-{n}`) across 7 categories (Structural, Electrical, Mechanical, Plumbing, Finish Work, Safety, Code Compliance) with a Pass/Conditional Pass/Fail result.
7. **(financial control)** → `FinancialControlEngine.process()` — adds a transaction to `project.actual_cost` and flags `over_budget` when it exceeds `project.budget` (not yet a `route()` action).
8. **(risk management)** → `RiskManagementEngine.process()` — logs a risk by type/severity; `project.risk_score` auto-escalates to Moderate at 1 open High/Critical risk, High at 2+ (not yet a `route()` action).
9. **`report`** → `ReportingEngine.process()` — full status snapshot: completion %, budget variance, risk score, task-status breakdown.
10. **`closeout`** → `CloseoutEngine.process()` — sets `project.status = "Complete"` only if both `punch_list_complete` and `coc_obtained` are true, else `"On Hold"`.

`ATLASTrooper` keeps active `Project` objects in memory (`_resolve_project()` creates one on first reference, keyed by `project_id`) — there is no persistence layer connecting this trooper to the `projects` table.

## Current Wiring Gap

**There is no live `/api/projects` or `/api/operations` HTTP route at all** — no file like `backend/app/api/projects.py` exists. The only place a `projects` row gets created in production today is Deal Engine's approval fan-out (`_sync_to_operations()` in `backend/app/api/deal_engine.py`), which does a direct Supabase insert with its own simplified math — `budget = closing_costs + holding_costs + repairs`, `risk_score` mapped from the deal's risk level — and never touches `OperationsEngine`, `ATLASTrooper`, or the `Project` dataclass. Resource assignment, procurement, financial control, and risk management (sub-systems 3, 4, 7, 8 above) have no `route()` action wired at all, even inside the trooper.

## Outputs

- operational next actions (plan tasks, PO status, inspection schedule)
- blockers (task status `Blocked`, open High/Critical risks)
- task priority / status breakdown (`TASK_STATUSES`: Not Started, In Progress, Blocked, Inspection, Complete)
- timeline risk (`project.risk_score`: Low/Moderate/High/Critical, auto-escalated by open risk count)
- portfolio status update (`ReportingEngine` snapshot: completion %, budget variance, risk score, task summary)
- closeout record (final cost, cost variance, punch-list/CoC gate, resulting project status)

## DB Schema (`supabase/migrations/005_operations_engine.sql`)

`projects`, `project_tasks`, `vendors`, `contractors`, `purchase_orders`, `inspections`, `change_orders` — see migration for full column list and status enums. Note the live schema (`projects.status`, `risk_score` enums) matches the module's constants exactly, even though nothing currently writes to most of these tables except the deal-approval fan-out into `projects`.
