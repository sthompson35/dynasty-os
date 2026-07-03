export type OwnershipResearchRouteInput = {
  propertyAddress: string
  mailingAddress: string | null
  county: string | null
  priority: number
  absenteeOwner: boolean
  vacancySignal: boolean
  equitySignal: number | null
}

export type OwnershipResearchRoute = {
  county: string | null
  sourcePriority: number
  researchReason: string
  recommendedSource: string
}
