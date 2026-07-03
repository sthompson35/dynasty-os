import { toNumber } from '@/lib/property-utils'
import type { PortfolioDecision, PortfolioScoreBucket, PortfolioScoreResult, PortfolioScoringProperty, PortfolioStrategy } from './types'

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function textIncludes(notes: string, pattern: RegExp): boolean {
  return pattern.test(notes.toLowerCase())
}

function noteNumber(notes: string, label: string): number {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = notes.match(new RegExp(`${escaped}:\\s*\\$?([0-9,.]+)`, 'i'))
  return match?.[1] ? toNumber(match[1]) : 0
}

function chooseStrategy(property: PortfolioScoringProperty, spread: number, equityPct: number, vacant: boolean): PortfolioStrategy {
  const type = property.propertyType
  if (type === 'land') return spread > 50000 ? 'Development' : 'Land'
  if (type === 'commercial') return 'Commercial'
  if (type === 'multi-family') return equityPct >= 0.35 ? 'BRRRR' : 'Rental'
  if (vacant && spread > 30000) return 'Flip'
  if (spread > 20000) return 'Wholesale'
  return 'Rental'
}

function bucketFor(score: number, decision: PortfolioDecision): PortfolioScoreBucket {
  if (decision === 'KILL') return 'Kill'
  if (decision === 'RENEGOTIATE') return 'Renegotiate'
  if (score >= 85) return 'Elite Deals'
  if (score >= 72) return 'Strong GO'
  return 'GO With Conditions'
}

function decisionFor(score: number, riskScore: number): PortfolioDecision {
  if (score < 45 || riskScore >= 76) return 'KILL'
  if (score < 70 || riskScore >= 48) return 'RENEGOTIATE'
  return 'GO'
}

export function scoreProperty(property: PortfolioScoringProperty): PortfolioScoreResult {
  const notes = property.notes ?? ''
  const estimatedValue = toNumber(property.arv) || toNumber(property.currentValue) || noteNumber(notes, 'Estimated Value') || noteNumber(notes, 'Market Value')
  const purchasePrice = toNumber(property.purchasePrice) || noteNumber(notes, 'Last Sale Amount') || noteNumber(notes, 'List Price')
  const repairCosts = toNumber(property.repairCosts)
  const holdingCosts = toNumber(property.holdingCosts)
  const closingCosts = toNumber(property.closingCosts)
  const totalBasis = purchasePrice + repairCosts + holdingCosts + closingCosts
  const equitySpread = Math.max(0, estimatedValue - purchasePrice)
  const equityPct = estimatedValue > 0 ? equitySpread / estimatedValue : 0
  const vacant = textIncludes(notes, /vacant:\s*(yes|true|1)|vacant\?:\s*(yes|true|1)|vacant owner|property vacant/)
  const absentee = textIncludes(notes, /absentee owner:\s*(yes|true|1)|absentee:\s*(yes|true|1)/)
  const ownerOccupied = textIncludes(notes, /owner occupied:\s*(yes|true|1)/)
  const reasons: string[] = []

  let dealScore = 35
  if (estimatedValue > 0) dealScore += 8
  if (purchasePrice > 0) dealScore += 6
  if (equityPct >= 0.65) { dealScore += 24; reasons.push('High equity spread') }
  else if (equityPct >= 0.4) { dealScore += 17; reasons.push('Strong equity spread') }
  else if (equityPct >= 0.2) { dealScore += 8; reasons.push('Moderate equity spread') }
  else if (estimatedValue > 0 && purchasePrice > 0) { dealScore -= 14; reasons.push('Thin equity spread') }

  if (vacant) { dealScore += 8; reasons.push('Vacancy signal') }
  if (absentee) { dealScore += 6; reasons.push('Absentee owner signal') }
  if (ownerOccupied) { dealScore -= 3; reasons.push('Owner occupied') }
  if (property.propertyType === 'multi-family') { dealScore += 5; reasons.push('Multi-family asset') }
  if (property.propertyType === 'land') { dealScore += 4; reasons.push('Land/development candidate') }
  if (property.sqft && property.sqft > 0) dealScore += 3
  if (property.yearBuilt && property.yearBuilt < 1950) { dealScore -= 3; reasons.push('Older property risk') }

  let riskScore = 18
  if (!estimatedValue) { riskScore += 22; reasons.push('Missing value signal') }
  if (!purchasePrice) { riskScore += 12; reasons.push('Missing price/basis signal') }
  if (estimatedValue > 0 && purchasePrice > estimatedValue * 0.82) { riskScore += 20; reasons.push('Basis too close to value') }
  if (property.propertyType === 'commercial') riskScore += 8
  if (repairCosts > estimatedValue * 0.35 && estimatedValue > 0) { riskScore += 12; reasons.push('Repair cost risk') }
  if (!property.city || !property.state) riskScore += 20

  const arvConfidence = clamp((estimatedValue ? 58 : 20) + (property.sqft ? 8 : 0) + (property.yearBuilt ? 5 : 0) + (property.bedrooms !== null ? 5 : 0) + (property.lotSize ? 4 : 0) - (property.propertyType === 'land' ? 8 : 0))
  const capitalScore = clamp(100 - riskScore + (equityPct >= 0.4 ? 10 : 0) - (totalBasis > 0 && estimatedValue > 0 && totalBasis > estimatedValue * 0.8 ? 12 : 0))
  const strategy = chooseStrategy(property, equitySpread, equityPct, vacant)
  dealScore = clamp(dealScore + (capitalScore - 50) * 0.18 + (arvConfidence - 50) * 0.12 - riskScore * 0.12)
  riskScore = clamp(riskScore)
  const decision = decisionFor(dealScore, riskScore)
  const scoreBucket = bucketFor(dealScore, decision)

  if (reasons.length === 0) reasons.push('Baseline score from available property record')

  return {
    propertyId: property.id,
    dealScore,
    riskScore,
    arvConfidence,
    capitalScore,
    strategy,
    decision,
    scoreBucket,
    reasons,
    inputs: {
      estimatedValue,
      purchasePrice,
      equitySpread,
      equityPct,
      totalBasis,
      propertyType: property.propertyType,
      vacant,
      absentee,
      ownerOccupied,
    },
  }
}
