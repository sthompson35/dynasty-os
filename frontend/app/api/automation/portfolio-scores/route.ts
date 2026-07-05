import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readAutomationBody, requireAutomationAuth } from '@/lib/automation-auth'
import { scoreBatchAndRecordActivity } from '@/lib/portfolio-scoring/score-and-record'

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

  const scored = await scoreBatchAndRecordActivity(prisma, properties, auth.userId)

  const totalScores = await prisma.dealScore.count({ where: { userId: auth.userId } })
  return NextResponse.json({
    status: 'complete',
    engine: 'portfolio_scoring',
    scored,
    totalScores,
    automation: true,
  })
}
