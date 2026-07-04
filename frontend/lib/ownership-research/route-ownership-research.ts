import type { OwnershipResearchRoute, OwnershipResearchRouteInput } from './types'

function normalizeCounty(county: string | null) {
  const value = String(county ?? '').trim().toLowerCase()
  if (!value) return null
  if (value.includes('st. louis city') || value.includes('saint louis city') || value === 'st louis city') return 'St. Louis City'
  if (value.includes('st. louis') || value.includes('saint louis')) return 'St. Louis County'
  if (value.includes('francois')) return 'St. Francois County'
  return county?.trim() || null
}

function sourceForCounty(county: string | null) {
  if (county === 'St. Louis City') return 'City assessor / Geo St. Louis'
  if (county === 'St. Louis County') return 'County real estate search'
  if (county === 'St. Francois County') return 'County assessor'
  return 'Manual county lookup'
}

export function routeOwnershipResearch(input: OwnershipResearchRouteInput): OwnershipResearchRoute {
  const county = normalizeCounty(input.county)
  const recommendedSource = sourceForCounty(county)
  let sourcePriority = input.priority

  if (!county) sourcePriority += 10
  if (input.absenteeOwner) sourcePriority += 8
  if (input.vacancySignal) sourcePriority += 8
  if ((input.equitySignal ?? 0) >= 75000) sourcePriority += 8
  if (!input.mailingAddress) sourcePriority += 6

  sourcePriority = Math.min(100, Math.max(0, Math.round(sourcePriority)))

  const reasons = [
    county ? `County routed to ${county}.` : 'County missing; perform manual county lookup.',
    `Recommended source: ${recommendedSource}.`,
    input.absenteeOwner ? 'Absentee-owner signal present.' : '',
    input.vacancySignal ? 'Vacancy signal present.' : '',
    (input.equitySignal ?? 0) > 0 ? `Equity signal ${Math.round(input.equitySignal ?? 0)}.` : '',
  ].filter(Boolean)

  return {
    county,
    sourcePriority,
    researchReason: reasons.join(' '),
    recommendedSource,
  }
}
