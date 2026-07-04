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

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const buyerProfileId = url.searchParams.get('buyerProfileId') || undefined

  const items = await prisma.buyerCriteria.findMany({
    where: { userId, ...(buyerProfileId ? { buyerProfileId } : {}) },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      buyerProfileId: item.buyerProfileId,
      propertyTypes: arrayOfStrings(item.propertyTypes),
      exitStrategies: arrayOfStrings(item.exitStrategies),
      markets: arrayOfStrings(item.markets),
      minPrice: toNumber(item.minPrice),
      maxPrice: toNumber(item.maxPrice),
      minArv: toNumber(item.minArv),
      maxCapital: toNumber(item.maxCapital),
      notes: item.notes,
    })),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const buyerProfileId = String(body.buyerProfileId ?? '').trim()
  if (!buyerProfileId) return NextResponse.json({ error: 'buyerProfileId is required.' }, { status: 400 })

  const buyerProfile = await prisma.buyerProfile.findFirst({ where: { id: buyerProfileId, userId } })
  if (!buyerProfile) return NextResponse.json({ error: 'Buyer profile not found.' }, { status: 404 })

  const criteria = await prisma.buyerCriteria.create({
    data: {
      buyerProfileId,
      userId,
      propertyTypes: arrayOfStrings(body.propertyTypes),
      exitStrategies: arrayOfStrings(body.exitStrategies),
      markets: arrayOfStrings(body.markets),
      minPrice: body.minPrice ? Number(body.minPrice) : null,
      maxPrice: body.maxPrice ? Number(body.maxPrice) : null,
      minArv: body.minArv ? Number(body.minArv) : null,
      maxCapital: body.maxCapital ? Number(body.maxCapital) : null,
      notes: body.notes ? String(body.notes).trim() || null : null,
    },
  })

  return NextResponse.json({ status: 'complete', criteriaId: criteria.id }, { status: 201 })
}
