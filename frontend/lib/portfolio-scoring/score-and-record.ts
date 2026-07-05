// Shared by all 3 scoring-upsert call sites (frontend/app/api/portfolio-scores,
// frontend/app/api/automation/portfolio-scores, frontend/scripts/score-portfolio.ts)
// so the DECISION_CHANGED/SCORE_CHANGED activity check lives in exactly one
// place instead of being duplicated three times alongside the upsert logic
// it depends on.
import type { PrismaClient } from '@prisma/client'
import { scoreProperty } from './score-property'
import type { PortfolioScoringProperty } from './types'
import { buildScoreActivity, recordPropertyActivity } from '../property-activity'

const BATCH_SIZE = 250

export async function scoreBatchAndRecordActivity(
  prisma: PrismaClient,
  properties: PortfolioScoringProperty[],
  userId: string
): Promise<number> {
  let scored = 0

  for (let index = 0; index < properties.length; index += BATCH_SIZE) {
    const batch = properties.slice(index, index + BATCH_SIZE)
    const propertyIds = batch.map((property) => property.id)

    const previousScores = await prisma.dealScore.findMany({
      where: { userId, propertyId: { in: propertyIds } },
      select: { propertyId: true, dealScore: true, decision: true },
    })
    const previousByPropertyId = new Map(previousScores.map((score) => [score.propertyId, score]))

    const scoredBatch = batch.map((property) => ({ property, result: scoreProperty({ ...property, userId }) }))

    await prisma.$transaction(scoredBatch.map(({ property, result }) =>
      prisma.dealScore.upsert({
        where: { userId_propertyId: { userId, propertyId: property.id } },
        update: {
          dealScore: result.dealScore,
          riskScore: result.riskScore,
          arvConfidence: result.arvConfidence,
          capitalScore: result.capitalScore,
          strategy: result.strategy,
          decision: result.decision,
          scoreBucket: result.scoreBucket,
          reasons: result.reasons,
          inputs: result.inputs,
        },
        create: {
          propertyId: property.id,
          userId,
          dealScore: result.dealScore,
          riskScore: result.riskScore,
          arvConfidence: result.arvConfidence,
          capitalScore: result.capitalScore,
          strategy: result.strategy,
          decision: result.decision,
          scoreBucket: result.scoreBucket,
          reasons: result.reasons,
          inputs: result.inputs,
        },
      })
    ))

    for (const { property, result } of scoredBatch) {
      const previous = previousByPropertyId.get(property.id)
      const draft = buildScoreActivity({
        previousDealScore: previous?.dealScore ?? null,
        previousDecision: previous?.decision ?? null,
        dealScore: result.dealScore,
        decision: result.decision,
      })
      await recordPropertyActivity(prisma, { propertyId: property.id, userId, draft })
    }

    scored += batch.length
  }

  return scored
}
