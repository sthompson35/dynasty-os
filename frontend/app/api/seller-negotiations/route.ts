import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { resolveNegotiation } from '@/lib/seller-negotiations/resolve-negotiation'
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
  offerId: string
  propertyId: string
  counterAmount: unknown
  sellerResponse: string | null
  negotiationStage: string
  resolution: string | null
  updatedAt: Date
  property?: { address: string; city: string; state: string; zip: string | null } | null
  offer?: { offerAmount: unknown; status: string } | null
}) {
  return {
    id: item.id,
    offerId: item.offerId,
    propertyId: item.propertyId,
    counterAmount: toNumber(item.counterAmount),
    sellerResponse: item.sellerResponse,
    negotiationStage: item.negotiationStage,
    resolution: item.resolution,
    updatedAt: item.updatedAt.toISOString(),
    property: item.property ?? null,
    offer: item.offer ? { offerAmount: toNumber(item.offer.offerAmount), status: item.offer.status } : null,
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100))

  const [totalNegotiations, stageCounts, resolutionCounts, items] = await Promise.all([
    prisma.sellerNegotiation.count({ where: { userId } }),
    prisma.sellerNegotiation.groupBy({
      by: ['negotiationStage'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { negotiationStage: 'desc' } },
    }),
    prisma.sellerNegotiation.groupBy({
      by: ['resolution'],
      where: { userId, resolution: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { resolution: 'desc' } },
    }),
    prisma.sellerNegotiation.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
      include: {
        property: { select: { address: true, city: true, state: true, zip: true } },
        offer: { select: { offerAmount: true, status: true } },
      },
    }),
  ])

  return NextResponse.json({
    totalNegotiations,
    stages: stageCounts.map((item) => ({ negotiationStage: item.negotiationStage, count: item._count._all })),
    resolutions: resolutionCounts.map((item) => ({ resolution: item.resolution, count: item._count._all })),
    items: items.map(serialize),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const offerId = String(body.offerId ?? '').trim()
  if (!offerId) return NextResponse.json({ error: 'offerId is required.' }, { status: 400 })

  const offer = await prisma.sellerOffer.findFirst({ where: { id: offerId, userId } })
  if (!offer) return NextResponse.json({ error: 'Seller offer not found.' }, { status: 404 })

  const counterAmountRaw = body.counterAmount
  const counterAmount = counterAmountRaw !== undefined && counterAmountRaw !== null && counterAmountRaw !== ''
    ? Number(counterAmountRaw)
    : null
  const sellerResponse = body.sellerResponse ? String(body.sellerResponse).trim() || null : null
  const negotiationStage = body.negotiationStage ? String(body.negotiationStage).trim() : 'OPEN'
  const resolution = body.resolution ? String(body.resolution).trim() : null

  const negotiation = await prisma.sellerNegotiation.create({
    data: {
      offerId,
      propertyId: offer.propertyId,
      userId,
      counterAmount: Number.isFinite(counterAmount) ? counterAmount : null,
      sellerResponse,
      negotiationStage,
      resolution,
    },
    include: {
      property: { select: { address: true, city: true, state: true, zip: true } },
      offer: { select: { offerAmount: true, status: true } },
    },
  })

  if (resolution) {
    const outcome = resolveNegotiation({
      resolution,
      counterAmount: Number.isFinite(counterAmount) ? counterAmount : null,
      offerAmount: toNumber(offer.offerAmount),
    })

    await prisma.sellerOffer.update({ where: { id: offer.id }, data: { status: outcome.offerStatus } })

    const deal = await prisma.deal.findUnique({ where: { id: offer.dealId } })
    if (deal) {
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          status: outcome.dealStatus,
          purchasePrice: outcome.purchasePrice ?? deal.purchasePrice,
          decision: resolution === 'ACCEPTED' ? 'GO' : resolution === 'WALKED_AWAY' ? 'KILL' : deal.decision,
          notes: [deal.notes, `Negotiation resolved: ${resolution}${counterAmount ? ` at $${counterAmount.toLocaleString()}` : ''}.`]
            .filter(Boolean)
            .join('\n'),
        },
      })
    }
  }

  return NextResponse.json({ status: 'complete', negotiation: serialize(negotiation) }, { status: 201 })
}
