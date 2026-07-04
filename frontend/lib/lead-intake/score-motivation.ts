import type { DealDecision, MotivationInput, MotivationResult } from './types'

const TIMELINE_WEIGHTS: Record<string, number> = {
  ASAP: 35,
  WITHIN_30_DAYS: 30,
  '1_3_MONTHS': 22,
  '3_6_MONTHS': 12,
  '6_12_MONTHS': 5,
  NO_RUSH: -5,
}

const PAIN_POINT_WEIGHTS: Record<string, number> = {
  FORECLOSURE: 22,
  TAX_LIEN: 18,
  FINANCIAL_HARDSHIP: 16,
  DIVORCE: 15,
  CODE_VIOLATION: 12,
  TIRED_LANDLORD: 12,
  INHERITANCE: 10,
  RELOCATION: 9,
  VACANT_PROPERTY: 8,
  REPAIRS_NEEDED: 6,
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function scoreMotivation(input: MotivationInput): MotivationResult {
  let score = 15
  const factors: string[] = []

  const timelineWeight = input.timeline ? TIMELINE_WEIGHTS[input.timeline] ?? 5 : 0
  score += timelineWeight
  if (input.timeline) factors.push(`Timeline ${input.timeline.replace(/_/g, ' ').toLowerCase()}`)

  for (const point of input.painPoints) {
    score += PAIN_POINT_WEIGHTS[point] ?? 5
    factors.push(`Pain point: ${point.replace(/_/g, ' ').toLowerCase()}`)
  }

  if (input.occupancyStatus === 'VACANT') {
    score += 14
    factors.push('Vacant - no tenant friction')
  } else if (input.occupancyStatus === 'TENANT_OCCUPIED') {
    score += 6
    factors.push('Tenant occupied')
  }

  if (input.askingPrice !== null && input.propertyValue !== null && input.propertyValue > 0) {
    const ratio = input.askingPrice / input.propertyValue
    if (ratio <= 0.7) {
      score += 20
      factors.push('Asking price well below market value')
    } else if (ratio <= 0.85) {
      score += 10
      factors.push('Asking price below market value')
    } else if (ratio >= 1.05) {
      score -= 12
      factors.push('Asking price above market value')
    }
  }

  return { motivationScore: clamp(score), factors }
}

export function decisionForMotivation(motivationScore: number): DealDecision {
  if (motivationScore >= 65) return 'GO'
  if (motivationScore >= 35) return 'RENEGOTIATE'
  return 'KILL'
}
