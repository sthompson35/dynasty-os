import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeDealOutcomeFinancials } from '@/lib/deal-outcome'
import { buildOutcomeRecordedActivity, recordPropertyActivity } from '@/lib/property-activity'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params?: {
    id?: string
  }
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  const id = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!id) {
    return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
  }

  const property = await prisma.property.findFirst({ where: { id, userId } })
  if (!property?.id) {
    return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))

  const actuals = {
    actualPurchase: toNumberOrNull(body.actualPurchase),
    actualRehab: toNumberOrNull(body.actualRehab),
    actualExit: toNumberOrNull(body.actualExit),
  }
  const { netProfit, roi } = computeDealOutcomeFinancials(actuals)

  const status: string = body.status === 'fell_through' ? 'fell_through' : 'closed'
  const closeDate = body.closeDate ? new Date(body.closeDate) : null
  const holdMonths = toNumberOrNull(body.holdMonths)
  const actualStrategy: string | null = body.actualStrategy || null
  const decisionSource: string | null = body.decisionSource || null
  const postMortemNote: string | null = body.postMortemNote || null

  const existing = await prisma.dealOutcome.findUnique({
    where: { userId_propertyId: { userId, propertyId: id } },
  })

  let outcome
  if (existing) {
    // Edits only touch the actual/outcome side - the predicted snapshot
    // stays frozen at whatever it was when the outcome was first recorded,
    // even if deal_scores has since been re-run for this property.
    outcome = await prisma.dealOutcome.update({
      where: { id: existing.id },
      data: {
        status,
        closeDate,
        actualStrategy,
        actualPurchase: actuals.actualPurchase,
        actualRehab: actuals.actualRehab,
        actualExit: actuals.actualExit,
        holdMonths,
        netProfit,
        roi,
        decisionSource,
        postMortemNote,
      },
    })
  } else {
    const dealScore = await prisma.dealScore.findUnique({
      where: { userId_propertyId: { userId, propertyId: id } },
    })

    outcome = await prisma.dealOutcome.create({
      data: {
        userId,
        propertyId: id,
        dealScoreId: dealScore?.id ?? null,
        status,
        closeDate,
        predictedDecision: dealScore?.decision ?? null,
        predictedScore: dealScore?.dealScore ?? null,
        predictedStrategy: dealScore?.strategy ?? null,
        projectedPurchase: property.purchasePrice,
        projectedRehab: property.repairCosts,
        projectedExit: property.arv,
        actualStrategy,
        actualPurchase: actuals.actualPurchase,
        actualRehab: actuals.actualRehab,
        actualExit: actuals.actualExit,
        holdMonths,
        netProfit,
        roi,
        decisionSource,
        postMortemNote,
      },
    })
  }

  await recordPropertyActivity(prisma, {
    propertyId: id,
    userId,
    draft: buildOutcomeRecordedActivity({
      status,
      predictedDecision: outcome.predictedDecision,
      netProfit: netProfit,
    }),
  })

  return NextResponse.json({ outcome: serializeDealOutcome(outcome) })
}

function serializeDealOutcome(outcome: Prisma.DealOutcomeGetPayload<Record<string, never>>) {
  return {
    id: outcome.id,
    propertyId: outcome.propertyId,
    dealScoreId: outcome.dealScoreId,
    status: outcome.status,
    closeDate: outcome.closeDate ? outcome.closeDate.toISOString() : null,
    predictedDecision: outcome.predictedDecision,
    predictedScore: outcome.predictedScore,
    predictedStrategy: outcome.predictedStrategy,
    projectedPurchase: outcome.projectedPurchase ? Number(outcome.projectedPurchase) : null,
    projectedRehab: outcome.projectedRehab ? Number(outcome.projectedRehab) : null,
    projectedExit: outcome.projectedExit ? Number(outcome.projectedExit) : null,
    actualStrategy: outcome.actualStrategy,
    actualPurchase: outcome.actualPurchase ? Number(outcome.actualPurchase) : null,
    actualRehab: outcome.actualRehab ? Number(outcome.actualRehab) : null,
    actualExit: outcome.actualExit ? Number(outcome.actualExit) : null,
    holdMonths: outcome.holdMonths ? Number(outcome.holdMonths) : null,
    netProfit: outcome.netProfit ? Number(outcome.netProfit) : null,
    roi: outcome.roi ? Number(outcome.roi) : null,
    decisionSource: outcome.decisionSource,
    postMortemNote: outcome.postMortemNote,
    createdAt: outcome.createdAt.toISOString(),
    updatedAt: outcome.updatedAt.toISOString(),
  }
}
