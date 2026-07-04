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
  propertyId: string
  packageType: string
  askingPrice: unknown
  assignmentFee: unknown
  description: string | null
  status: string
  distributedAt: Date | null
  updatedAt: Date
  property?: { address: string; city: string; state: string; zip: string | null } | null
  deal?: { decision: string; status: string } | null
}) {
  return {
    id: item.id,
    dealId: item.dealId,
    propertyId: item.propertyId,
    packageType: item.packageType,
    askingPrice: toNumber(item.askingPrice),
    assignmentFee: toNumber(item.assignmentFee),
    description: item.description,
    status: item.status,
    distributedAt: item.distributedAt ? item.distributedAt.toISOString() : null,
    updatedAt: item.updatedAt.toISOString(),
    property: item.property ?? null,
    deal: item.deal ?? null,
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100))

  const [totalPackages, readyCount, distributedCount, statusCounts, items] = await Promise.all([
    prisma.dispositionPackage.count({ where: { userId } }),
    prisma.dispositionPackage.count({ where: { userId, status: 'READY' } }),
    prisma.dispositionPackage.count({ where: { userId, status: 'DISTRIBUTED' } }),
    prisma.dispositionPackage.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    }),
    prisma.dispositionPackage.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
      include: {
        property: { select: { address: true, city: true, state: true, zip: true } },
        deal: { select: { decision: true, status: true } },
      },
    }),
  ])

  return NextResponse.json({
    totalPackages,
    readyCount,
    distributedCount,
    statuses: statusCounts.map((item) => ({ status: item.status, count: item._count._all })),
    items: items.map(serialize),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const dealId = String(body.dealId ?? '').trim()
  if (!dealId) return NextResponse.json({ error: 'dealId is required.' }, { status: 400 })

  const deal = await prisma.deal.findFirst({ where: { id: dealId, userId } })
  if (!deal || !deal.propertyId) return NextResponse.json({ error: 'Deal not found or has no linked property.' }, { status: 404 })

  const askingPrice = body.askingPrice !== undefined && body.askingPrice !== null && body.askingPrice !== '' ? Number(body.askingPrice) : null
  const assignmentFee = body.assignmentFee !== undefined && body.assignmentFee !== null && body.assignmentFee !== '' ? Number(body.assignmentFee) : null

  const pkg = await prisma.dispositionPackage.upsert({
    where: { userId_dealId: { userId, dealId } },
    update: {
      packageType: body.packageType ? String(body.packageType).trim() : 'WHOLESALE_ASSIGNMENT',
      askingPrice: Number.isFinite(askingPrice) ? askingPrice : null,
      assignmentFee: Number.isFinite(assignmentFee) ? assignmentFee : null,
      description: body.description ? String(body.description).trim() || null : null,
      status: askingPrice !== null ? 'READY' : 'DRAFT',
    },
    create: {
      dealId,
      propertyId: deal.propertyId,
      userId,
      packageType: body.packageType ? String(body.packageType).trim() : 'WHOLESALE_ASSIGNMENT',
      askingPrice: Number.isFinite(askingPrice) ? askingPrice : null,
      assignmentFee: Number.isFinite(assignmentFee) ? assignmentFee : null,
      description: body.description ? String(body.description).trim() || null : null,
      status: askingPrice !== null ? 'READY' : 'DRAFT',
    },
    include: {
      property: { select: { address: true, city: true, state: true, zip: true } },
      deal: { select: { decision: true, status: true } },
    },
  })

  return NextResponse.json({ status: 'complete', package: serialize(pkg) }, { status: 201 })
}
