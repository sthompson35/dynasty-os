import type { BuyerCriteriaInput, DealMatchInput, MatchResult } from './types'

function clamp(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]/g, '_')
}

export function scoreMatch(deal: DealMatchInput, criteria: BuyerCriteriaInput): MatchResult {
  let score = 20
  const reasons: string[] = []

  const normalizedExitStrategies = criteria.exitStrategies.map(normalize)
  if (normalizedExitStrategies.length === 0 || normalizedExitStrategies.includes(normalize(deal.exitStrategy))) {
    score += 20
    reasons.push(`Buys ${deal.exitStrategy.replace(/_/g, ' ')} deals`)
  } else {
    score -= 15
  }

  const normalizedPropertyTypes = criteria.propertyTypes.map(normalize)
  if (normalizedPropertyTypes.length === 0 || normalizedPropertyTypes.includes(normalize(deal.propertyType))) {
    score += 15
    reasons.push(`Targets ${deal.propertyType.replace(/-/g, ' ')}`)
  } else {
    score -= 10
  }

  const normalizedMarkets = criteria.markets.map((market) => market.toLowerCase())
  const marketMatch = normalizedMarkets.length === 0 ||
    normalizedMarkets.includes(deal.propertyCity.toLowerCase()) ||
    normalizedMarkets.includes(deal.propertyState.toLowerCase())
  if (marketMatch) {
    score += 20
    reasons.push('In buyer\'s target market')
  } else {
    score -= 15
  }

  if (deal.purchasePrice !== null) {
    const withinMin = criteria.minPrice === null || deal.purchasePrice >= criteria.minPrice
    const withinMax = criteria.maxPrice === null || deal.purchasePrice <= criteria.maxPrice
    if (withinMin && withinMax) {
      score += 15
      reasons.push('Within buyer price range')
    } else {
      score -= 15
      reasons.push('Outside buyer price range')
    }
  }

  if (deal.arv !== null && criteria.minArv !== null) {
    if (deal.arv >= criteria.minArv) {
      score += 5
      reasons.push('Meets minimum ARV')
    } else {
      score -= 10
    }
  }

  if (deal.capitalRequired !== null && criteria.maxCapital !== null) {
    if (deal.capitalRequired <= criteria.maxCapital) {
      score += 10
      reasons.push('Within funding capacity')
    } else {
      score -= 20
      reasons.push('Exceeds funding capacity')
    }
  }

  return { matchScore: clamp(score), reasons }
}
