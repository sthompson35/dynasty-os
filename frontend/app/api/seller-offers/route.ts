import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { dealStatusForOffer } from '@/lib/seller-offers/resolve-offer'
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
  propertyId: string
  dealId: string
  offerAmount: unknown
  offerType: string
  sentDate: Date | null
  expirationDate: Date | null
  status: string
  updatedAt: Date
  property?: { address: string; city: string; state: string; zip: string | null } | null
  deal?: { decision: string; status: string } | null
}) {
  return {
    id: item.id,
    propertyId: item.propertyId,
    dealId: item.dealId,
    offerAmount: toNumber(item.offerAmount),
    offerType: item.offerType,
    sentDate: item.sentDate ? item.sentDate.toISOString() : null,
    expirationDate: item.expirationDate ? item.expirationDate.toISOString() : null,
    status: item.status,
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

  const [totalOffers, sentCount, acceptedCount, rejectedCount, statusCounts, amountAvg, items] = await Promise.all([
    prisma.sellerOffer.count({ where: { userId } }),
    prisma.sellerOffer.count({ where: { userId, status: 'SENT' } }),
    prisma.sellerOffer.count({ where: { userId, status: 'ACCEPTED' } }),
    prisma.sellerOffer.count({ where: { userId, status: 'REJECTED' } }),
    prisma.sellerOffer.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    }),
    prisma.sellerOffer.aggregate({ where: { userId }, _avg: { offerAmount: true } }),
    prisma.sellerOffer.findMany({
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
    totalOffers,
    sentCount,
    acceptedCount,
    rejectedCount,
    averageOfferAmount: toNumber(amountAvg._avg.offerAmount),
    statuses: statusCounts.map((item) => ({ status: item.status, count: item._count._all })),
    items: items.map(serialize),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const propertyId = String(body.propertyId ?? '').trim()
  const dealId = String(body.dealId ?? '').trim()
  const offerAmount = Number(body.offerAmount)
  if (!propertyId || !dealId || !Number.isFinite(offerAmount) || offerAmount <= 0) {
    return NextResponse.json({ error: 'propertyId, dealId, and a positive offerAmount are required.' }, { status: 400 })
  }

  const deal = await prisma.deal.findFirst({ where: { id: dealId, userId, propertyId } })
  if (!deal) return NextResponse.json({ error: 'Deal not found for this property.' }, { status: 404 })

  const offerType = body.offerType ? String(body.offerType).trim() : 'CASH'
  const status = body.status ? String(body.status).trim() : 'SENT'
  const sentDateValue = body.sentDate ? new Date(String(body.sentDate)) : (status === 'SENT' ? new Date() : null)
  const sentDate = sentDateValue && !Number.isNaN(sentDateValue.getTime()) ? sentDateValue : null
  const expirationDateValue = body.expirationDate ? new Date(String(body.expirationDate)) : null
  const expirationDate = expirationDateValue && !Number.isNaN(expirationDateValue.getTime()) ? expirationDateValue : null

  const offer = await prisma.sellerOffer.create({
    data: {
      propertyId,
      dealId,
      userId,
      offerAmount,
      offerType,
      sentDate,
      expirationDate,
      status,
    },
    include: {
      property: { select: { address: true, city: true, state: true, zip: true } },
      deal: { select: { decision: true, status: true } },
    },
  })

  const nextDealStatus = dealStatusForOffer(status, deal.status)
  if (nextDealStatus !== deal.status) {
    await prisma.deal.update({
      where: { id: deal.id },
      data: {
        status: nextDealStatus,
        notes: [deal.notes, `Offer of $${offerAmount.toLocaleString()} (${offerType}) ${status.toLowerCase()}.`].filter(Boolean).join('\n'),
      },
    })
  }

  return NextResponse.json({ status: 'complete', offer: serialize(offer) }, { status: 201 })
}
