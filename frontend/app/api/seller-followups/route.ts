import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

function serialize(item: {
  id: string
  conversationId: string
  propertyId: string
  followupDate: Date
  followupType: string
  assignedTo: string | null
  status: string
  notes: string | null
  updatedAt: Date
  property?: { address: string; city: string; state: string; zip: string | null } | null
  conversation?: { summary: string; conversationType: string } | null
}) {
  return {
    id: item.id,
    conversationId: item.conversationId,
    propertyId: item.propertyId,
    followupDate: item.followupDate.toISOString(),
    followupType: item.followupType,
    assignedTo: item.assignedTo,
    status: item.status,
    notes: item.notes,
    updatedAt: item.updatedAt.toISOString(),
    property: item.property ?? null,
    conversation: item.conversation ?? null,
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100))
  const status = url.searchParams.get('status') || undefined

  const [totalFollowups, openCount, overdueCount, statusCounts, items] = await Promise.all([
    prisma.sellerFollowup.count({ where: { userId } }),
    prisma.sellerFollowup.count({ where: { userId, status: 'OPEN' } }),
    prisma.sellerFollowup.count({ where: { userId, status: 'OPEN', followupDate: { lt: new Date() } } }),
    prisma.sellerFollowup.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    }),
    prisma.sellerFollowup.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: [{ followupDate: 'asc' }],
      take: limit,
      include: {
        property: { select: { address: true, city: true, state: true, zip: true } },
        conversation: { select: { summary: true, conversationType: true } },
      },
    }),
  ])

  return NextResponse.json({
    totalFollowups,
    openCount,
    overdueCount,
    statuses: statusCounts.map((item) => ({ status: item.status, count: item._count._all })),
    items: items.map(serialize),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const conversationId = String(body.conversationId ?? '').trim()
  const followupDateValue = body.followupDate ? new Date(String(body.followupDate)) : null
  if (!conversationId || !followupDateValue || Number.isNaN(followupDateValue.getTime())) {
    return NextResponse.json({ error: 'conversationId and a valid followupDate are required.' }, { status: 400 })
  }

  const conversation = await prisma.sellerConversation.findFirst({ where: { id: conversationId, userId } })
  if (!conversation) return NextResponse.json({ error: 'Seller conversation not found.' }, { status: 404 })

  const followup = await prisma.sellerFollowup.create({
    data: {
      conversationId,
      propertyId: conversation.propertyId,
      userId,
      followupDate: followupDateValue,
      followupType: body.followupType ? String(body.followupType).trim() : 'CALL',
      assignedTo: body.assignedTo ? String(body.assignedTo).trim() || null : null,
      notes: body.notes ? String(body.notes).trim() || null : null,
      status: 'OPEN',
    },
    include: {
      property: { select: { address: true, city: true, state: true, zip: true } },
      conversation: { select: { summary: true, conversationType: true } },
    },
  })

  return NextResponse.json({ status: 'complete', followup: serialize(followup) }, { status: 201 })
}
