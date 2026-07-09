// Computes realized profit/ROI for a recorded deal outcome, using the same
// formula shape as the Deal Engine's predicted-side calculator (calcDeal in
// deal-engine-client.tsx: profit = exit - totalCost, roi = profit/totalCost)
// so predicted and actual numbers stay directly comparable.
export type DealOutcomeActuals = {
  actualPurchase: number | null
  actualRehab: number | null
  actualExit: number | null
}

export type DealOutcomeFinancials = {
  netProfit: number | null
  roi: number | null
}

export function computeDealOutcomeFinancials(actuals: DealOutcomeActuals): DealOutcomeFinancials {
  const { actualPurchase, actualRehab, actualExit } = actuals

  if (actualExit === null) {
    return { netProfit: null, roi: null }
  }

  const totalCost = (actualPurchase ?? 0) + (actualRehab ?? 0)
  const netProfit = actualExit - totalCost
  const roi = totalCost > 0 ? netProfit / totalCost : null

  return { netProfit, roi }
}
