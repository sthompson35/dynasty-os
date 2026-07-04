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
  packageId: string
  buyerProfileId: string
  buyerMatchId: string | null
  stage: string
  assignmentFee: unknown
  contractDate: Date | null
  dueDiligenceDeadline: Date | null
  emdReceived: boolean
  notes: string | null
  updatedAt: Date
  package?: { propertyId: string } | null
  buyerProfile?: { name: string; buyerType: string } | null
}) {
  return {
    id: item.id,
    dealId: item.dealId,
    packageId: item.packageId,
    buyerProfileId: item.buyerProfileId,
    buyerMatchId: item.buyerMatchId,
    stage: item.stage,
    assignmentFee: toNumber(item.assignmentFee),
    contractDate: item.contractDate ? item.contractDate.toISOString() : null,
    dueDiligenceDeadline: item.dueDiligenceDeadline ? item.dueDiligenceDeadline.toISOString() : null,
    emdReceived: item.emdReceived,
    notes: item.notes,
    updatedAt: item.updatedAt.toISOString(),
    propertyId: item.package?.propertyId ?? null,
    buyerProfile: item.buyerProfile ?? null,
  }
}

export async function GET(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') ?? '100') || 100))

  const [totalPipeline, stageCounts, items] = await Promise.all([
    prisma.assignmentPipeline.count({ where: { userId } }),
    prisma.assignmentPipeline.groupBy({
      by: ['stage'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { stage: 'desc' } },
    }),
    prisma.assignmentPipeline.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
      include: {
        package: { select: { propertyId: true } },
        buyerProfile: { select: { name: true, buyerType: true } },
      },
    }),
  ])

  return NextResponse.json({
    totalPipeline,
    stages: stageCounts.map((item) => ({ stage: item.stage, count: item._count._all })),
    items: items.map(serialize),
  })
}

export async function POST(request: Request) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const packageId = String(body.packageId ?? '').trim()
  const buyerProfileId = String(body.buyerProfileId ?? '').trim()
  if (!packageId || !buyerProfileId) {
    return NextResponse.json({ error: 'packageId and buyerProfileId are required.' }, { status: 400 })
  }

  const pkg = await prisma.dispositionPackage.findFirst({ where: { id: packageId, userId } })
  if (!pkg) return NextResponse.json({ error: 'Disposition package not found.' }, { status: 404 })

  const buyerMatchId = body.buyerMatchId ? String(body.buyerMatchId).trim() || null : null
  const assignmentFee = body.assignmentFee !== undefined && body.assignmentFee !== null && body.assignmentFee !== ''
    ? Number(body.assignmentFee)
    : toNumber(pkg.assignmentFee) || null
  const contractDateValue = body.contractDate ? new Date(String(body.contractDate)) : new Date()
  const contractDate = Number.isNaN(contractDateValue.getTime()) ? new Date() : contractDateValue
  const dueDiligenceValue = body.dueDiligenceDeadline ? new Date(String(body.dueDiligenceDeadline)) : null
  const dueDiligenceDeadline = dueDiligenceValue && !Number.isNaN(dueDiligenceValue.getTime()) ? dueDiligenceValue : null

  const assignment = await prisma.assignmentPipeline.create({
    data: {
      dealId: pkg.dealId,
      packageId,
      buyerProfileId,
      buyerMatchId,
      userId,
      assignmentFee,
      contractDate,
      dueDiligenceDeadline,
      notes: body.notes ? String(body.notes).trim() || null : null,
    },
    include: {
      package: { select: { propertyId: true } },
      buyerProfile: { select: { name: true, buyerType: true } },
    },
  })

  await prisma.dispositionPackage.update({ where: { id: packageId }, data: { status: 'DISTRIBUTED', distributedAt: new Date() } })

  if (buyerMatchId) {
    await prisma.buyerMatch.update({ where: { id: buyerMatchId }, data: { status: 'ACCEPTED' } })
    await prisma.buyerMatch.updateMany({
      where: { dealId: pkg.dealId, userId, id: { not: buyerMatchId } },
      data: { status: 'PASSED' },
    })
  }

  const deal = await prisma.deal.findUnique({ where: { id: pkg.dealId } })
  if (deal && deal.status !== 'closed' && deal.status !== 'dead') {
    await prisma.deal.update({
      where: { id: deal.id },
      data: {
        status: 'assigned',
        notes: [deal.notes, `Assigned to buyer for $${assignmentFee?.toLocaleString() ?? '0'} fee.`].filter(Boolean).join('\n'),
      },
    })
  }

  return NextResponse.json({ status: 'complete', assignment: serialize(assignment) }, { status: 201 })
}
