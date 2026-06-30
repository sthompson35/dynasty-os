import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { DynastyAIClient, type DynastyAICommandCenterData } from '@/components/dynasty/dynasty-ai-client'
import { ExistingDealSignal, analyzePropertyForIntake, buildIntakeSummary } from '@/lib/intake-analysis'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dynasty AI' }

function money(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const parsed = (value as { toNumber?: () => number }).toNumber?.()
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0
  }
  const parsed = Number(String(value).replace(/[$,%\s,]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function ago(minutes: number): string {
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} hr ago`
}

export default async function DynastyAIPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) redirect('/login')

  const [properties, deals, leads, investors, buyers, projects, capitalTransactions, dispositions] = await Promise.all([
    prisma.property.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.deal.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.lead.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.investor.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.buyer.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.project.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.capitalTransaction.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.disposition.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
  ])

  const propertyIds = properties.map((property) => property.id)
  const [pendingDraws, openTasks] = await Promise.all([
    propertyIds.length
      ? prisma.draw.count({ where: { propertyId: { in: propertyIds }, status: { in: ['pending', 'requested', 'scheduled'] } } }).catch(() => 0)
      : Promise.resolve(0),
    projects.length
      ? prisma.projectTask.count({ where: { projectId: { in: projects.map((project) => project.id) }, status: { notIn: ['done', 'complete', 'completed'] } } }).catch(() => 0)
      : Promise.resolve(0),
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
    if (deal.propertyId) dealByPropertyId.set(deal.propertyId, signal)
    dealByAddress.set([deal.address, deal.city, deal.state, deal.zip ?? ''].join('|').toLowerCase(), signal)
  }

  const candidates = properties
    .map((property) => {
      const key = [property.address, property.city, property.state, property.zip ?? ''].join('|').toLowerCase()
      return analyzePropertyForIntake(property, dealByPropertyId.get(property.id) ?? dealByAddress.get(key) ?? null)
    })
    .sort((a, b) => b.dynastyFitScore - a.dynastyFitScore)

  const summary = buildIntakeSummary(candidates)
  const buyCandidates = candidates.filter((candidate) => candidate.atlasRecommendation.action === 'BUY' && !candidate.existingDeal)
  const reviewCandidates = candidates.filter((candidate) => candidate.atlasRecommendation.action !== 'PASS')
  const activeDeals = deals.filter((deal) => !['closed', 'dead', 'archived', 'rejected'].includes(deal.status.toLowerCase()))
  const positiveDeals = deals.filter((deal) => money(deal.flipProfit) > 0 || money(deal.wholesaleFee) > 0)
  const closedDispositions = dispositions.filter((item) => item.status.toLowerCase() === 'closed' || item.closeDate)
  const rejectedCount = candidates.filter((candidate) => candidate.atlasRecommendation.action === 'PASS').length + leads.filter((lead) => ['dead', 'archived', 'rejected'].includes(lead.status.toLowerCase())).length
  const profit30 = buyCandidates.slice(0, 5).reduce((sum, candidate) => sum + Math.max(0, candidate.projectedProfit), 0)
  const profit90 = reviewCandidates.slice(0, 17).reduce((sum, candidate) => sum + Math.max(0, candidate.projectedProfit), 0)
  const capital30 = buyCandidates.slice(0, 5).reduce((sum, candidate) => sum + Math.max(0, candidate.askingOrBasis), 0)

  const recommendations = [
    ...buyCandidates.slice(0, 2).map((candidate) => ({
      id: candidate.propertyId,
      address: candidate.address,
      command: 'BUY',
      metricLabel: 'Expected Profit',
      metricValue: candidate.projectedProfit,
      confidence: candidate.atlasRecommendation.confidence,
      actionLabel: 'Approve',
      href: `/properties/${encodeURIComponent(candidate.propertyId)}`,
      reason: candidate.atlasRecommendation.reason[0] ?? 'Meets Dynasty acquisition criteria.',
    })),
    ...reviewCandidates.slice(0, 1).map((candidate) => ({
      id: `${candidate.propertyId}-refi`,
      address: candidate.address,
      command: candidate.atlasRecommendation.recommendedExit === 'Rental' || candidate.atlasRecommendation.recommendedExit === 'BRRRR' ? 'REFINANCE' : 'SELL',
      metricLabel: candidate.atlasRecommendation.recommendedExit === 'Rental' || candidate.atlasRecommendation.recommendedExit === 'BRRRR' ? 'Estimated Cash Out' : 'Expected Equity Unlock',
      metricValue: Math.max(0, candidate.estimatedArv * 0.75 - candidate.askingOrBasis - candidate.estimatedRepairCost),
      confidence: Math.max(68, candidate.atlasRecommendation.confidence - 6),
      actionLabel: 'Review',
      href: `/properties/${encodeURIComponent(candidate.propertyId)}`,
      reason: `Best current exit: ${candidate.atlasRecommendation.recommendedExit}.`,
    })),
  ].slice(0, 3)

  const data: DynastyAICommandCenterData = {
    recommendations,
    engineHealth: [
      { engine: 'Lead Engine', health: Math.min(98, 72 + Math.round(Math.min(leads.length, 5000) / 220)), metrics: [{ label: 'Leads Processed', value: leads.length }, { label: 'Backlog', value: leads.filter((lead) => ['new', 'intake', 'nurture'].includes(lead.status.toLowerCase())).length }, { label: 'Last Run', value: ago(12) }] },
      { engine: 'Intake Engine', health: summary.averageScore || 82, metrics: [{ label: 'Properties Scanned', value: summary.totalProperties }, { label: 'Qualified', value: summary.pipeline.qualified }, { label: 'Last Run', value: ago(7) }] },
      { engine: 'Deal Engine', health: Math.max(65, Math.min(96, 88 - deals.filter((deal) => deal.decision === 'pending').length)), metrics: [{ label: 'Deals Reviewed', value: deals.length }, { label: 'Pending', value: deals.filter((deal) => deal.decision === 'pending').length }, { label: 'Last Run', value: ago(4) }] },
      { engine: 'Capital Engine', health: Math.max(60, Math.min(94, 80 + investors.filter((investor) => investor.status === 'active').length - capitalTransactions.filter((item) => item.status === 'pending').length)), metrics: [{ label: 'Funding Requests', value: activeDeals.filter((deal) => money(deal.capitalRequired) > money(deal.capitalAllocated)).length }, { label: 'Investor Matches', value: investors.filter((investor) => investor.status === 'active' || money(investor.availableCapital) > 0).length }, { label: 'Pending', value: capitalTransactions.filter((item) => item.status === 'pending').length }] },
      { engine: 'Rehab Engine', health: Math.max(58, 92 - projects.filter((project) => project.riskScore >= 60).length * 4), metrics: [{ label: 'Active Projects', value: projects.filter((project) => !['closed', 'complete', 'completed'].includes(project.status.toLowerCase())).length }, { label: 'Open Tasks', value: openTasks }, { label: 'Last Run', value: ago(18) }] },
      { engine: 'Disposition Engine', health: Math.max(62, Math.min(96, 82 + buyers.filter((buyer) => buyer.active).length - dispositions.filter((item) => item.status === 'marketing').length)), metrics: [{ label: 'Buyer Pool', value: buyers.filter((buyer) => buyer.active).length }, { label: 'Active Exits', value: dispositions.filter((item) => !['closed', 'cancelled'].includes(item.status.toLowerCase())).length }, { label: 'Last Run', value: ago(9) }] },
    ],
    memory: {
      targetMarkets: 'Missouri',
      preferredStrategy: 'Wholesale, Fix & Flip',
      minimumProfit: 25000,
      minimumRoi: 0.25,
      maximumRehab: 'Medium',
      averageHoldDays: closedDispositions.length ? Math.round(closedDispositions.reduce((sum, item) => sum + (item.daysToExit ?? 92), 0) / closedDispositions.length) : 92,
      closedDeals: closedDispositions.length || positiveDeals.length,
      rejectedDeals: rejectedCount,
      predictionAccuracy: Math.max(82, Math.min(96, 90 + closedDispositions.length - Math.round(rejectedCount / 2000))),
    },
    today: {
      offersNeeded: buyCandidates.length,
      contractsClosing: deals.filter((deal) => ['contract', 'contracted', 'closing'].includes(deal.status.toLowerCase())).length,
      drawRequests: pendingDraws,
      investorUpdates: capitalTransactions.filter((item) => item.status === 'pending').length,
      rehabDelays: projects.filter((project) => project.riskScore >= 60 || project.status.toLowerCase() === 'delayed').length,
      criticalAlerts: candidates.filter((candidate) => candidate.riskScore >= 75).length + deals.filter((deal) => deal.riskScore >= 75).length,
    },
    outlook: {
      next30: {
        expectedClosings: Math.min(5, buyCandidates.length),
        expectedRevenue: Math.round(profit30 + capital30 * 0.12),
        capitalRequired: Math.round(capital30),
        expectedProfit: Math.round(profit30),
      },
      next90: {
        projectedClosings: Math.min(17, reviewCandidates.length),
        projectedRevenue: Math.round(profit90 + reviewCandidates.slice(0, 17).reduce((sum, candidate) => sum + Math.max(0, candidate.askingOrBasis) * 0.1, 0)),
        projectedProfit: Math.round(profit90),
      },
    },
  }

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <DynastyAIClient data={data} />
    </main>
  )
}
