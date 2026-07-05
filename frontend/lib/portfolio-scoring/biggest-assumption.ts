// Investment Intelligence Slice 4: "what assumption is driving this
// recommendation, and what should I validate first?" Pure sensitivity
// analysis on top of the existing scoreProperty() function - no new data,
// no new inputs. For a GO deal, finds which of the four cost levers
// (purchase price, repair/holding/closing costs) requires the smallest
// percentage increase to flip the decision away from GO, and reports that
// as the single highest-leverage assumption. For a property with no
// verified purchase price (which can never be GO - see the hard cap in
// score-property.ts), instead reports the maximum price that would still
// clear GO, which is directly useful for making an offer.
import { scoreProperty } from './score-property'
import type { PortfolioScoringProperty, PortfolioDecision } from './types'
import { toNumber } from '../property-utils'

type Lever = 'purchasePrice' | 'repairCosts' | 'holdingCosts' | 'closingCosts'

const LEVERS: Lever[] = ['purchasePrice', 'repairCosts', 'holdingCosts', 'closingCosts']

const LEVER_LABELS: Record<Lever, string> = {
  purchasePrice: 'Purchase price',
  repairCosts: 'Repair costs',
  holdingCosts: 'Holding costs',
  closingCosts: 'Closing costs',
}

const SEARCH_ITERATIONS = 30
const SEARCH_PRECISION_DOLLARS = 250

export type BiggestAssumption = {
  kind: 'threshold' | 'price-needed-for-go'
  lever: Lever | null
  leverLabel: string | null
  currentValue: number | null
  thresholdValue: number
  newDecision: PortfolioDecision | null
  summary: string
}

// Binary search for the largest value of `lever` (starting from its current
// value) at which scoreProperty() still returns `currentDecision`. Assumes
// increasing the lever monotonically worsens the deal, which holds for all
// four cost levers here (each only ever subtracts from equity/adds to risk).
function findIncreaseThreshold(
  property: PortfolioScoringProperty,
  lever: Lever,
  currentValue: number,
  currentDecision: string
): number | null {
  const searchFloor = Math.max(currentValue, 1000)
  let lo = searchFloor
  let hi = searchFloor * 6 + 250000

  const atHi = scoreProperty({ ...property, [lever]: hi } as PortfolioScoringProperty).decision
  if (atHi === currentDecision) return null // decision never flips within a generous search range

  for (let i = 0; i < SEARCH_ITERATIONS; i++) {
    if (hi - lo < SEARCH_PRECISION_DOLLARS) break
    const mid = (lo + hi) / 2
    const decision = scoreProperty({ ...property, [lever]: mid } as PortfolioScoringProperty).decision
    if (decision === currentDecision) lo = mid
    else hi = mid
  }

  return hi
}

export function findBiggestAssumption(
  property: PortfolioScoringProperty,
  currentDecision: PortfolioDecision
): BiggestAssumption | null {
  if (currentDecision !== 'GO') return null

  let best: { lever: Lever; currentValue: number; threshold: number; pctMove: number } | null = null

  for (const lever of LEVERS) {
    const currentValue = toNumber((property as unknown as Record<Lever, unknown>)[lever])
    const threshold = findIncreaseThreshold(property, lever, currentValue, currentDecision)
    if (threshold === null) continue

    const pctMove = currentValue > 0 ? (threshold - currentValue) / currentValue : Infinity
    if (!best || pctMove < best.pctMove) {
      best = { lever, currentValue, threshold, pctMove }
    }
  }

  if (!best) return null

  const newDecision = scoreProperty({ ...property, [best.lever]: best.threshold + SEARCH_PRECISION_DOLLARS } as PortfolioScoringProperty).decision

  return {
    kind: 'threshold',
    lever: best.lever,
    leverLabel: LEVER_LABELS[best.lever],
    currentValue: best.currentValue,
    thresholdValue: Math.round(best.threshold),
    newDecision,
    summary: `${LEVER_LABELS[best.lever]} stays below $${Math.round(best.threshold).toLocaleString()}. Above that, the recommendation changes to ${newDecision}.`,
  }
}

export function findPriceNeededForGo(property: PortfolioScoringProperty): BiggestAssumption | null {
  const estimatedValue = toNumber(property.arv) || toNumber(property.currentValue)
  if (estimatedValue <= 0) return null

  let lo = 1
  let hi = estimatedValue * 1.2

  const atLo = scoreProperty({ ...property, purchasePrice: lo } as PortfolioScoringProperty).decision
  if (atLo !== 'GO') return null // even a near-zero price can't clear GO - some other blocker dominates

  for (let i = 0; i < SEARCH_ITERATIONS; i++) {
    if (hi - lo < SEARCH_PRECISION_DOLLARS) break
    const mid = (lo + hi) / 2
    const decision = scoreProperty({ ...property, purchasePrice: mid } as PortfolioScoringProperty).decision
    if (decision === 'GO') lo = mid
    else hi = mid
  }

  return {
    kind: 'price-needed-for-go',
    lever: null,
    leverLabel: null,
    currentValue: null,
    thresholdValue: Math.round(lo),
    newDecision: 'GO',
    summary: `No verified purchase price yet. At or below $${Math.round(lo).toLocaleString()}, this would clear GO.`,
  }
}

export function getBiggestAssumption(
  property: PortfolioScoringProperty,
  currentDecision: PortfolioDecision,
  hasVerifiedPurchasePrice: boolean
): BiggestAssumption | null {
  if (currentDecision === 'GO') return findBiggestAssumption(property, currentDecision)
  if (!hasVerifiedPurchasePrice) return findPriceNeededForGo(property)
  return null
}
