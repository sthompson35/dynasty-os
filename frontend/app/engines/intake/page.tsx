import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { IntakeAnalysisClient } from '@/components/dynasty/intake-analysis-client'
import { ExistingDealSignal, analyzePropertyForIntake, buildIntakeSummary } from '@/lib/intake-analysis'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Intake Analyst' }

export default async function IntakeAnalystPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) redirect('/login')

  const [properties, deals] = await Promise.all([
    prisma.property.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }],
    }).catch(() => []),
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
    }).catch(() => []),
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

  const candidates = properties
    .map((property) => {
      const key = [property.address, property.city, property.state, property.zip ?? ''].join('|').toLowerCase()
      return analyzePropertyForIntake(property, dealByPropertyId.get(property.id) ?? dealByAddress.get(key) ?? null)
    })
    .sort((a, b) => {
      if (Boolean(a.existingDeal) !== Boolean(b.existingDeal)) {
        return a.existingDeal ? 1 : -1
      }
      return b.intakeScore - a.intakeScore
    })

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <IntakeAnalysisClient initialSummary={buildIntakeSummary(candidates)} initialCandidates={candidates} />
    </main>
  )
}

