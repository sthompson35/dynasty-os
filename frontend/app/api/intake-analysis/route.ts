import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  ExistingDealSignal,
  analyzePropertyForIntake,
  buildIntakeSummary,
} from '@/lib/intake-analysis'

export const dynamic = 'force-dynamic'

function numberOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null
}

async function loadCandidates(userId: string) {
  const [properties, deals] = await Promise.all([
    prisma.property.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }],
    }),
    prisma.deal.findMany({
      where: { userId },
      select: {
        id: true,
        propertyId: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        decision: true,
        status: true,
        roi: true,
        riskScore: true,
        capitalRequired: true,
      },
    }),
  ])

  const dealByPropertyId = new Map<string, ExistingDealSignal>()
  const dealByAddress = new Map<string, ExistingDealSignal>()
  for (const deal of deals) {
    const signal = {
      id: deal.id,
      decision: deal.decision,
      status: deal.status,
      roi: deal.roi ? Number(deal.roi) : null,
      riskScore: deal.riskScore,
      capitalRequired: deal.capitalRequired ? Number(deal.capitalRequired) : null,
    }
    if (deal.propertyId) {
      dealByPropertyId.set(deal.propertyId, signal)
    }
    dealByAddress.set([deal.address, deal.city, deal.state, deal.zip ?? ''].join('|').toLowerCase(), signal)
  }

  return properties
    .map((property) => {
      const fallbackKey = [property.address, property.city, property.state, property.zip ?? ''].join('|').toLowerCase()
      const existingDeal = dealByPropertyId.get(property.id) ?? dealByAddress.get(fallbackKey) ?? null
      return analyzePropertyForIntake(property, existingDeal)
    })
    .sort((a, b) => {
      if (Boolean(a.existingDeal) !== Boolean(b.existingDeal)) {
        return a.existingDeal ? 1 : -1
      }
      return b.intakeScore - a.intakeScore
    })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const candidates = await loadCandidates(userId)
  return NextResponse.json({
    summary: buildIntakeSummary(candidates),
    candidates,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const propertyId = typeof body.propertyId === 'string' ? body.propertyId : ''
  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId is required.' }, { status: 400 })
  }

  const property = await prisma.property.findFirst({ where: { id: propertyId, userId } })
  if (!property) {
    return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
  }

  const existing = await prisma.deal.findFirst({ where: { userId, propertyId } })
  const candidate = analyzePropertyForIntake(property, existing ? {
    id: existing.id,
    decision: existing.decision,
    status: existing.status,
    roi: existing.roi ? Number(existing.roi) : null,
    riskScore: existing.riskScore,
    capitalRequired: existing.capitalRequired ? Number(existing.capitalRequired) : null,
  } : null)

  const data = {
    userId,
    propertyId: property.id,
    address: property.address,
    city: property.city,
    state: property.state,
    zip: property.zip,
    exitStrategy: candidate.recommendedStrategy,
    status: 'intake',
    purchasePrice: numberOrNull(candidate.askingOrBasis),
    arv: numberOrNull(candidate.estimatedArv),
    repairCosts: numberOrNull(candidate.estimatedRepairCost),
    holdingCosts: numberOrNull(candidate.estimatedHoldingCost),
    closingCosts: numberOrNull(candidate.estimatedClosingCost),
    mao: numberOrNull(candidate.mao),
    wholesaleFee: numberOrNull(Math.max(0, candidate.mao - candidate.askingOrBasis)),
    flipProfit: numberOrNull(candidate.projectedProfit),
    roi: numberOrNull(candidate.projectedRoi),
    riskScore: candidate.riskScore,
    decision: candidate.decision,
    capitalRequired: numberOrNull(candidate.askingOrBasis + candidate.estimatedRepairCost + candidate.estimatedHoldingCost + candidate.estimatedClosingCost),
    notes: [
      'Created by Intake Analyst.',
      `Intake score: ${candidate.intakeScore}/100.`,
      `Dynasty Fit score: ${candidate.dynastyFitScore}/100.`,
      `ATLAS recommendation: ${candidate.atlasRecommendation.action} (${candidate.atlasRecommendation.confidence}% confidence).`,
      `Recommended exit: ${candidate.atlasRecommendation.recommendedExit}.`,
      `Seller motivation score: ${candidate.sellerMotivationScore}/100.`,
      `Deal velocity score: ${candidate.dealVelocityScore}/100.`,
      `Capital score: ${candidate.capitalScore}/100.`,
      `Rehab score: ${candidate.rehabScore}/100 (${candidate.rehabLevel}).`,
      `Suggested offer: $${candidate.suggestedOffer.toLocaleString()}.`,
      ...candidate.atlasRecommendation.reason,
      ...candidate.reasons,
    ].join('\n'),
  }

  const deal = existing
    ? await prisma.deal.update({ where: { id: existing.id }, data })
    : await prisma.deal.create({ data })

  return NextResponse.json({ deal, candidate: { ...candidate, existingDeal: { id: deal.id, decision: deal.decision, status: deal.status, roi: deal.roi ? Number(deal.roi) : null, riskScore: deal.riskScore, capitalRequired: deal.capitalRequired ? Number(deal.capitalRequired) : null } } }, { status: existing ? 200 : 201 })
}
