// Investment Intelligence Slice 3: "has anything happened that changes my
// decision about this property?" A small, user-facing activity stream - not
// an audit log, not event sourcing. Only records changes that affect an
// acquisition decision, not every CRUD write. Each build* function is a pure
// diff check (old vs new) that returns null when nothing worth surfacing
// happened; recordPropertyActivity() is the one place that actually writes
// a row, kept deliberately best-effort (a logging failure should never break
// the write it's describing).
import type { PrismaClient, Prisma } from '@prisma/client'

export type ActivityEventType =
  | 'DECISION_CHANGED'
  | 'SCORE_CHANGED'
  | 'GIS_ENRICHED'
  | 'FEMA_UPDATED'
  | 'PURCHASE_PRICE_ADDED'
  | 'IMPORT_COMPLETED'
  | 'OUTCOME_RECORDED'

export type ActivityDraft = {
  eventType: ActivityEventType
  summary: string
  metadata: Record<string, unknown>
}

// Below this point-change, a score fluctuation is treated as noise rather
// than something worth surfacing on its own (a decision change is always
// surfaced regardless of magnitude).
const SCORE_CHANGE_THRESHOLD = 5

export function buildScoreActivity(input: {
  previousDealScore: number | null
  previousDecision: string | null
  dealScore: number
  decision: string
}): ActivityDraft | null {
  const { previousDealScore, previousDecision, dealScore, decision } = input

  if (previousDecision !== null && previousDecision !== decision) {
    return {
      eventType: 'DECISION_CHANGED',
      summary: `Decision changed: ${previousDecision} -> ${decision}`,
      metadata: { decisionFrom: previousDecision, decisionTo: decision, dealScoreFrom: previousDealScore, dealScoreTo: dealScore },
    }
  }

  if (previousDealScore !== null && Math.abs(dealScore - previousDealScore) >= SCORE_CHANGE_THRESHOLD) {
    return {
      eventType: 'SCORE_CHANGED',
      summary: `Deal score ${previousDealScore} -> ${dealScore}`,
      metadata: { dealScoreFrom: previousDealScore, dealScoreTo: dealScore },
    }
  }

  return null
}

export function buildGisEnrichedActivity(input: { wasEnriched: boolean; isEnriched: boolean }): ActivityDraft | null {
  if (!input.wasEnriched && input.isEnriched) {
    return { eventType: 'GIS_ENRICHED', summary: 'GIS/flood enrichment completed', metadata: {} }
  }
  return null
}

export function buildFemaUpdatedActivity(input: { previousFemaDisasterCount: number | null; femaDisasterCount: number | null }): ActivityDraft | null {
  if (input.previousFemaDisasterCount === null && input.femaDisasterCount !== null) {
    return {
      eventType: 'FEMA_UPDATED',
      summary: `FEMA disaster history added (${input.femaDisasterCount} county declaration${input.femaDisasterCount === 1 ? '' : 's'})`,
      metadata: { femaDisasterCount: input.femaDisasterCount },
    }
  }
  return null
}

export function buildPurchasePriceActivity(input: { previousPurchasePrice: number | null; purchasePrice: number | null }): ActivityDraft | null {
  const hadPrice = (input.previousPurchasePrice ?? 0) > 0
  const hasPrice = (input.purchasePrice ?? 0) > 0
  if (!hadPrice && hasPrice) {
    return {
      eventType: 'PURCHASE_PRICE_ADDED',
      summary: `Purchase price added: $${Math.round(input.purchasePrice ?? 0).toLocaleString()}`,
      metadata: { purchasePrice: input.purchasePrice },
    }
  }
  return null
}

export function buildImportCompletedActivity(): ActivityDraft {
  return { eventType: 'IMPORT_COMPLETED', summary: 'Added to the portfolio via import', metadata: {} }
}

export function buildOutcomeRecordedActivity(input: {
  status: string
  predictedDecision: string | null
  netProfit: number | null
}): ActivityDraft {
  const outcomeLabel = input.status === 'fell_through' ? 'Fell through' : 'Closed'
  const profitPart = input.netProfit !== null ? ` - net profit $${Math.round(input.netProfit).toLocaleString()}` : ''
  return {
    eventType: 'OUTCOME_RECORDED',
    summary: `${outcomeLabel}${input.predictedDecision ? ` (predicted ${input.predictedDecision})` : ''}${profitPart}`,
    metadata: { status: input.status, predictedDecision: input.predictedDecision, netProfit: input.netProfit },
  }
}

type PrismaLike = PrismaClient | Prisma.TransactionClient

export async function recordPropertyActivity(
  prisma: PrismaLike,
  params: { propertyId: string; userId: string; draft: ActivityDraft | null }
): Promise<void> {
  if (!params.draft) return
  try {
    await prisma.propertyActivity.create({
      data: {
        propertyId: params.propertyId,
        userId: params.userId,
        eventType: params.draft.eventType,
        summary: params.draft.summary,
        metadata: params.draft.metadata as Prisma.InputJsonValue,
      },
    })
  } catch (error: unknown) {
    console.error('Unable to record property activity', params.draft.eventType, params.propertyId, error)
  }
}

export async function recordPropertyActivities(
  prisma: PrismaLike,
  propertyId: string,
  userId: string,
  drafts: (ActivityDraft | null)[]
): Promise<void> {
  for (const draft of drafts) {
    await recordPropertyActivity(prisma, { propertyId, userId, draft })
  }
}

// A bulk import fires one IMPORT_COMPLETED row per property, which would
// otherwise flood a small "recent changes" feed with near-duplicate entries
// from the same batch. Collapse consecutive IMPORT_COMPLETED rows that are
// close together in time into a single summarized entry; every other event
// type is left as-is, since those are each independently meaningful.
const IMPORT_COLLAPSE_WINDOW_MS = 5 * 60 * 1000

export type ActivityFeedRow = {
  id: string
  propertyId: string
  eventType: string
  summary: string
  metadata: Record<string, unknown>
  createdAt: string
  address?: string | null
}

export type ActivityFeedItem = ActivityFeedRow & { count: number }

export function collapseActivityFeed(rows: ActivityFeedRow[]): ActivityFeedItem[] {
  const collapsed: ActivityFeedItem[] = []

  for (const row of rows) {
    const last = collapsed[collapsed.length - 1]
    const withinWindow = last && Math.abs(new Date(last.createdAt).getTime() - new Date(row.createdAt).getTime()) <= IMPORT_COLLAPSE_WINDOW_MS

    if (last && last.eventType === 'IMPORT_COMPLETED' && row.eventType === 'IMPORT_COMPLETED' && withinWindow) {
      last.count += 1
      last.summary = `${last.count} properties added via import`
      // A collapsed entry represents many properties, not one - it shouldn't
      // link to whichever single property happened to be first in the group.
      last.propertyId = ''
      last.address = null
      continue
    }

    collapsed.push({ ...row, count: 1 })
  }

  return collapsed
}
