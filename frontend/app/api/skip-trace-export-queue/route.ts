import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildSkipTraceRow } from '@/lib/skip-trace/build-skip-trace-row'
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

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function serializeItem(item: {
  id: string
  propertyId: string
  ownerArtifactId: string
  propertyAddress: string
  mailingAddress: string | null
  absenteeOwner: boolean
  vacancySignal: boolean
  equitySignal: unknown
  priority: number
  recommendedChannel: string
  status: string
  updatedAt: Date
}) {
  return {
    id: item.id,
    propertyId: item.propertyId,
    ownerArtifactId: item.ownerArtifactId,
    propertyAddress: item.propertyAddress,
    mailingAddress: item.mailingAddress,
    absenteeOwner: item.absenteeOwner,
    vacancySignal: item.vacancySignal,
    equitySignal: toNumber(item.equitySignal),
    priority: item.priority,
    recommendedChannel: item.recommendedChannel,
    status: item.status,
    updatedAt: item.updatedAt.toISOString(),
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? '150') || 150))
  const status = url.searchParams.get('status') || undefined
  const recommendedChannel = url.searchParams.get('recommendedChannel') || undefined

  const where = {
    userId,
    ...(status ? { status } : {}),
    ...(recommendedChannel ? { recommendedChannel } : {}),
  }

  const [totalItems, channelCounts, statusCounts, highPriority, items] = await Promise.all([
    prisma.skipTraceExportQueue.count({ where: { userId } }),
    prisma.skipTraceExportQueue.groupBy({
      by: ['recommendedChannel'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { recommendedChannel: 'desc' } },
    }),
    prisma.skipTraceExportQueue.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    }),
    prisma.skipTraceExportQueue.count({ where: { userId, priority: { gte: 70 } } }),
    prisma.skipTraceExportQueue.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    }),
  ])

  return NextResponse.json({
    totalItems,
    highPriority,
    channels: channelCounts.map((item) => ({ recommendedChannel: item.recommendedChannel, count: item._count._all })),
    statuses: statusCounts.map((item) => ({ status: item.status, count: item._count._all })),
    items: items.map(serializeItem),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const requestedLimit = body.limit === 'all' ? 0 : Number(body.limit ?? 0)
  const take = requestedLimit > 0 ? Math.min(10000, requestedLimit) : undefined

  const ownerArtifacts = await prisma.ownerIntelligenceArtifact.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    ...(take ? { take } : {}),
    include: {
      property: {
        select: {
          address: true,
          city: true,
          state: true,
          zip: true,
          dealScores: {
            where: { userId },
            take: 1,
            orderBy: { updatedAt: 'desc' },
            select: { dealScore: true, scoreBucket: true, decision: true },
          },
          leadActionQueue: {
            where: { userId },
            take: 1,
            orderBy: { updatedAt: 'desc' },
            select: { actionType: true },
          },
        },
      },
    },
  })

  let generated = 0
  const batchSize = 250
  for (let index = 0; index < ownerArtifacts.length; index += batchSize) {
    const batch = ownerArtifacts.slice(index, index + batchSize)
    await prisma.$transaction(batch.map((artifact) => {
      const score = artifact.property.dealScores[0]
      const action = artifact.property.leadActionQueue[0]
      const propertyAddress = `${artifact.property.address}, ${artifact.property.city}, ${artifact.property.state} ${artifact.property.zip ?? ''}`.trim()
      const result = buildSkipTraceRow({
        propertyId: artifact.propertyId,
        ownerArtifactId: artifact.id,
        userId,
        propertyAddress,
        mailingAddress: artifact.mailingAddress,
        absenteeOwner: artifact.absenteeOwner,
        vacancySignal: artifact.vacancyIndicator,
        equitySignal: toNumber(artifact.equityEstimate) || null,
        ownerName: artifact.ownerName,
        contactConfidence: artifact.contactConfidence,
        phones: arrayOfStrings(artifact.phones),
        emails: arrayOfStrings(artifact.emails),
        dealScore: score?.dealScore ?? null,
        scoreBucket: score?.scoreBucket ?? null,
        decision: score?.decision ?? null,
        actionType: action?.actionType ?? null,
      })

      return prisma.skipTraceExportQueue.upsert({
        where: { userId_propertyId: { userId, propertyId: artifact.propertyId } },
        update: {
          ownerArtifactId: artifact.id,
          propertyAddress,
          mailingAddress: artifact.mailingAddress,
          absenteeOwner: artifact.absenteeOwner,
          vacancySignal: artifact.vacancyIndicator,
          equitySignal: toNumber(artifact.equityEstimate) || null,
          priority: result.priority,
          recommendedChannel: result.recommendedChannel,
          evidence: result.evidence,
        },
        create: {
          propertyId: artifact.propertyId,
          ownerArtifactId: artifact.id,
          userId,
          propertyAddress,
          mailingAddress: artifact.mailingAddress,
          absenteeOwner: artifact.absenteeOwner,
          vacancySignal: artifact.vacancyIndicator,
          equitySignal: toNumber(artifact.equityEstimate) || null,
          priority: result.priority,
          recommendedChannel: result.recommendedChannel,
          evidence: result.evidence,
        },
      })
    }))
    generated += batch.length
  }

  const totalItems = await prisma.skipTraceExportQueue.count({ where: { userId } })
  return NextResponse.json({ status: 'complete', generated, totalItems })
}
