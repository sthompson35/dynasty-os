// Investment Intelligence Slice 2: "Why is this property in today's Top 20,
// and what is the single most valuable next action?" A small, deliberately
// non-exhaustive decision matrix - not a rule engine - over data that
// already exists (dealScore/decision, purchase-price verification, GIS
// enrichment status, flood zone). No new data sources, no scoring changes.
//
// Precedence (checked in order, first match wins): a data-completeness
// blocker (no price, no enrichment) always outranks a risk-mitigation step
// (insurance quote), which outranks a decision-specific step. Renegotiate is
// checked before the flood-zone/insurance-quote step on the reasoning that
// fixing terms on a deal that doesn't clear GO is more valuable than paying
// for ancillary due diligence on it first.

const SEVERE_FLOOD_ZONES = new Set(['VE'])
const HIGH_RISK_FLOOD_ZONES = new Set(['A', 'AE', 'AH', 'AO', 'AR'])

export type NextBestActionInput = {
  decision: string
  hasVerifiedPurchasePrice: boolean
  floodZone: string | null
  gisEnrichedAt: string | null
}

export type NextBestAction = {
  action: string
  rationale: string
}

export function getNextBestAction(input: NextBestActionInput): NextBestAction {
  if (!input.hasVerifiedPurchasePrice) {
    return {
      action: 'Get a firm asking or purchase price',
      rationale: 'No verified purchase price yet - underwriting cannot be finalized without one.',
    }
  }

  if (!input.gisEnrichedAt) {
    return {
      action: 'Run GIS/flood enrichment',
      rationale: 'This property has not been enriched yet - flood and location risk are unknown.',
    }
  }

  if (input.decision === 'RENEGOTIATE') {
    return {
      action: 'Prepare a revised offer',
      rationale: 'Current terms do not clear the GO threshold - renegotiate price or terms before proceeding.',
    }
  }

  if (input.floodZone && (SEVERE_FLOOD_ZONES.has(input.floodZone) || HIGH_RISK_FLOOD_ZONES.has(input.floodZone))) {
    return {
      action: 'Get an insurance quote before offering',
      rationale: `Property sits in FEMA flood zone ${input.floodZone} - insurance cost is the largest remaining uncertainty.`,
    }
  }

  return {
    action: 'Begin the offer package',
    rationale: 'Deal clears underwriting with no outstanding blockers.',
  }
}
