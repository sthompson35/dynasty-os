export type IntakePropertyInput = {
  id: string
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
  status: string
  notes: string | null
  updatedAt?: Date | string
}

export type ExistingDealSignal = {
  id: string
  decision: string
  status: string
  roi: number | null
  riskScore: number
  capitalRequired: number | null
}

export type IntakeCandidate = {
  propertyId: string
  address: string
  city: string
  state: string
  zip: string | null
  propertyType: string
  propertyStatus: string
  estimatedArv: number
  askingOrBasis: number
  suggestedOffer: number
  estimatedRepairCost: number
  estimatedHoldingCost: number
  estimatedClosingCost: number
  mao: number
  projectedProfit: number
  projectedRoi: number
  equitySpread: number
  riskScore: number
  intakeScore: number
  dynastyFitScore: number
  sellerMotivationScore: number
  dealVelocityScore: number
  capitalScore: number
  rehabScore: number
  dispositionScore: number
  rehabLevel: 'light' | 'medium' | 'heavy' | 'gut'
  dispositionScores: Record<'wholesale' | 'fix_flip' | 'brrrr' | 'rental' | 'owner_finance' | 'development', number>
  atlasRecommendation: {
    action: 'BUY' | 'PASS' | 'REVIEW'
    confidence: number
    reason: string[]
    recommendedExit: string
    risk: 'Low' | 'Moderate' | 'High'
    capitalNeed: 'Low' | 'Moderate' | 'High'
  }
  decision: 'go' | 'go_conditions' | 'renegotiate' | 'hold' | 'kill' | 'pending'
  recommendedStrategy: string
  reasons: string[]
  existingDeal: ExistingDealSignal | null
  updatedAt: string | null
}

export type IntakeSummary = {
  totalProperties: number
  analyzedProperties: number
  syncedDeals: number
  go: number
  renegotiate: number
  kill: number
  averageScore: number
  totalPotentialProfit: number
  capitalRequired: number
  pipeline: {
    leads: number
    qualified: number
    offersSent: number
    negotiating: number
    contracted: number
    closed: number
    rejected: number
  }
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return 0
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const parsed = (value as { toNumber?: () => number }).toNumber?.()
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0
  }
  const parsed = Number(String(value).replace(/[$,%\s,]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function rounded(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0)
}

function estimateRepairs(property: IntakePropertyInput, arv: number): number {
  const explicit = toNumber(property.repairCosts)
  if (explicit > 0) {
    return explicit
  }

  const sqft = property.sqft ?? 0
  const age = property.yearBuilt ? Math.max(0, new Date().getFullYear() - property.yearBuilt) : 45
  const basePerSqft = age >= 80 ? 45 : age >= 50 ? 35 : age >= 25 ? 25 : 15
  const sqftEstimate = sqft > 0 ? sqft * basePerSqft : 0
  const valueEstimate = arv > 0 ? arv * (age >= 50 ? 0.18 : 0.1) : 0

  return rounded(Math.max(sqftEstimate, valueEstimate, 7500))
}

function recommendedStrategy(property: IntakePropertyInput, roi: number, profit: number): string {
  const type = property.propertyType
  if (type === 'land') return 'land_flip'
  if (roi >= 0.25 && profit >= 25000) return 'flip'
  if (roi >= 0.15) return 'wholesale'
  if ((property.bedrooms ?? 0) >= 3 && (property.bathrooms ?? 0) >= 1) return 'hold'
  return 'renegotiate'
}

function notesText(property: IntakePropertyInput): string {
  return `${property.notes ?? ''} ${property.status ?? ''} ${property.propertyType ?? ''}`.toLowerCase()
}

function hasSignal(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term))
}

function scoreSellerMotivation(property: IntakePropertyInput): number {
  const text = notesText(property)
  let score = 10
  if (hasSignal(text, ['vacant', 'vacancy'])) score += 18
  if (hasSignal(text, ['inherited', 'probate', 'estate'])) score += 18
  if (hasSignal(text, ['pre foreclosure', 'pre-foreclosure', 'foreclosure', 'default'])) score += 22
  if (hasSignal(text, ['code violation', 'code violations', 'condemned'])) score += 14
  if (hasSignal(text, ['tax delinquent', 'delinquent tax', 'tax lien'])) score += 16
  if (hasSignal(text, ['absentee'])) score += 12
  if (property.status === 'prospect') score += 6
  return clamp(score, 0, 100)
}

function scoreDealVelocity(property: IntakePropertyInput, strategy: string, profit: number, roi: number): number {
  const text = notesText(property)
  let score = 45
  if (hasSignal(text, ['days on market'])) score += 8
  if (hasSignal(text, ['listing status', 'mls'])) score += 6
  if (property.propertyType === 'single-family') score += 14
  if (property.propertyType === 'multi-family') score += 8
  if (property.propertyType === 'land') score -= 8
  if (strategy === 'wholesale') score += 12
  if (strategy === 'flip') score += 8
  if (profit > 25000) score += 8
  if (roi >= 0.25) score += 8
  return clamp(score, 0, 100)
}

function scoreCapital(askingOrBasis: number, repairs: number, holding: number, closing: number, arv: number, roi: number): number {
  const cashRequired = askingOrBasis + repairs + holding + closing
  let score = 70
  if (cashRequired > 250000) score -= 20
  else if (cashRequired > 150000) score -= 10
  else score += 8
  if (arv > 0 && cashRequired / arv <= 0.72) score += 12
  if (roi >= 0.25) score += 10
  if (repairs > arv * 0.22 && arv > 0) score -= 14
  return clamp(score, 0, 100)
}

function rehabLevelFrom(repairs: number, arv: number, sqft: number | null): IntakeCandidate['rehabLevel'] {
  const perSqft = sqft && sqft > 0 ? repairs / sqft : 0
  const repairPct = arv > 0 ? repairs / arv : 0
  if (repairPct >= 0.3 || perSqft >= 65) return 'gut'
  if (repairPct >= 0.2 || perSqft >= 45) return 'heavy'
  if (repairPct >= 0.1 || perSqft >= 25) return 'medium'
  return 'light'
}

function scoreRehab(level: IntakeCandidate['rehabLevel']): number {
  if (level === 'light') return 88
  if (level === 'medium') return 72
  if (level === 'heavy') return 48
  return 28
}

function buildDispositionScores(property: IntakePropertyInput, roi: number, profit: number, arv: number, repairs: number) {
  const type = property.propertyType
  const beds = property.bedrooms ?? 0
  const baths = property.bathrooms ?? 0
  return {
    wholesale: clamp(rounded(45 + profit / 1800 + (roi >= 0.18 ? 18 : 0) + (type === 'single-family' ? 8 : 0)), 0, 100),
    fix_flip: clamp(rounded(35 + profit / 1500 + (roi >= 0.25 ? 20 : 0) - (repairs > arv * 0.25 && arv > 0 ? 12 : 0)), 0, 100),
    brrrr: clamp(rounded(40 + (beds >= 3 ? 12 : 0) + (baths >= 1 ? 8 : 0) + (roi >= 0.15 ? 10 : 0)), 0, 100),
    rental: clamp(rounded(38 + (beds >= 3 ? 16 : 0) + (type === 'multi-family' ? 18 : 0)), 0, 100),
    owner_finance: clamp(rounded(35 + (arv > 0 && profit > 0 ? 10 : 0) + (type === 'land' ? 12 : 0)), 0, 100),
    development: clamp(rounded(type === 'land' ? 72 : 28 + (property.lotSize && property.lotSize > 0.5 ? 18 : 0)), 0, 100),
  }
}

function topDisposition(scores: ReturnType<typeof buildDispositionScores>): string {
  const [key] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] ?? ['wholesale']
  return key === 'fix_flip' ? 'Fix & Flip' : key.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function atlasRecommendation(params: {
  candidateDecision: IntakeCandidate['decision']
  dynastyFitScore: number
  profit: number
  roi: number
  riskScore: number
  capitalScore: number
  dispositionExit: string
  equitySpread: number
}): IntakeCandidate['atlasRecommendation'] {
  const action = params.candidateDecision === 'kill' || params.dynastyFitScore < 45 ? 'PASS' : params.dynastyFitScore >= 72 ? 'BUY' : 'REVIEW'
  const risk = params.riskScore <= 35 ? 'Low' : params.riskScore <= 62 ? 'Moderate' : 'High'
  const capitalNeed = params.capitalScore >= 72 ? 'Low' : params.capitalScore >= 48 ? 'Moderate' : 'High'
  const reason = action === 'PASS'
    ? [
        params.profit <= 0 ? 'Insufficient spread' : `Expected Profit: $${Math.max(0, params.profit).toLocaleString()}`,
        params.roi < 0.1 ? 'Rental cashflow / ROI weak' : `ROI: ${(params.roi * 100).toFixed(1)}%`,
        params.riskScore > 62 ? 'Repair uncertainty high' : `Risk: ${risk}`,
      ]
    : [
        `ARV Spread: ${params.equitySpread >= 50000 ? 'Excellent' : params.equitySpread >= 25000 ? 'Strong' : 'Fair'}`,
        `Expected Profit: $${params.profit.toLocaleString()}`,
        `Risk: ${risk}`,
        `Capital Need: ${capitalNeed}`,
      ]

  return {
    action,
    confidence: clamp(rounded(params.dynastyFitScore + (action === 'BUY' ? 8 : action === 'PASS' ? 5 : 0)), 0, 99),
    reason,
    recommendedExit: params.dispositionExit,
    risk,
    capitalNeed,
  }
}

function decisionFrom(roi: number, profit: number, askingOrBasis: number, mao: number, arv: number): IntakeCandidate['decision'] {
  if (arv <= 0) return 'pending'
  if (profit <= 0 || askingOrBasis > mao * 1.15) return 'kill'
  if (roi >= 0.25 && askingOrBasis <= mao) return 'go'
  if (roi >= 0.18) return 'go_conditions'
  if (roi >= 0.08 || askingOrBasis <= mao * 1.08) return 'renegotiate'
  return 'hold'
}

function reasonList(params: {
  property: IntakePropertyInput
  arv: number
  askingOrBasis: number
  mao: number
  profit: number
  roi: number
  repairs: number
  existingDeal: ExistingDealSignal | null
}): string[] {
  const reasons: string[] = []
  if (params.existingDeal) reasons.push(`Already synced to Deal Engine as ${params.existingDeal.decision}.`)
  if (params.arv <= 0) reasons.push('Missing ARV/current value blocks confident underwriting.')
  if (params.askingOrBasis <= 0) reasons.push('No asking/basis price; using MAO as suggested offer.')
  if (params.askingOrBasis > 0 && params.askingOrBasis <= params.mao) reasons.push('Basis is at or below 70% MAO.')
  if (params.askingOrBasis > params.mao) reasons.push('Basis is above current MAO; renegotiation likely required.')
  if (params.profit > 25000) reasons.push('Projected profit clears the $25K intake threshold.')
  if (params.roi >= 0.25) reasons.push('Projected ROI is strong for fix-and-flip discipline.')
  if ((params.property.yearBuilt ?? 0) > 0 && (new Date().getFullYear() - (params.property.yearBuilt ?? 0)) >= 50) {
    reasons.push('Older build increases repair and inspection risk.')
  }
  if (params.repairs >= params.arv * 0.2 && params.arv > 0) reasons.push('Repair load is heavy relative to ARV.')
  return reasons.slice(0, 5)
}

export function analyzePropertyForIntake(
  property: IntakePropertyInput,
  existingDeal: ExistingDealSignal | null = null,
): IntakeCandidate {
  const currentValue = toNumber(property.currentValue)
  const explicitArv = toNumber(property.arv)
  const purchasePrice = toNumber(property.purchasePrice)
  const estimatedArv = rounded(explicitArv || currentValue)
  const repairs = estimateRepairs(property, estimatedArv)
  const holding = rounded(toNumber(property.holdingCosts) || Math.max(estimatedArv * 0.02, 3500))
  const closing = rounded(toNumber(property.closingCosts) || Math.max(estimatedArv * 0.025, 2500))
  const mao = rounded(estimatedArv * 0.7 - repairs)
  const suggestedOffer = Math.max(0, mao)
  const askingOrBasis = purchasePrice > 0 ? purchasePrice : suggestedOffer
  const totalInvestment = askingOrBasis + repairs + holding + closing
  const profit = rounded(estimatedArv - totalInvestment)
  const roi = totalInvestment > 0 ? profit / totalInvestment : 0
  const equitySpread = rounded(estimatedArv - askingOrBasis)
  const decision = decisionFrom(roi, profit, askingOrBasis, mao, estimatedArv)
  const strategy = recommendedStrategy(property, roi, profit)
  const motivationScore = scoreSellerMotivation(property)
  const velocityScore = scoreDealVelocity(property, strategy, profit, roi)
  const capitalScore = scoreCapital(askingOrBasis, repairs, holding, closing, estimatedArv, roi)
  const rehabLevel = rehabLevelFrom(repairs, estimatedArv, property.sqft)
  const rehabScore = scoreRehab(rehabLevel)
  const dispositionScores = buildDispositionScores(property, roi, profit, estimatedArv, repairs)
  const dispositionScore = Math.max(...Object.values(dispositionScores))
  const dispositionExit = topDisposition(dispositionScores)

  let riskScore = 20
  if (estimatedArv <= 0) riskScore += 35
  if (askingOrBasis > mao) riskScore += 20
  if (roi < 0.12) riskScore += 20
  if ((property.yearBuilt ?? 0) > 0 && new Date().getFullYear() - (property.yearBuilt ?? 0) >= 50) riskScore += 10
  if (!property.sqft) riskScore += 5
  if (property.propertyType === 'land') riskScore += 8
  riskScore = clamp(rounded(riskScore), 0, 100)

  const intakeScore = clamp(rounded((roi * 100) + (profit / 1500) + (equitySpread / 3000) - riskScore * 0.45), 0, 100)
  const dynastyFitScore = clamp(rounded(
    intakeScore * 0.32 +
    motivationScore * 0.13 +
    velocityScore * 0.13 +
    capitalScore * 0.14 +
    rehabScore * 0.1 +
    dispositionScore * 0.18,
  ), 0, 100)
  const atlas = atlasRecommendation({
    candidateDecision: decision,
    dynastyFitScore,
    profit,
    roi,
    riskScore,
    capitalScore,
    dispositionExit,
    equitySpread,
  })
  const updatedAt = property.updatedAt instanceof Date ? property.updatedAt.toISOString() : property.updatedAt ? String(property.updatedAt) : null

  return {
    propertyId: property.id,
    address: property.address,
    city: property.city,
    state: property.state,
    zip: property.zip,
    propertyType: property.propertyType,
    propertyStatus: property.status,
    estimatedArv,
    askingOrBasis: rounded(askingOrBasis),
    suggestedOffer: rounded(suggestedOffer),
    estimatedRepairCost: rounded(repairs),
    estimatedHoldingCost: rounded(holding),
    estimatedClosingCost: rounded(closing),
    mao,
    projectedProfit: profit,
    projectedRoi: roi,
    equitySpread,
    riskScore,
    intakeScore,
    dynastyFitScore,
    sellerMotivationScore: motivationScore,
    dealVelocityScore: velocityScore,
    capitalScore,
    rehabScore,
    dispositionScore,
    rehabLevel,
    dispositionScores,
    atlasRecommendation: atlas,
    decision,
    recommendedStrategy: strategy,
    existingDeal,
    reasons: reasonList({ property, arv: estimatedArv, askingOrBasis, mao, profit, roi, repairs, existingDeal }),
    updatedAt,
  }
}

export function buildIntakeSummary(candidates: IntakeCandidate[]): IntakeSummary {
  const analyzed = candidates.filter((candidate) => candidate.estimatedArv > 0)
  return {
    totalProperties: candidates.length,
    analyzedProperties: analyzed.length,
    syncedDeals: candidates.filter((candidate) => Boolean(candidate.existingDeal)).length,
    go: candidates.filter((candidate) => candidate.decision === 'go' || candidate.decision === 'go_conditions').length,
    renegotiate: candidates.filter((candidate) => candidate.decision === 'renegotiate' || candidate.decision === 'hold').length,
    kill: candidates.filter((candidate) => candidate.decision === 'kill').length,
    averageScore: candidates.length ? rounded(candidates.reduce((sum, candidate) => sum + candidate.intakeScore, 0) / candidates.length) : 0,
    totalPotentialProfit: rounded(candidates.reduce((sum, candidate) => sum + Math.max(0, candidate.projectedProfit), 0)),
    capitalRequired: rounded(candidates.reduce((sum, candidate) => sum + Math.max(0, candidate.askingOrBasis), 0)),
    pipeline: {
      leads: candidates.length,
      qualified: candidates.filter((candidate) => candidate.dynastyFitScore >= 55).length,
      offersSent: candidates.filter((candidate) => candidate.atlasRecommendation.action === 'BUY').length,
      negotiating: candidates.filter((candidate) => candidate.decision === 'renegotiate' || candidate.decision === 'go_conditions').length,
      contracted: candidates.filter((candidate) => Boolean(candidate.existingDeal)).length,
      closed: candidates.filter((candidate) => candidate.existingDeal?.status === 'closed').length,
      rejected: candidates.filter((candidate) => candidate.atlasRecommendation.action === 'PASS').length,
    },
  }
}
