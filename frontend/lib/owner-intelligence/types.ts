export type OwnerType = 'INDIVIDUAL' | 'LLC' | 'TRUST' | 'CORPORATE' | 'GOVERNMENT' | 'UNKNOWN'

export type OwnerIntelligenceInput = {
  propertyId: string
  userId: string
  address: string
  city: string
  state: string
  zip: string | null
  notes: string | null
  currentValue: unknown
  purchasePrice: unknown
}

export type OwnerIntelligenceResult = {
  propertyId: string
  userId: string
  ownerName: string | null
  mailingAddress: string | null
  ownerType: OwnerType
  absenteeOwner: boolean
  yearsOwned: number | null
  equityEstimate: number | null
  vacancyIndicator: boolean
  contactConfidence: number
  phones: string[]
  emails: string[]
  evidence: Record<string, string | number | boolean | null>
}
