// Adapts the qualification-score concept from the investor-prospecting web
// map (research/... "Real Estate Investor Web Map" PDF - a customer/design-
// partner prospecting guide) onto the existing capital Investor model. The
// PDF's signals were written for software-customer prospects ("uses
// PropWire/BatchLeads today", "mentions pain around underwriting"); these are
// the capital-investor equivalents - concrete evidence of real funding
// capacity and engagement, not just a name on a list. Same explainable
// pattern as scoreProperty(): a clamped 0-100 score plus the reasons behind it.
const BUY_BOX_MARKET_KEYWORDS = ['missouri', 'mo']
const SERVICEABLE_MAX_PREFERRED_RETURN = 0.12
const ENGAGED_STATUSES = new Set(['warm', 'committed', 'funded'])

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

export type InvestorQualificationInput = {
  status: string
  availableCapital: number | null
  preferredReturn: number | null
  markets: string | null
  email: string | null
  phone: string | null
  evidenceSource: string | null
  hasPriorCapitalActivity: boolean
}

export type InvestorQualification = {
  score: number
  reasons: string[]
}

export function computeInvestorQualification(input: InvestorQualificationInput): InvestorQualification {
  const reasons: string[] = []
  let score = 30

  const hasAvailableCapital = (input.availableCapital ?? 0) > 0
  if (hasAvailableCapital) {
    score += 20
    reasons.push('Has real available capital on file')
  }

  const marketsLower = (input.markets ?? '').toLowerCase()
  if (BUY_BOX_MARKET_KEYWORDS.some((keyword) => marketsLower.includes(keyword))) {
    score += 15
    reasons.push('Active in the Missouri buy box market')
  }

  if (ENGAGED_STATUSES.has(input.status)) {
    score += 20
    reasons.push('Already warm or funded, not a cold prospect')
  }

  const hasContactRoute = Boolean(input.email?.trim() || input.phone?.trim())
  if (hasContactRoute) {
    score += 15
    reasons.push('Has a verified contact route (email/phone)')
  } else {
    score -= 10
    reasons.push('No verified contact route on file')
  }

  if (input.preferredReturn !== null && input.preferredReturn <= SERVICEABLE_MAX_PREFERRED_RETURN) {
    score += 10
    reasons.push('Preferred return is within a serviceable range')
  }

  if (input.hasPriorCapitalActivity) {
    score += 15
    reasons.push('Has a track record of prior capital activity')
  }

  if (input.evidenceSource?.trim()) {
    score += 5
    reasons.push(`Sourced from a known channel (${input.evidenceSource})`)
  }

  if (input.status === 'prospect' && !hasAvailableCapital && !input.hasPriorCapitalActivity) {
    score -= 15
    reasons.push('No concrete capital or activity signal yet')
  }

  return { score: clamp(score), reasons }
}
