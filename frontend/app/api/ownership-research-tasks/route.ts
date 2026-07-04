import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { routeOwnershipResearch } from '@/lib/ownership-research/route-ownership-research'
import { toNumber } from '@/lib/property-utils'

export const dynamic = 'force-dynamic'

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function requireUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
}

function evidenceCounty(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const county = (value as Record<string, unknown>).county
  return county ? String(county) : null
}

function serializeTask(task: {
  id: string
  propertyId: string
  skipTraceQueueId: string
  propertyAddress: string
  mailingAddress: string | null
  county: string | null
  sourcePriority: number
  researchStatus: string
  researchReason: string
  recommendedSource: string
  recoveredOwnerName: string | null
  confidence: number | null
  sourceUrl: string | null
  researchNotes: string | null
  completedAt: Date | null
  updatedAt: Date
}) {
  return {
    id: task.id,
    propertyId: task.propertyId,
    skipTraceQueueId: task.skipTraceQueueId,
    propertyAddress: task.propertyAddress,
    mailingAddress: task.mailingAddress,
    county: task.county,
    sourcePriority: task.sourcePriority,
    researchStatus: task.researchStatus,
    researchReason: task.researchReason,
    recommendedSource: task.recommendedSource,
    recoveredOwnerName: task.recoveredOwnerName,
    confidence: task.confidence,
    sourceUrl: task.sourceUrl,
    researchNotes: task.researchNotes,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    updatedAt: task.updatedAt.toISOString(),
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? '150') || 150))
  const researchStatus = url.searchParams.get('researchStatus') || undefined
  const county = url.searchParams.get('county') || undefined

  const where = {
    userId,
    ...(researchStatus ? { researchStatus } : {}),
    ...(county ? { county } : {}),
  }

  const [totalTasks, highPriority, statusCounts, countyCounts, sourceCounts, tasks] = await Promise.all([
    prisma.ownershipResearchTask.count({ where: { userId } }),
    prisma.ownershipResearchTask.count({ where: { userId, sourcePriority: { gte: 70 } } }),
    prisma.ownershipResearchTask.groupBy({
      by: ['researchStatus'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { researchStatus: 'desc' } },
    }),
    prisma.ownershipResearchTask.groupBy({
      by: ['county'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { county: 'desc' } },
    }),
    prisma.ownershipResearchTask.groupBy({
      by: ['recommendedSource'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { recommendedSource: 'desc' } },
    }),
    prisma.ownershipResearchTask.findMany({
      where,
      orderBy: [{ sourcePriority: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    }),
  ])

  return NextResponse.json({
    totalTasks,
    highPriority,
    statuses: statusCounts.map((item) => ({ researchStatus: item.researchStatus, count: item._count._all })),
    counties: countyCounts.map((item) => ({ county: item.county ?? 'Unknown', count: item._count._all })),
    sources: sourceCounts.map((item) => ({ recommendedSource: item.recommendedSource, count: item._count._all })),
    tasks: tasks.map(serializeTask),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const requestedLimit = body.limit === 'all' ? 0 : Number(body.limit ?? 0)
  const take = requestedLimit > 0 ? Math.min(10000, requestedLimit) : undefined

  const queueItems = await prisma.skipTraceExportQueue.findMany({
    where: {
      userId,
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
        where: { userId_propertyId: { userId, propertyId: item.propertyId } },
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
          userId,
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

  const totalTasks = await prisma.ownershipResearchTask.count({ where: { userId } })
  return NextResponse.json({ status: 'complete', generated, totalTasks })
}
