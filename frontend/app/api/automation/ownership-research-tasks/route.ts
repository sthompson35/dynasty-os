import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readAutomationBody, requireAutomationAuth } from '@/lib/automation-auth'
import { routeOwnershipResearch } from '@/lib/ownership-research/route-ownership-research'
import { toNumber } from '@/lib/property-utils'

export const dynamic = 'force-dynamic'

function evidenceCounty(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const county = (value as Record<string, unknown>).county
  return county ? String(county) : null
}

export async function POST(request: Request) {
  const auth = await requireAutomationAuth(request)
  if (!auth.ok) return auth.response

  const body = await readAutomationBody(request)
  const requestedLimit = body.limit === 'all' ? 0 : Number(body.limit ?? 0)
  const take = requestedLimit > 0 ? Math.min(10000, requestedLimit) : undefined

  const queueItems = await prisma.skipTraceExportQueue.findMany({
    where: {
      userId: auth.userId,
      recommendedChannel: 'OWNERSHIP_RESEARCH',
    },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    ...(take ? { take } : {}),
    include: {
      ownerArtifact: {
        select: {
          evidence: true,
        },
      },
    },
  })

  let generated = 0
  const batchSize = 250
  for (let index = 0; index < queueItems.length; index += batchSize) {
    const batch = queueItems.slice(index, index + batchSize)
    await prisma.$transaction(batch.map((item) => {
      const route = routeOwnershipResearch({
        propertyAddress: item.propertyAddress,
        mailingAddress: item.mailingAddress,
        county: evidenceCounty(item.ownerArtifact.evidence),
        priority: item.priority,
        absenteeOwner: item.absenteeOwner,
        vacancySignal: item.vacancySignal,
        equitySignal: toNumber(item.equitySignal) || null,
      })

      return prisma.ownershipResearchTask.upsert({
        where: { userId_propertyId: { userId: auth.userId, propertyId: item.propertyId } },
        update: {
          skipTraceQueueId: item.id,
          propertyAddress: item.propertyAddress,
          mailingAddress: item.mailingAddress,
          county: route.county,
          sourcePriority: route.sourcePriority,
          researchReason: route.researchReason,
          recommendedSource: route.recommendedSource,
        },
        create: {
          propertyId: item.propertyId,
          skipTraceQueueId: item.id,
          userId: auth.userId,
          propertyAddress: item.propertyAddress,
          mailingAddress: item.mailingAddress,
          county: route.county,
          sourcePriority: route.sourcePriority,
          researchReason: route.researchReason,
          recommendedSource: route.recommendedSource,
        },
      })
    }))
    generated += batch.length
  }

  const totalTasks = await prisma.ownershipResearchTask.count({ where: { userId: auth.userId } })
  return NextResponse.json({
    status: 'complete',
    engine: 'ownership_research',
    generated,
    totalTasks,
    automation: true,
  })
}
