import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateLeadAction } from '@/lib/lead-action-queue/generate-lead-action'
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

function serializeQueueItem(item: {
  id: string
  propertyId: string
  dealScoreId: string
  actionType: string
  priority: number
  status: string
  assignedTo: string | null
  nextActionDate: Date | null
  reason: string
  updatedAt: Date
  property?: {
    address: string
    city: string
    state: string
    zip: string | null
    propertyType: string
    currentValue: unknown
    arv: unknown
  } | null
  dealScore?: {
    dealScore: number
    riskScore: number
    strategy: string
    decision: string
    scoreBucket: string
  } | null
}) {
  return {
    id: item.id,
    propertyId: item.propertyId,
    dealScoreId: item.dealScoreId,
    actionType: item.actionType,
    priority: item.priority,
    status: item.status,
    assignedTo: item.assignedTo,
    nextActionDate: item.nextActionDate?.toISOString() ?? null,
    reason: item.reason,
    updatedAt: item.updatedAt.toISOString(),
    property: item.property ? {
      address: item.property.address,
      city: item.property.city,
      state: item.property.state,
      zip: item.property.zip,
      propertyType: item.property.propertyType,
      currentValue: toNumber(item.property.currentValue),
      arv: toNumber(item.property.arv),
    } : null,
    dealScore: item.dealScore,
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '150') || 150))
  const actionType = url.searchParams.get('actionType') || undefined
  const status = url.searchParams.get('status') || undefined

  const where = {
    userId,
    ...(actionType ? { actionType } : {}),
    ...(status ? { status } : {}),
  }

  const [totalItems, actionCounts, statusCounts, items] = await Promise.all([
    prisma.leadActionQueue.count({ where: { userId } }),
    prisma.leadActionQueue.groupBy({
      by: ['actionType'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { actionType: 'desc' } },
    }),
    prisma.leadActionQueue.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    }),
    prisma.leadActionQueue.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { nextActionDate: 'asc' }, { updatedAt: 'desc' }],
      take: limit,
      include: {
        property: {
          select: {
            address: true,
            city: true,
            state: true,
            zip: true,
            propertyType: true,
            currentValue: true,
            arv: true,
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
    }),
  ])

  return NextResponse.json({
    totalItems,
    actions: actionCounts.map((item) => ({ actionType: item.actionType, count: item._count._all })),
    statuses: statusCounts.map((item) => ({ status: item.status, count: item._count._all })),
    items: items.map(serializeQueueItem),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const requestedLimit = body.limit === 'all' ? 0 : Number(body.limit ?? 0)
  const take = requestedLimit > 0 ? Math.min(10000, requestedLimit) : undefined

  const scores = await prisma.dealScore.findMany({
    where: { userId },
    orderBy: [{ dealScore: 'desc' }, { updatedAt: 'desc' }],
    ...(take ? { take } : {}),
  })

  let generated = 0
  const batchSize = 250
  for (let index = 0; index < scores.length; index += batchSize) {
    const batch = scores.slice(index, index + batchSize)
    await prisma.$transaction(batch.map((score) => {
      const action = generateLeadAction({
        dealScoreId: score.id,
        propertyId: score.propertyId,
        dealScore: score.dealScore,
        riskScore: score.riskScore,
        scoreBucket: score.scoreBucket,
        decision: score.decision,
        strategy: score.strategy,
        reasons: score.reasons,
      })

      return prisma.leadActionQueue.upsert({
        where: {
          userId_propertyId: {
            userId,
            propertyId: score.propertyId,
          },
        },
        update: {
          dealScoreId: score.id,
          actionType: action.actionType,
          priority: action.priority,
          nextActionDate: action.nextActionDate,
          reason: action.reason,
        },
        create: {
          propertyId: score.propertyId,
          dealScoreId: score.id,
          userId,
          actionType: action.actionType,
          priority: action.priority,
          nextActionDate: action.nextActionDate,
          reason: action.reason,
        },
      })
    }))
    generated += batch.length
  }

  const totalItems = await prisma.leadActionQueue.count({ where: { userId } })
  return NextResponse.json({ status: 'complete', generated, totalItems })
}

export async function PATCH(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const id = String(body.id ?? '')
  if (!id) return NextResponse.json({ error: 'Queue item id is required.' }, { status: 400 })

  const status = body.status ? String(body.status) : undefined
  const assignedTo = body.assignedTo === null ? null : body.assignedTo ? String(body.assignedTo) : undefined
  const nextActionDate = body.nextActionDate ? new Date(String(body.nextActionDate)) : undefined

  const existing = await prisma.leadActionQueue.findFirst({ where: { id, userId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Queue item not found.' }, { status: 404 })

  const item = await prisma.leadActionQueue.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(assignedTo !== undefined ? { assignedTo } : {}),
      ...(nextActionDate ? { nextActionDate } : {}),
    },
  })

  return NextResponse.json({ item: serializeQueueItem(item) })
}
