import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { campaignTypeLabel, generateCampaignArtifact } from '@/lib/campaign-engine/generate-campaign-artifact'

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

function serializeBatch(batch: {
  id: string
  name: string
  campaignType: string
  status: string
  scheduledDate: Date | null
  totalItems: number
  completedItems: number
  createdAt: Date
  _count?: { items: number }
}) {
  return {
    id: batch.id,
    name: batch.name,
    campaignType: batch.campaignType,
    status: batch.status,
    scheduledDate: batch.scheduledDate?.toISOString() ?? null,
    totalItems: batch.totalItems,
    completedItems: batch.completedItems,
    itemCount: batch._count?.items ?? batch.totalItems,
    createdAt: batch.createdAt.toISOString(),
  }
}

function serializeItem(item: {
  id: string
  campaignType: string
  status: string
  priority: number
  artifact: unknown
  property?: {
    address: string
    city: string
    state: string
    zip: string | null
  } | null
  queueItem?: {
    actionType: string
    reason: string
  } | null
}) {
  return {
    id: item.id,
    campaignType: item.campaignType,
    status: item.status,
    priority: item.priority,
    artifact: item.artifact,
    property: item.property,
    queueItem: item.queueItem,
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const campaignType = url.searchParams.get('campaignType') || undefined
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '25') || 25))

  const [totalBatches, totalItems, typeCounts, batches, items] = await Promise.all([
    prisma.campaignBatch.count({ where: { userId } }),
    prisma.campaignItem.count({ where: { userId } }),
    prisma.campaignItem.groupBy({
      by: ['campaignType'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { campaignType: 'desc' } },
    }),
    prisma.campaignBatch.findMany({
      where: { userId, ...(campaignType ? { campaignType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { _count: { select: { items: true } } },
    }),
    prisma.campaignItem.findMany({
      where: { userId, ...(campaignType ? { campaignType } : {}) },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      include: {
        property: { select: { address: true, city: true, state: true, zip: true } },
        queueItem: { select: { actionType: true, reason: true } },
      },
    }),
  ])

  return NextResponse.json({
    totalBatches,
    totalItems,
    types: typeCounts.map((item) => ({ campaignType: item.campaignType, count: item._count._all })),
    batches: batches.map(serializeBatch),
    items: items.map(serializeItem),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const campaignType = String(body.campaignType ?? 'ALL')
  const requestedLimit = body.limit === 'all' ? 0 : Number(body.limit ?? 250)
  const take = requestedLimit > 0 ? Math.min(5000, requestedLimit) : undefined
  const includeSkip = Boolean(body.includeSkip ?? false)

  const where = {
    userId,
    status: 'OPEN',
    ...(campaignType !== 'ALL' ? { actionType: campaignType } : {}),
    ...(!includeSkip && campaignType === 'ALL' ? { actionType: { not: 'SKIP' } } : {}),
  }

  const queueItems = await prisma.leadActionQueue.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { nextActionDate: 'asc' }, { updatedAt: 'desc' }],
    ...(take ? { take } : {}),
    include: {
      property: {
        select: {
          address: true,
          city: true,
          state: true,
          zip: true,
          propertyType: true,
          bedrooms: true,
          bathrooms: true,
          sqft: true,
          lotSize: true,
          currentValue: true,
          arv: true,
          contactLinks: {
            where: { status: 'active' },
            take: 1,
            include: {
              contact: { select: { name: true, phone: true, email: true, company: true } },
            },
          },
          ownerIntelligenceArtifacts: {
            take: 1,
            orderBy: { updatedAt: 'desc' },
            select: {
              ownerName: true,
              mailingAddress: true,
              ownerType: true,
              absenteeOwner: true,
              yearsOwned: true,
              equityEstimate: true,
              vacancyIndicator: true,
              contactConfidence: true,
              phones: true,
              emails: true,
            },
          },
        },
      },
      dealScore: {
        select: {
          dealScore: true,
          riskScore: true,
          strategy: true,
          decision: true,
          scoreBucket: true,
        },
      },
    },
  })

  if (queueItems.length === 0) {
    return NextResponse.json({ status: 'empty', generated: 0, batchIds: [] })
  }

  const grouped = new Map<string, typeof queueItems>()
  for (const item of queueItems) {
    const key = item.actionType
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }

  const batchIds: string[] = []
  let generated = 0

  for (const [type, items] of grouped.entries()) {
    const batch = await prisma.campaignBatch.create({
      data: {
        userId,
        campaignType: type,
        name: `${campaignTypeLabel(type)} - ${new Date().toLocaleDateString('en-US')}`,
        status: 'READY',
        scheduledDate: new Date(),
        totalItems: items.length,
        notes: `Generated from ${items.length} ${campaignTypeLabel(type)} lead action queue item${items.length === 1 ? '' : 's'}.`,
      },
    })

    await prisma.campaignItem.createMany({
      data: items.map((item) => ({
        batchId: batch.id,
        queueItemId: item.id,
        propertyId: item.propertyId,
        userId,
        campaignType: type,
        priority: item.priority,
        artifact: generateCampaignArtifact({
          id: item.id,
          propertyId: item.propertyId,
          actionType: item.actionType,
          priority: item.priority,
          reason: item.reason,
          property: item.property,
          dealScore: item.dealScore,
        }),
      })),
    })

    batchIds.push(batch.id)
    generated += items.length
  }

  const totalItems = await prisma.campaignItem.count({ where: { userId } })
  return NextResponse.json({ status: 'complete', generated, batchIds, totalItems })
}
