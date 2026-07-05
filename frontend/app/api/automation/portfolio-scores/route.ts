import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readAutomationBody, requireAutomationAuth } from '@/lib/automation-auth'
import { scoreProperty } from '@/lib/portfolio-scoring/score-property'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireAutomationAuth(request)
  if (!auth.ok) return auth.response

  const body = await readAutomationBody(request)
  const requestedLimit = body.limit === 'all' ? 0 : Number(body.limit ?? 0)
  const take = requestedLimit > 0 ? Math.min(10000, requestedLimit) : undefined

  const properties = await prisma.property.findMany({
    where: { userId: auth.userId },
    orderBy: { updatedAt: 'desc' },
    ...(take ? { take } : {}),
  })

  let scored = 0
  const batchSize = 250
  for (let index = 0; index < properties.length; index += batchSize) {
    const batch = properties.slice(index, index + batchSize)
    await prisma.$transaction(batch.map((property) => {
      const result = scoreProperty({
        ...property,
        userId: auth.userId,
      })

      return prisma.dealScore.upsert({
        where: {
          userId_propertyId: {
            userId: auth.userId,
            propertyId: property.id,
          },
        },
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
          userId: auth.userId,
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
    }))
    scored += batch.length
  }

  const totalScores = await prisma.dealScore.count({ where: { userId: auth.userId } })
  return NextResponse.json({
    status: 'complete',
    engine: 'portfolio_scoring',
    scored,
    totalScores,
    automation: true,
  })
}
