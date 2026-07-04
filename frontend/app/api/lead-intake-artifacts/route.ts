import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decisionForMotivation, scoreMotivation } from '@/lib/lead-intake/score-motivation'
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

function serializeArtifact(item: {
  id: string
  propertyId: string
  dealId: string | null
  ownerName: string | null
  contactName: string | null
  phone: string | null
  email: string | null
  contactDate: Date | null
  leadSource: string
  motivationScore: number
  askingPrice: unknown
  occupancyStatus: string | null
  timeline: string | null
  painPoints: unknown
  notes: string | null
  status: string
  updatedAt: Date
  property?: { address: string; city: string; state: string; zip: string | null } | null
  deal?: { decision: string; status: string } | null
}) {
  return {
    id: item.id,
    propertyId: item.propertyId,
    dealId: item.dealId,
    ownerName: item.ownerName,
    contactName: item.contactName,
    phone: item.phone,
    email: item.email,
    contactDate: item.contactDate ? item.contactDate.toISOString() : null,
    leadSource: item.leadSource,
    motivationScore: item.motivationScore,
    askingPrice: toNumber(item.askingPrice),
    occupancyStatus: item.occupancyStatus,
    timeline: item.timeline,
    painPoints: arrayOfStrings(item.painPoints),
    notes: item.notes,
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
  const status = url.searchParams.get('status') || undefined

  const where = { userId, ...(status ? { status } : {}) }

  const [totalArtifacts, hotLeads, syncedToDeal, statusCounts, sourceCounts, motivationAvg, items] = await Promise.all([
    prisma.leadIntakeArtifact.count({ where: { userId } }),
    prisma.leadIntakeArtifact.count({ where: { userId, motivationScore: { gte: 65 } } }),
    prisma.leadIntakeArtifact.count({ where: { userId, dealId: { not: null } } }),
    prisma.leadIntakeArtifact.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    }),
    prisma.leadIntakeArtifact.groupBy({
      by: ['leadSource'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { leadSource: 'desc' } },
    }),
    prisma.leadIntakeArtifact.aggregate({ where: { userId }, _avg: { motivationScore: true } }),
    prisma.leadIntakeArtifact.findMany({
      where,
      orderBy: [{ motivationScore: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      include: {
        property: { select: { address: true, city: true, state: true, zip: true } },
        deal: { select: { decision: true, status: true } },
      },
    }),
  ])

  return NextResponse.json({
    totalArtifacts,
    hotLeads,
    syncedToDeal,
    averageMotivation: Math.round(motivationAvg._avg.motivationScore ?? 0),
    statuses: statusCounts.map((item) => ({ status: item.status, count: item._count._all })),
    sources: sourceCounts.map((item) => ({ leadSource: item.leadSource, count: item._count._all })),
    items: items.map(serializeArtifact),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const propertyId = String(body.propertyId ?? '').trim()
  const contactName = String(body.contactName ?? '').trim()
  if (!propertyId || !contactName) {
    return NextResponse.json({ error: 'propertyId and contactName are required.' }, { status: 400 })
  }

  const property = await prisma.property.findFirst({ where: { id: propertyId, userId } })
  if (!property) return NextResponse.json({ error: 'Property not found.' }, { status: 404 })

  const ownerName = body.ownerName ? String(body.ownerName).trim() || null : null
  const phone = body.phone ? String(body.phone).trim() || null : null
  const email = body.email ? String(body.email).trim() || null : null
  const contactDateValue = body.contactDate ? new Date(String(body.contactDate)) : new Date()
  const contactDate = Number.isNaN(contactDateValue.getTime()) ? new Date() : contactDateValue
  const leadSource = body.leadSource ? String(body.leadSource).trim() : 'CALL_CAMPAIGN'
  const askingPrice = body.askingPrice !== undefined && body.askingPrice !== null && body.askingPrice !== ''
    ? Number(body.askingPrice)
    : null
  const occupancyStatus = body.occupancyStatus ? String(body.occupancyStatus).trim() : null
  const timeline = body.timeline ? String(body.timeline).trim() : null
  const painPoints = arrayOfStrings(body.painPoints)
  const notes = body.notes ? String(body.notes).trim() || null : null

  const propertyValue = toNumber(property.arv) || toNumber(property.currentValue) || null
  const motivation = scoreMotivation({
    timeline,
    painPoints,
    occupancyStatus,
    askingPrice: Number.isFinite(askingPrice) ? askingPrice : null,
    propertyValue,
  })
  const decision = decisionForMotivation(motivation.motivationScore)

  const existingDeal = await prisma.deal.findFirst({ where: { userId, propertyId } })
  const dealNoteLines = [
    `Lead intake logged ${contactDate.toISOString().slice(0, 10)} via ${leadSource.replace(/_/g, ' ').toLowerCase()}.`,
    `Contact: ${contactName}${phone ? ` - ${phone}` : ''}${email ? ` - ${email}` : ''}.`,
    ownerName ? `Owner of record: ${ownerName}.` : null,
    timeline ? `Timeline: ${timeline.replace(/_/g, ' ').toLowerCase()}.` : null,
    occupancyStatus ? `Occupancy: ${occupancyStatus.replace(/_/g, ' ').toLowerCase()}.` : null,
    askingPrice !== null && Number.isFinite(askingPrice) ? `Asking price: $${askingPrice.toLocaleString()}.` : null,
    `Motivation score: ${motivation.motivationScore}/100 (${decision}).`,
    ...motivation.factors,
    notes ? `Notes: ${notes}` : null,
  ].filter((line): line is string => Boolean(line))

  const deal = existingDeal
    ? await prisma.deal.update({
        where: { id: existingDeal.id },
        data: {
          purchasePrice: askingPrice !== null && Number.isFinite(askingPrice) ? askingPrice : existingDeal.purchasePrice,
          decision,
          notes: [existingDeal.notes, ...dealNoteLines].filter(Boolean).join('\n'),
        },
      })
    : await prisma.deal.create({
        data: {
          userId,
          propertyId,
          address: property.address,
          city: property.city,
          state: property.state,
          zip: property.zip,
          status: 'intake',
          purchasePrice: askingPrice !== null && Number.isFinite(askingPrice) ? askingPrice : null,
          decision,
          notes: dealNoteLines.join('\n'),
        },
      })

  const artifact = await prisma.leadIntakeArtifact.create({
    data: {
      propertyId,
      userId,
      dealId: deal.id,
      ownerName,
      contactName,
      phone,
      email,
      contactDate,
      leadSource,
      motivationScore: motivation.motivationScore,
      askingPrice: askingPrice !== null && Number.isFinite(askingPrice) ? askingPrice : null,
      occupancyStatus,
      timeline,
      painPoints,
      notes,
      status: 'SYNCED',
    },
    include: {
      property: { select: { address: true, city: true, state: true, zip: true } },
      deal: { select: { decision: true, status: true } },
    },
  })

  return NextResponse.json({ status: 'complete', artifact: serializeArtifact(artifact), decision }, { status: 201 })
}
