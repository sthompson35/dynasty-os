import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { scoreBatchAndRecordActivity } from '@/lib/portfolio-scoring/score-and-record'
import { getBiggestAssumption } from '@/lib/portfolio-scoring/biggest-assumption'
import type { PortfolioDecision } from '@/lib/portfolio-scoring/types'
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

function serializeScore(userId: string, score: {
  id: string
  propertyId: string
  dealScore: number
  riskScore: number
  arvConfidence: number
  capitalScore: number
  strategy: string
  decision: string
  scoreBucket: string
  reasons: unknown
  updatedAt: Date
  property?: {
    address: string
    city: string
    state: string
    zip: string | null
    propertyType: string
    purchasePrice: unknown
    currentValue: unknown
    arv: unknown
    repairCosts: unknown
    holdingCosts: unknown
    closingCosts: unknown
    notes: string | null
    lotSize: number | null
    floodZone: string | null
    femaDisasterCount: number | null
    femaLastDisasterType: string | null
    gisEnrichedAt: Date | null
  } | null
}) {
  const purchasePrice = toNumber(score.property?.purchasePrice)
  const hasVerifiedPurchasePrice = purchasePrice > 0
  const biggestAssumption = score.property
    ? getBiggestAssumption(
        {
          id: score.propertyId,
          userId,
          address: score.property.address,
          city: score.property.city,
          state: score.property.state,
          zip: score.property.zip,
          propertyType: score.property.propertyType,
          bedrooms: null,
          bathrooms: null,
          sqft: null,
          lotSize: score.property.lotSize,
          yearBuilt: null,
          purchasePrice: score.property.purchasePrice,
          currentValue: score.property.currentValue,
          arv: score.property.arv,
          repairCosts: score.property.repairCosts,
          holdingCosts: score.property.holdingCosts,
          closingCosts: score.property.closingCosts,
          notes: score.property.notes,
          floodZone: score.property.floodZone,
          femaDisasterCount: score.property.femaDisasterCount,
          femaLastDisasterType: score.property.femaLastDisasterType,
        },
        score.decision as PortfolioDecision,
        hasVerifiedPurchasePrice
      )
    : null

  return {
    id: score.id,
    propertyId: score.propertyId,
    dealScore: score.dealScore,
    riskScore: score.riskScore,
    arvConfidence: score.arvConfidence,
    capitalScore: score.capitalScore,
    strategy: score.strategy,
    decision: score.decision,
    scoreBucket: score.scoreBucket,
    reasons: Array.isArray(score.reasons) ? score.reasons.map(String) : [],
    updatedAt: score.updatedAt.toISOString(),
    biggestAssumption,
    property: score.property ? {
      address: score.property.address,
      city: score.property.city,
      state: score.property.state,
      zip: score.property.zip,
      propertyType: score.property.propertyType,
      purchasePrice,
      currentValue: toNumber(score.property.currentValue),
      arv: toNumber(score.property.arv),
      lotSize: score.property.lotSize,
      floodZone: score.property.floodZone,
      gisEnrichedAt: score.property.gisEnrichedAt ? score.property.gisEnrichedAt.toISOString() : null,
    } : null,
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100))
  const decision = url.searchParams.get('decision') || undefined
  const scoreBucket = url.searchParams.get('bucket') || undefined
  const city = url.searchParams.get('city') || undefined
  const zip = url.searchParams.get('zip') || undefined
  const propertyType = url.searchParams.get('propertyType') || undefined

  const where = {
    userId,
    ...(decision ? { decision } : {}),
    ...(scoreBucket ? { scoreBucket } : {}),
    ...(city || zip || propertyType ? {
      property: {
        ...(city ? { city: { equals: city, mode: 'insensitive' as const } } : {}),
        ...(zip ? { zip } : {}),
        ...(propertyType ? { propertyType } : {}),
      },
    } : {}),
  }

  const [totalProperties, totalScores, bucketCounts, decisionCounts, topScores] = await Promise.all([
    prisma.property.count({ where: { userId } }),
    prisma.dealScore.count({ where: { userId } }),
    prisma.dealScore.groupBy({
      by: ['scoreBucket'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { scoreBucket: 'desc' } },
    }),
    prisma.dealScore.groupBy({
      by: ['decision'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { decision: 'desc' } },
    }),
    prisma.dealScore.findMany({
      where,
      orderBy: [{ dealScore: 'desc' }, { capitalScore: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      include: {
        property: {
          select: {
            address: true,
            city: true,
            state: true,
            zip: true,
            propertyType: true,
            purchasePrice: true,
            currentValue: true,
            arv: true,
            repairCosts: true,
            holdingCosts: true,
            closingCosts: true,
            notes: true,
            lotSize: true,
            floodZone: true,
            femaDisasterCount: true,
            femaLastDisasterType: true,
            gisEnrichedAt: true,
          },
        },
      },
    }),
  ])

  return NextResponse.json({
    totalProperties,
    totalScores,
    outstanding: Math.max(0, totalProperties - totalScores),
    buckets: bucketCounts.map((item) => ({ bucket: item.scoreBucket, count: item._count._all })),
    decisions: decisionCounts.map((item) => ({ decision: item.decision, count: item._count._all })),
    scores: topScores.map((score) => serializeScore(userId, score)),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const requestedLimit = body.limit === 'all' ? 0 : Number(body.limit ?? 0)
  const take = requestedLimit > 0 ? Math.min(10000, requestedLimit) : undefined

  const properties = await prisma.property.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    ...(take ? { take } : {}),
  })

  const scored = await scoreBatchAndRecordActivity(prisma, properties, userId)

  const totalScores = await prisma.dealScore.count({ where: { userId } })
  return NextResponse.json({ status: 'complete', scored, totalScores })
}
