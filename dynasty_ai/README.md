# Dynasty AI

Dynasty AI is the ATLAS orchestration layer for Dynasty PropertyOS. It reads property, lead, deal, rehab, capital, disposition, operations, and portfolio signals, then routes the next best action across the operating chain.

## Primary Flow

Lead Engine -> Intake Engine -> Underwriting Engine -> Strategy Engine -> Deal Engine -> Rehab Engine -> Capital Engine -> Investor Engine -> Disposition Engine -> Operations Engine -> Portfolio Dashboard

## API Surface

Backend routes are exposed under:

- `GET /api/dynasty-ai/manifest`
- `POST /api/dynasty-ai/analyze-deal`
- `POST /api/dynasty-ai/orchestrate`
- `POST /api/dynasty-ai/rank`

The first implementation is deterministic and production-safe: no external model key is required. LLMStudio/OpenAI style providers can later be plugged in as a reasoning layer on top of the same schemas.

## ATLAS Job

ATLAS acts as the acquisition manager:

- score seller motivation, intake quality, underwriting, strategy, rehab, capital, and disposition
- calculate Dynasty Fit
- compare wholesale, fix and flip, BRRRR, rental, owner finance, and development exits
- recommend BUY, PASS, or REVIEW
- assign next actions to the correct engine
- learn from closed portfolio outcomes over time
