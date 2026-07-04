export type MotivationInput = {
  timeline: string | null
  painPoints: string[]
  occupancyStatus: string | null
  askingPrice: number | null
  propertyValue: number | null
}

export type MotivationResult = {
  motivationScore: number
  factors: string[]
}

export type DealDecision = 'GO' | 'RENEGOTIATE' | 'KILL'
