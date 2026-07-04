import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
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

function serialize(item: {
  id: string
  dealId: string
  assignmentPipelineId: string
  closingDate: Date | null
  titleCompany: string | null
  status: string
  finalAmount: unknown
  fundsReceivedDate: Date | null
  notes: string | null
  updatedAt: Date
}) {
  return {
    id: item.id,
    dealId: item.dealId,
    assignmentPipelineId: item.assignmentPipelineId,
    closingDate: item.closingDate ? item.closingDate.toISOString() : null,
    titleCompany: item.titleCompany,
    status: item.status,
    finalAmount: toNumber(item.finalAmount),
    fundsReceivedDate: item.fundsReceivedDate ? item.fundsReceivedDate.toISOString() : null,
    notes: item.notes,
    updatedAt: item.updatedAt.toISOString(),
  }
}

async function syncDealForClosingStatus(dealId: string, status: string, finalAmount: number | null) {
  if (status !== 'CLOSED' && status !== 'FELL_THROUGH') return
  const deal = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!deal) return
  await prisma.deal.update({
    where: { id: deal.id },
    data: {
      status: status === 'CLOSED' ? 'closed' : 'dead',
      notes: [deal.notes, status === 'CLOSED'
        ? `Closed for $${finalAmount?.toLocaleString() ?? '0'}.`
        : 'Closing fell through.'].filter(Boolean).join('\n'),
    },
  })
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100))

  const [totalClosings, closedCount, fellThroughCount, statusCounts, totalFinalAmount, items] = await Promise.all([
    prisma.closingTracker.count({ where: { userId } }),
    prisma.closingTracker.count({ where: { userId, status: 'CLOSED' } }),
    prisma.closingTracker.count({ where: { userId, status: 'FELL_THROUGH' } }),
    prisma.closingTracker.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    }),
    prisma.closingTracker.aggregate({ where: { userId, status: 'CLOSED' }, _sum: { finalAmount: true } }),
    prisma.closingTracker.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
    }),
  ])

  return NextResponse.json({
    totalClosings,
    closedCount,
    fellThroughCount,
    totalClosedVolume: toNumber(totalFinalAmount._sum.finalAmount),
    statuses: statusCounts.map((item) => ({ status: item.status, count: item._count._all })),
    items: items.map(serialize),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const assignmentPipelineId = String(body.assignmentPipelineId ?? '').trim()
  if (!assignmentPipelineId) return NextResponse.json({ error: 'assignmentPipelineId is required.' }, { status: 400 })

  const assignment = await prisma.assignmentPipeline.findFirst({ where: { id: assignmentPipelineId, userId } })
  if (!assignment) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 })

  const closingDateValue = body.closingDate ? new Date(String(body.closingDate)) : null
  const closingDate = closingDateValue && !Number.isNaN(closingDateValue.getTime()) ? closingDateValue : null
  const finalAmount = body.finalAmount !== undefined && body.finalAmount !== null && body.finalAmount !== '' ? Number(body.finalAmount) : null
  const status = body.status ? String(body.status).trim() : 'SCHEDULED'

  const closing = await prisma.closingTracker.create({
    data: {
      dealId: assignment.dealId,
      assignmentPipelineId,
      userId,
      closingDate,
      titleCompany: body.titleCompany ? String(body.titleCompany).trim() || null : null,
      status,
      finalAmount: Number.isFinite(finalAmount) ? finalAmount : null,
      notes: body.notes ? String(body.notes).trim() || null : null,
    },
  })

  await syncDealForClosingStatus(assignment.dealId, status, Number.isFinite(finalAmount) ? finalAmount : null)

  return NextResponse.json({ status: 'complete', closing: serialize(closing) }, { status: 201 })
}
