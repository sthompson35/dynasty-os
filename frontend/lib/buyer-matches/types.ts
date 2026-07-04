export type BuyerCriteriaInput = {
  propertyTypes: string[]
  exitStrategies: string[]
  markets: string[]
  minPrice: number | null
  maxPrice: number | null
  minArv: number | null
  maxCapital: number | null
}

export type DealMatchInput = {
  exitStrategy: string
  purchasePrice: number | null
  arv: number | null
  capitalRequired: number | null
  propertyType: string
  propertyCity: string
  propertyState: string
}

export type MatchResult = {
  matchScore: number
  reasons: string[]
}
