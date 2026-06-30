# Dynasty OS n8n V3 Production SOP

## Production Targets

- GitHub source: `sthompson35/dynasty-os`
- Railway API: `https://dynasty-os-production.up.railway.app`
- Workflow file: `n8n/dynasty-os-v3-workflow.json`
- Validation command: `python scripts/validate_n8n_v3_production.py`

## Current Validation

The workflow JSON is valid and contains:

- 104 nodes
- 94 connection groups
- 8 production webhooks
- 33 HTTP/tool HTTP nodes

The workflow default API URL has been updated from local development to Railway production:

```text
https://dynasty-os-production.up.railway.app
```

n8n may still override this with the variable:

```text
dynastyApiUrl
```

Set that variable to the same Railway URL in the n8n environment.

## Webhook Contracts

All webhook paths are relative to the n8n webhook base URL, not Railway. Railway is the downstream API called by the workflow.

| Webhook | Method | Path | Required Payload |
|---|---:|---|---|
| Chat | POST | `/webhook/dynasty-chat` | `message` or chat input, optional `sessionId` |
| Deal Intake | POST | `/webhook/dynasty-deal-intake` | `address`, `purchase_price`, `repair_budget`, `arv` |
| Hot Lead | POST | `/webhook/dynasty-hot-lead` | `lead_id` |
| Deal Status | POST | `/webhook/dynasty-deal-status` | `deal_id`, `status` |
| Capital Gap | POST | `/webhook/dynasty-capital-gap` | `deal_id`, `gap_amount` |
| Draw Request | POST | `/webhook/dynasty-draw-request` | `deal_id`, `draw_amount`, `milestone` |
| Project Delay | POST | `/webhook/dynasty-atlas-delay` | `deal_id`, `days_delayed` or `delay_reason` |
| Investor Package | POST | `/webhook/dynasty-investor-package` | `deal_id` or `deal_name` |

### Deal Intake Payload

```json
{
  "address": "500 Test St",
  "purchase_price": 100000,
  "repair_budget": 25000,
  "arv": 180000,
  "closing_costs": 5000,
  "holding_costs": 3000,
  "selling_costs": 8000
}
```

### Deal Status Payload

Allowed status values:

```text
approved
capital_gap
delayed
investor_interest
```

Example:

```json
{
  "deal_id": "224f831f-a4c4-48c4-b84c-3c0df29662ee",
  "status": "capital_gap",
  "notes": "Needs additional funding review"
}
```

### Draw Request Payload

```json
{
  "deal_id": "224f831f-a4c4-48c4-b84c-3c0df29662ee",
  "draw_amount": 15000,
  "milestone": "Rough-in complete"
}
```

## Railway API Contracts Tested

The validation script currently tests:

- `GET /health`
- `GET /api/leads/stats`
- `GET /api/capital/available`
- `GET /api/capital/deployed`
- `GET /api/capital/investors`
- `GET /api/disposition/profit`
- `GET /api/deal/{deal_id}`
- `GET /api/leads/{lead_id}`
- `POST /api/investor/flip-analysis`
- `POST /api/land-build/offer-calculation`
- `POST /api/deal/approve`
- `POST /api/automation/log`

Current result:

```text
failed_tests: []
```

## Fallback And Alert Standard

Every production automation must do at least one of these when a downstream route fails:

- Return a controlled webhook response instead of timing out.
- Write to `POST /api/automation/log`.
- Send a Slack/email alert through the configured n8n channel.
- Use an AI fallback message when OpenAI/ATLAS generation is unavailable.

The V3 workflow already includes fallback patterns for:

- Daily Brief
- Capital Gap
- Project Delay
- Investor Package
- Deal Intake API-down response

LangChain tool nodes intentionally do not hide failures with `continueOnFail`; ATLAS should surface tool failures rather than silently inventing answers.

## Operating Procedure

1. Validate workflow JSON:

```powershell
python scripts/validate_n8n_v3_production.py
```

2. Confirm Railway is online:

```powershell
railway status
```

3. Confirm live API health:

```text
https://dynasty-os-production.up.railway.app/health
```

4. Import or update the n8n workflow from:

```text
n8n/dynasty-os-v3-workflow.json
```

5. Set n8n variable:

```text
dynastyApiUrl=https://dynasty-os-production.up.railway.app
```

6. Activate the workflow in n8n.

7. Test every webhook with the payload examples above.

8. Confirm backend writes through:

```text
GET https://dynasty-os-production.up.railway.app/api/automation/log
GET https://dynasty-os-production.up.railway.app/api/leads/stats
GET https://dynasty-os-production.up.railway.app/api/deal?limit=1
```

## No-Go Conditions

Do not mark n8n V3 production-ready if any of these are true:

- `validate_n8n_v3_production.py` reports failed tests.
- The workflow points to `localhost`.
- A webhook has no validation step.
- A production HTTP route returns 500.
- A failure path does not alert, log, or return a controlled response.

