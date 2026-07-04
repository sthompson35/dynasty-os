import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decisionForMotivation } from '@/lib/lead-intake/score-motivation'

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
  leadIntakeId: string
  propertyId: string
  conversationType: string
  summary: string
  objections: unknown
  motivationChanges: string | null
  nextStep: string | null
  recordedAt: Date
  updatedAt: Date
  property?: { address: string; city: string; state: string; zip: string | null } | null
  leadIntake?: { contactName: string | null; motivationScore: number; dealId: string | null } | null
}) {
  return {
    id: item.id,
    leadIntakeId: item.leadIntakeId,
    propertyId: item.propertyId,
    conversationType: item.conversationType,
    summary: item.summary,
    objections: arrayOfStrings(item.objections),
    motivationChanges: item.motivationChanges,
    nextStep: item.nextStep,
    recordedAt: item.recordedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    property: item.property ?? null,
    leadIntake: item.leadIntake ?? null,
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100))

  const [totalConversations, typeCounts, items] = await Promise.all([
    prisma.sellerConversation.count({ where: { userId } }),
    prisma.sellerConversation.groupBy({
      by: ['conversationType'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { conversationType: 'desc' } },
    }),
    prisma.sellerConversation.findMany({
      where: { userId },
      orderBy: [{ recordedAt: 'desc' }],
      take: limit,
      include: {
        property: { select: { address: true, city: true, state: true, zip: true } },
        leadIntake: { select: { contactName: true, motivationScore: true, dealId: true } },
      },
    }),
  ])

  return NextResponse.json({
    totalConversations,
    types: typeCounts.map((item) => ({ conversationType: item.conversationType, count: item._count._all })),
    items: items.map(serialize),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const leadIntakeId = String(body.leadIntakeId ?? '').trim()
  const summary = String(body.summary ?? '').trim()
  if (!leadIntakeId || !summary) {
    return NextResponse.json({ error: 'leadIntakeId and summary are required.' }, { status: 400 })
  }

  const leadIntake = await prisma.leadIntakeArtifact.findFirst({ where: { id: leadIntakeId, userId } })
  if (!leadIntake) return NextResponse.json({ error: 'Lead intake artifact not found.' }, { status: 404 })

  const conversationType = body.conversationType ? String(body.conversationType).trim() : 'CALL'
  const objections = arrayOfStrings(body.objections)
  const nextStep = body.nextStep ? String(body.nextStep).trim() || null : null
  const recordedAtValue = body.recordedAt ? new Date(String(body.recordedAt)) : new Date()
  const recordedAt = Number.isNaN(recordedAtValue.getTime()) ? new Date() : recordedAtValue

  const newMotivationScoreRaw = body.newMotivationScore
  const newMotivationScore = newMotivationScoreRaw !== undefined && newMotivationScoreRaw !== null && newMotivationScoreRaw !== ''
    ? Math.min(100, Math.max(0, Math.round(Number(newMotivationScoreRaw))))
    : null

  const operatorNote = body.motivationChanges ? String(body.motivationChanges).trim() : ''
  const autoNote = newMotivationScore !== null && newMotivationScore !== leadIntake.motivationScore
    ? `Motivation ${leadIntake.motivationScore} -> ${newMotivationScore} (${newMotivationScore > leadIntake.motivationScore ? '+' : ''}${newMotivationScore - leadIntake.motivationScore}).`
    : ''
  const motivationChanges = [operatorNote, autoNote].filter(Boolean).join(' ') || null

  const conversation = await prisma.sellerConversation.create({
    data: {
      leadIntakeId,
      propertyId: leadIntake.propertyId,
      userId,
      conversationType,
      summary,
      objections,
      motivationChanges,
      nextStep,
      recordedAt,
    },
    include: {
      property: { select: { address: true, city: true, state: true, zip: true } },
      leadIntake: { select: { contactName: true, motivationScore: true, dealId: true } },
    },
  })

  if (newMotivationScore !== null && newMotivationScore !== leadIntake.motivationScore) {
    await prisma.leadIntakeArtifact.update({
      where: { id: leadIntakeId },
      data: { motivationScore: newMotivationScore },
    })

    if (leadIntake.dealId) {
      const decision = decisionForMotivation(newMotivationScore)
      const deal = await prisma.deal.findUnique({ where: { id: leadIntake.dealId } })
      if (deal) {
        await prisma.deal.update({
          where: { id: deal.id },
          data: {
            decision,
            notes: [deal.notes, `Conversation logged ${recordedAt.toISOString().slice(0, 10)}: ${summary}`, autoNote || null]
              .filter(Boolean)
              .join('\n'),
          },
        })
      }
    }
  }

  return NextResponse.json({ status: 'complete', conversation: serialize(conversation) }, { status: 201 })
}
