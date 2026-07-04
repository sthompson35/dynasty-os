import { ownerType } from '@/lib/owner-intelligence/build-owner-intelligence'
import type { OwnerType } from '@/lib/owner-intelligence/types'

export type ResearchCompletionResult = {
  ownerName: string
  ownerType: OwnerType
  confidence: number
  sourceUrl: string | null
  notes: string | null
}

export function resolveResearchCompletion(input: {
  ownerName: unknown
  confidence: unknown
  sourceUrl: unknown
  notes: unknown
}): ResearchCompletionResult | null {
  const ownerName = String(input.ownerName ?? '').trim()
  if (!ownerName) return null

  const confidence = Math.min(100, Math.max(0, Math.round(Number(input.confidence) || 70)))
  const sourceUrl = input.sourceUrl ? String(input.sourceUrl).trim() || null : null
  const notes = input.notes ? String(input.notes).trim() || null : null

  return {
    ownerName,
    ownerType: ownerType(ownerName),
    confidence,
    sourceUrl,
    notes,
  }
}
