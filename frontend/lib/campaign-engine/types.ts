export type CampaignType =
  | 'CALL_NOW'
  | 'MAIL_NOW'
  | 'TEXT_NOW'
  | 'RESEARCH'
  | 'LOW_OFFER'
  | 'SKIP'

export type CampaignArtifact = {
  workType: string
  headline: string
  propertyAddress: string
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  instructions: string[]
  script?: string[]
  mailMerge?: Record<string, string | number | null>
  checklist?: string[]
  worksheet?: Record<string, string | number | null>
  archiveReason?: string
}

export type CampaignQueueItemInput = {
  id: string
  propertyId: string
  actionType: string
  priority: number
  reason: string
  property: {
    address: string
    city: string
    state: string
    zip: string | null
    propertyType: string
    bedrooms?: number | null
    bathrooms?: number | null
    sqft?: number | null
    lotSize?: number | null
    currentValue?: unknown
    arv?: unknown
    contactLinks?: Array<{
      contact?: {
        name: string
        phone: string | null
        email: string | null
        company: string | null
      } | null
    }>
    ownerIntelligenceArtifacts?: Array<{
      ownerName: string | null
      mailingAddress: string | null
      ownerType: string
      absenteeOwner: boolean
      yearsOwned: number | null
      equityEstimate: unknown
      vacancyIndicator: boolean
      contactConfidence: number
      phones: unknown
      emails: unknown
    }>
  }
  dealScore: {
    dealScore: number
    riskScore: number
    strategy: string
    decision: string
    scoreBucket: string
  }
}
