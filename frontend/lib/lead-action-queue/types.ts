export type LeadActionType =
  | 'CALL_NOW'
  | 'MAIL_NOW'
  | 'TEXT_NOW'
  | 'RESEARCH'
  | 'LOW_OFFER'
  | 'SKIP'

export type LeadActionStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'SNOOZED'
  | 'SKIPPED'

export type LeadActionInput = {
  dealScoreId: string
  propertyId: string
  dealScore: number
  riskScore: number
  scoreBucket: string
  decision: string
  strategy: string
  reasons: unknown
}

export type LeadActionRecommendation = {
  actionType: LeadActionType
  priority: number
  nextActionDate: Date | null
  reason: string
}
