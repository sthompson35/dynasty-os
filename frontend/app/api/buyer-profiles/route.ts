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

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function serialize(item: {
  id: string
  name: string
  entity: string | null
  email: string | null
  phone: string | null
  buyerType: string
  fundingVerified: boolean
  fundingCapacity: unknown
  closeSpeedDays: number | null
  dealsClosedCount: number
  rating: number
  status: string
  notes: string | null
  updatedAt: Date
  criteria?: {
    id: string
    propertyTypes: unknown
    exitStrategies: unknown
    markets: unknown
    minPrice: unknown
    maxPrice: unknown
    minArv: unknown
    maxCapital: unknown
  }[]
}) {
  return {
    id: item.id,
    name: item.name,
    entity: item.entity,
    email: item.email,
    phone: item.phone,
    buyerType: item.buyerType,
    fundingVerified: item.fundingVerified,
    fundingCapacity: toNumber(item.fundingCapacity),
    closeSpeedDays: item.closeSpeedDays,
    dealsClosedCount: item.dealsClosedCount,
    rating: item.rating,
    status: item.status,
    notes: item.notes,
    updatedAt: item.updatedAt.toISOString(),
    criteria: (item.criteria ?? []).map((criteria) => ({
      id: criteria.id,
      propertyTypes: arrayOfStrings(criteria.propertyTypes),
      exitStrategies: arrayOfStrings(criteria.exitStrategies),
      markets: arrayOfStrings(criteria.markets),
      minPrice: toNumber(criteria.minPrice),
      maxPrice: toNumber(criteria.maxPrice),
      minArv: toNumber(criteria.minArv),
      maxCapital: toNumber(criteria.maxCapital),
    })),
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100))

  const [totalProfiles, activeCount, verifiedCount, typeCounts, items] = await Promise.all([
    prisma.buyerProfile.count({ where: { userId } }),
    prisma.buyerProfile.count({ where: { userId, status: 'ACTIVE' } }),
    prisma.buyerProfile.count({ where: { userId, fundingVerified: true } }),
    prisma.buyerProfile.groupBy({
      by: ['buyerType'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { buyerType: 'desc' } },
    }),
    prisma.buyerProfile.findMany({
      where: { userId },
      orderBy: [{ rating: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      include: { criteria: true },
    }),
  ])

  return NextResponse.json({
    totalProfiles,
    activeCount,
    verifiedCount,
    types: typeCounts.map((item) => ({ buyerType: item.buyerType, count: item._count._all })),
    items: items.map(serialize),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name is required.' }, { status: 400 })

  const criteriaBody = (body.criteria ?? null) as Record<string, unknown> | null

  const profile = await prisma.buyerProfile.create({
    data: {
      userId,
      name,
      entity: body.entity ? String(body.entity).trim() || null : null,
      email: body.email ? String(body.email).trim() || null : null,
      phone: body.phone ? String(body.phone).trim() || null : null,
      buyerType: body.buyerType ? String(body.buyerType).trim() : 'CASH',
      fundingVerified: Boolean(body.fundingVerified),
      fundingCapacity: body.fundingCapacity ? Number(body.fundingCapacity) : null,
      closeSpeedDays: body.closeSpeedDays ? Number(body.closeSpeedDays) : null,
      notes: body.notes ? String(body.notes).trim() || null : null,
      ...(criteriaBody
        ? {
            criteria: {
              create: {
                userId,
                propertyTypes: arrayOfStrings(criteriaBody.propertyTypes),
                exitStrategies: arrayOfStrings(criteriaBody.exitStrategies),
                markets: arrayOfStrings(criteriaBody.markets),
                minPrice: criteriaBody.minPrice ? Number(criteriaBody.minPrice) : null,
                maxPrice: criteriaBody.maxPrice ? Number(criteriaBody.maxPrice) : null,
                minArv: criteriaBody.minArv ? Number(criteriaBody.minArv) : null,
                maxCapital: criteriaBody.maxCapital ? Number(criteriaBody.maxCapital) : null,
                notes: criteriaBody.notes ? String(criteriaBody.notes).trim() || null : null,
              },
            },
          }
        : {}),
    },
    include: { criteria: true },
  })

  return NextResponse.json({ status: 'complete', profile: serialize(profile) }, { status: 201 })
}
