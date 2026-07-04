import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { scoreMatch } from '@/lib/buyer-matches/score-match'
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
  dealId: string
  propertyId: string
  buyerProfileId: string
  matchScore: number
  matchReasons: unknown
  status: string
  updatedAt: Date
  property?: { address: string; city: string; state: string; zip: string | null } | null
  buyerProfile?: { name: string; buyerType: string } | null
}) {
  return {
    id: item.id,
    dealId: item.dealId,
    propertyId: item.propertyId,
    buyerProfileId: item.buyerProfileId,
    matchScore: item.matchScore,
    matchReasons: Array.isArray(item.matchReasons) ? item.matchReasons.map(String) : [],
    status: item.status,
    updatedAt: item.updatedAt.toISOString(),
    property: item.property ?? null,
    buyerProfile: item.buyerProfile ?? null,
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100))

  const [totalMatches, highScore, statusCounts, items] = await Promise.all([
    prisma.buyerMatch.count({ where: { userId } }),
    prisma.buyerMatch.count({ where: { userId, matchScore: { gte: 70 } } }),
    prisma.buyerMatch.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    }),
    prisma.buyerMatch.findMany({
      where: { userId },
      orderBy: [{ matchScore: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      include: {
        property: { select: { address: true, city: true, state: true, zip: true } },
        buyerProfile: { select: { name: true, buyerType: true } },
      },
    }),
  ])

  return NextResponse.json({
    totalMatches,
    highScore,
    statuses: statusCounts.map((item) => ({ status: item.status, count: item._count._all })),
    items: items.map(serialize),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const requestedLimit = body.limit === 'all' ? 0 : Number(body.limit ?? 0)
  const take = requestedLimit > 0 ? Math.min(2000, requestedLimit) : undefined

  const [deals, buyerProfiles] = await Promise.all([
    prisma.deal.findMany({
      where: { userId, propertyId: { not: null }, decision: { not: 'KILL' }, status: { notIn: ['dead', 'closed'] } },
      ...(take ? { take } : {}),
    }),
    prisma.buyerProfile.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { criteria: true },
    }),
  ])

  const propertyIds = deals.map((deal) => deal.propertyId).filter((id): id is string => Boolean(id))
  const properties = await prisma.property.findMany({
    where: { id: { in: propertyIds }, userId },
    select: { id: true, propertyType: true, city: true, state: true },
  })
  const propertyById = new Map(properties.map((property) => [property.id, property]))

  let generated = 0
  const pairs: { dealId: string; propertyId: string; buyerProfileId: string; matchScore: number; matchReasons: string[] }[] = []

  for (const deal of deals) {
    const property = deal.propertyId ? propertyById.get(deal.propertyId) : undefined
    if (!property || !deal.propertyId) continue
    for (const buyer of buyerProfiles) {
      if (buyer.criteria.length === 0) continue
      let best: { matchScore: number; reasons: string[] } | null = null
      for (const criteria of buyer.criteria) {
        const result = scoreMatch(
          {
            exitStrategy: deal.exitStrategy,
            purchasePrice: toNumber(deal.purchasePrice) || null,
            arv: toNumber(deal.arv) || null,
            capitalRequired: toNumber(deal.capitalRequired) || null,
            propertyType: property.propertyType,
            propertyCity: property.city,
            propertyState: property.state,
          },
          {
            propertyTypes: arrayOfStrings(criteria.propertyTypes),
            exitStrategies: arrayOfStrings(criteria.exitStrategies),
            markets: arrayOfStrings(criteria.markets),
            minPrice: toNumber(criteria.minPrice) || null,
            maxPrice: toNumber(criteria.maxPrice) || null,
            minArv: toNumber(criteria.minArv) || null,
            maxCapital: toNumber(criteria.maxCapital) || null,
          },
        )
        if (!best || result.matchScore > best.matchScore) best = result
      }
      if (best && best.matchScore >= 40) {
        pairs.push({ dealId: deal.id, propertyId: deal.propertyId, buyerProfileId: buyer.id, matchScore: best.matchScore, matchReasons: best.reasons })
      }
    }
  }

  const batchSize = 250
  for (let index = 0; index < pairs.length; index += batchSize) {
    const batch = pairs.slice(index, index + batchSize)
    await prisma.$transaction(batch.map((pair) =>
      prisma.buyerMatch.upsert({
        where: { dealId_buyerProfileId: { dealId: pair.dealId, buyerProfileId: pair.buyerProfileId } },
        update: { matchScore: pair.matchScore, matchReasons: pair.matchReasons },
        create: {
          dealId: pair.dealId,
          propertyId: pair.propertyId,
          buyerProfileId: pair.buyerProfileId,
          userId,
          matchScore: pair.matchScore,
          matchReasons: pair.matchReasons,
        },
      })
    ))
    generated += batch.length
  }

  const totalMatches = await prisma.buyerMatch.count({ where: { userId } })
  return NextResponse.json({ status: 'complete', generated, totalMatches })
}
