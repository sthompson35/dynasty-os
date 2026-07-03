import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildOwnerIntelligence } from '@/lib/owner-intelligence/build-owner-intelligence'
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

function serializeArtifact(item: {
  id: string
  propertyId: string
  ownerName: string | null
  mailingAddress: string | null
  ownerType: string
  absenteeOwner: boolean
  yearsOwned: number | null
  equityEstimate: unknown
  vacancyIndicator: boolean
  contactConfidence: number
  phones: unknown
  emails: unknown
  updatedAt: Date
  property?: {
    address: string
    city: string
    state: string
    zip: string | null
  } | null
}) {
  return {
    id: item.id,
    propertyId: item.propertyId,
    ownerName: item.ownerName,
    mailingAddress: item.mailingAddress,
    ownerType: item.ownerType,
    absenteeOwner: item.absenteeOwner,
    yearsOwned: item.yearsOwned,
    equityEstimate: toNumber(item.equityEstimate),
    vacancyIndicator: item.vacancyIndicator,
    contactConfidence: item.contactConfidence,
    phones: Array.isArray(item.phones) ? item.phones.map(String) : [],
    emails: Array.isArray(item.emails) ? item.emails.map(String) : [],
    updatedAt: item.updatedAt.toISOString(),
    property: item.property,
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100))

  const [
    totalArtifacts,
    absenteeOwners,
    vacantOwners,
    withPhones,
    withEmails,
    highConfidence,
    ownerTypes,
    items,
  ] = await Promise.all([
    prisma.ownerIntelligenceArtifact.count({ where: { userId } }),
    prisma.ownerIntelligenceArtifact.count({ where: { userId, absenteeOwner: true } }),
    prisma.ownerIntelligenceArtifact.count({ where: { userId, vacancyIndicator: true } }),
    prisma.ownerIntelligenceArtifact.count({ where: { userId, phones: { not: [] } } }),
    prisma.ownerIntelligenceArtifact.count({ where: { userId, emails: { not: [] } } }),
    prisma.ownerIntelligenceArtifact.count({ where: { userId, contactConfidence: { gte: 50 } } }),
    prisma.ownerIntelligenceArtifact.groupBy({
      by: ['ownerType'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { ownerType: 'desc' } },
    }),
    prisma.ownerIntelligenceArtifact.findMany({
      where: { userId },
      orderBy: [{ contactConfidence: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      include: {
        property: { select: { address: true, city: true, state: true, zip: true } },
      },
    }),
  ])

  return NextResponse.json({
    totalArtifacts,
    absenteeOwners,
    vacantOwners,
    withPhones,
    withEmails,
    highConfidence,
    ownerTypes: ownerTypes.map((item) => ({ ownerType: item.ownerType, count: item._count._all })),
    items: items.map(serializeArtifact),
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
    select: {
      id: true,
      userId: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      notes: true,
      currentValue: true,
      purchasePrice: true,
    },
  })

  let generated = 0
  const batchSize = 250
  for (let index = 0; index < properties.length; index += batchSize) {
    const batch = properties.slice(index, index + batchSize)
    await prisma.$transaction(batch.map((property) => {
      const result = buildOwnerIntelligence({
        propertyId: property.id,
        userId,
        address: property.address,
        city: property.city,
        state: property.state,
        zip: property.zip,
        notes: property.notes,
        currentValue: property.currentValue,
        purchasePrice: property.purchasePrice,
      })

      return prisma.ownerIntelligenceArtifact.upsert({
        where: { userId_propertyId: { userId, propertyId: property.id } },
        update: {
          ownerName: result.ownerName,
          mailingAddress: result.mailingAddress,
          ownerType: result.ownerType,
          absenteeOwner: result.absenteeOwner,
          yearsOwned: result.yearsOwned,
          equityEstimate: result.equityEstimate,
          vacancyIndicator: result.vacancyIndicator,
          contactConfidence: result.contactConfidence,
          phones: result.phones,
          emails: result.emails,
          evidence: result.evidence,
        },
        create: {
          propertyId: property.id,
          userId,
          ownerName: result.ownerName,
          mailingAddress: result.mailingAddress,
          ownerType: result.ownerType,
          absenteeOwner: result.absenteeOwner,
          yearsOwned: result.yearsOwned,
          equityEstimate: result.equityEstimate,
          vacancyIndicator: result.vacancyIndicator,
          contactConfidence: result.contactConfidence,
          phones: result.phones,
          emails: result.emails,
          evidence: result.evidence,
        },
      })
    }))
    generated += batch.length
  }

  const totalArtifacts = await prisma.ownerIntelligenceArtifact.count({ where: { userId } })
  return NextResponse.json({ status: 'complete', generated, totalArtifacts })
}
