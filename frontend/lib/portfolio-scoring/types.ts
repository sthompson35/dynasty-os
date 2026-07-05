export type PortfolioDecision = 'GO' | 'RENEGOTIATE' | 'KILL'

export type PortfolioStrategy = 'Wholesale' | 'Flip' | 'BRRRR' | 'Rental' | 'Land' | 'Development' | 'Commercial'

export type PortfolioScoreBucket = 'Elite Deals' | 'Strong GO' | 'GO With Conditions' | 'Renegotiate' | 'Kill'

export type PortfolioScoringProperty = {
  id: string
  userId: string
  address: string
  city: string
  state: string
  zip: string | null
  propertyType: string
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lotSize: number | null
  yearBuilt: number | null
  purchasePrice: unknown
  currentValue: unknown
  arv: unknown
  repairCosts: unknown
  holdingCosts: unknown
  closingCosts: unknown
  notes: string | null
  floodZone: string | null
  femaDisasterCount: number | null
  femaLastDisasterType: string | null
}

export type PortfolioScoreResult = {
  propertyId: string
  dealScore: number
  riskScore: number
  arvConfidence: number
  capitalScore: number
  strategy: PortfolioStrategy
  decision: PortfolioDecision
  scoreBucket: PortfolioScoreBucket
  reasons: string[]
  inputs: {
    estimatedValue: number
    purchasePrice: number
    equitySpread: number
    equityPct: number
    totalBasis: number
    propertyType: string
    vacant: boolean
    absentee: boolean
    ownerOccupied: boolean
    floodZone: string | null
  }
}
