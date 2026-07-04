export type RecommendedSkipTraceChannel =
  | 'PHONE_EMAIL_SKIP_TRACE'
  | 'MAILING_ADDRESS_EXPORT'
  | 'MOBILE_APPEND'
  | 'OWNERSHIP_RESEARCH'
  | 'NO_TOUCH'

export type SkipTracePrepInput = {
  propertyId: string
  ownerArtifactId: string
  userId: string
  propertyAddress: string
  mailingAddress: string | null
  absenteeOwner: boolean
  vacancySignal: boolean
  equitySignal: number | null
  ownerName: string | null
  contactConfidence: number
  phones: string[]
  emails: string[]
  dealScore: number | null
  scoreBucket: string | null
  decision: string | null
  actionType: string | null
}

export type SkipTracePrepResult = {
  priority: number
  recommendedChannel: RecommendedSkipTraceChannel
  evidence: Record<string, string | number | boolean | null>
}
