import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { DynastyAIClient, type DynastyAICommandCenterData, type AtlasRecommendationCommand } from '@/components/dynasty/dynasty-ai-client'
import { type TopDecisionItem } from '@/components/dynasty/atlas-decisions-panel'
import { ExistingDealSignal, analyzePropertyForIntake, buildIntakeSummary } from '@/lib/intake-analysis'
import { getAgentArchitecture } from '@/lib/dynasty-architecture'
import { computeInvestorQualification } from '@/lib/investor-qualification'

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

function sinceDate(date: Date | undefined | null): string {
  if (!date) return 'no activity'
  const minutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

function topStates(arr: { state: string }[], n = 2): string {
  const counts = new Map<string, number>()
  for (const item of arr) {
    const s = item.state?.trim()
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([s]) => s)
    .join(', ') || 'No data'
}

function toNextAction(decision: string, reasons: unknown): string {
  if (decision === 'RENEGOTIATE') return 'Prepare revised offer'
  const list = Array.isArray(reasons) ? (reasons as unknown[]).map(String) : []
  const first = (list[0] ?? '').toLowerCase()
  if (first.includes('price') || first.includes('purchase')) return 'Get a firm asking price'
  if (first.includes('gis') || first.includes('flood') || first.includes('zone')) return 'Run GIS enrichment'
  return 'Begin offer package'
}

export default async function DynastyAIPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) redirect('/login')

  // Buyer/disposition stats are sourced from the Disposition Command Center's
  // BuyerProfile / DispositionPackage / ClosingTracker pipeline, not the legacy
  // Buyer/Disposition CRM behind /engines/disposition.
  const [properties, deals, leads, investors, buyerProfiles, projects, capitalTransactions, dispositionPackages, closingRecords, architecture] = await Promise.all([
    prisma.property.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.deal.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.lead.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.investor.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.buyerProfile.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.project.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.capitalTransaction.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.dispositionPackage.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    prisma.closingTracker.findMany({ where: { userId }, orderBy: [{ updatedAt: 'desc' }] }).catch(() => []),
    getAgentArchitecture(),
  ])

  const propertyIds = properties.map((property) => property.id)
  const [pendingDraws, openTasks, topDecisionScores, goDealScoreCount, blockedTaskCount, blockedTasks, strategyGroups, dealOutcomeTotal, dealOutcomeProfitable] = await Promise.all([
    propertyIds.length
      ? prisma.draw.count({ where: { propertyId: { in: propertyIds }, status: { in: ['pending', 'requested', 'scheduled'] } } }).catch(() => 0)
      : Promise.resolve(0),
    projects.length
      ? prisma.projectTask.count({ where: { projectId: { in: projects.map((project) => project.id) }, status: { notIn: ['done', 'complete', 'completed'] } } }).catch(() => 0)
      : Promise.resolve(0),
    prisma.dealScore.findMany({
      where: { userId, decision: { in: ['GO', 'RENEGOTIATE'] } },
      orderBy: [{ dealScore: 'desc' }, { capitalScore: 'desc' }],
      take: 10,
      include: { property: { select: { address: true, city: true, state: true, propertyType: true } } },
    }).catch(() => []),
    // Real cross-engine signals for the "Top 10 Decisions Today" card below -
    // reuses topDecisionScores above for the acquisition slice rather than a
    // second dealScore query.
    prisma.dealScore.count({ where: { userId, decision: 'GO' } }).catch(() => 0),
    prisma.projectTask.count({ where: { status: 'blocked', project: { userId } } }).catch(() => 0),
    prisma.projectTask.findMany({
      where: { status: 'blocked', project: { userId } },
      orderBy: { updatedAt: 'asc' },
      take: 2,
      include: { project: { select: { name: true } } },
    }).catch(() => []),
    prisma.dealScore.groupBy({
      by: ['strategy'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { strategy: 'desc' } },
      take: 1,
    }).catch(() => []),
    prisma.dealOutcome.count({ where: { userId } }).catch(() => 0),
    prisma.dealOutcome.count({ where: { userId, status: 'closed', netProfit: { gt: 0 } } }).catch(() => 0),
  ])

  const topDecisions: TopDecisionItem[] = topDecisionScores.map((score) => ({
    propertyId: score.propertyId,
    address: score.property?.address ?? 'Unknown address',
    city: score.property?.city ?? '',
    state: score.property?.state ?? '',
    dealScore: score.dealScore,
    riskScore: score.riskScore,
    decision: score.decision,
    scoreBucket: score.scoreBucket,
    strategy: score.strategy,
    reasons: Array.isArray(score.reasons) ? (score.reasons as unknown[]).map(String) : [],
    nextAction: toNextAction(score.decision, score.reasons),
    updatedAt: score.updatedAt.toISOString(),
  }))

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
  const reviewCandidates = candidates.filter((candidate) => candidate.atlasRecommendation.action !== 'PASS')
  const activeDeals = deals.filter((deal) => !['closed', 'dead', 'archived', 'rejected'].includes(deal.status.toLowerCase()))
  const closingDeals = deals.filter((deal) => ['contract', 'contracted', 'closing'].includes(deal.status.toLowerCase()))
  const positiveDeals = deals.filter((deal) => money(deal.flipProfit) > 0 || money(deal.wholesaleFee) > 0)
  const closedClosings = closingRecords.filter((item) => item.status === 'CLOSED')
  const dealById = new Map(deals.map((deal) => [deal.id, deal]))
  const holdDaysFor = (closing: (typeof closingRecords)[number]) => {
    const deal = dealById.get(closing.dealId)
    if (!deal || !closing.closingDate) return 92
    const days = Math.round((closing.closingDate.getTime() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    return Number.isFinite(days) && days >= 0 ? days : 92
  }
  const rejectedCount = candidates.filter((candidate) => candidate.atlasRecommendation.action === 'PASS').length + leads.filter((lead) => ['dead', 'archived', 'rejected'].includes(lead.status.toLowerCase())).length
  const profit90 = reviewCandidates.slice(0, 17).reduce((sum, candidate) => sum + Math.max(0, candidate.projectedProfit), 0)

  // "Top 10 Decisions Today" - the single highest-priority item from each
  // engine, not a fourth competing acquisition-only queue (Acquisition
  // Command Center already has Top 20 / Lead Action Queue / Top Opportunities
  // for that). Each engine contributes only what's real - an engine with no
  // qualifying rows contributes zero items rather than a filler placeholder.
  // Acquisition reuses topDecisionScores (already fetched above for the
  // Acquisition Deal Queue panel) rather than a second dealScore query.

  const acquisitionItems: AtlasRecommendationCommand[] = topDecisionScores.slice(0, 3).map((score) => ({
    id: score.id,
    engine: 'Acquisition',
    title: score.property?.address ?? 'Unknown address',
    command: score.decision === 'GO' ? 'BUY' : 'REVIEW',
    metricLabel: 'Deal Score',
    metricValue: score.dealScore,
    metricFormat: 'integer',
    confidence: score.dealScore,
    actionLabel: score.decision === 'GO' ? 'Approve' : 'Review',
    href: `/properties/${encodeURIComponent(score.propertyId)}`,
    reason: (Array.isArray(score.reasons) ? (score.reasons as unknown[]).map(String) : [])[0] ?? `${score.decision} on ${score.strategy}.`,
  }))

  const activeInvestors = investors.filter((investor) => investor.status !== 'inactive')
  const capitalItems: AtlasRecommendationCommand[] = activeInvestors
    .map((investor) => ({
      investor,
      qualification: computeInvestorQualification({
        status: investor.status,
        availableCapital: investor.availableCapital ? Number(investor.availableCapital) : null,
        preferredReturn: investor.preferredReturn ? Number(investor.preferredReturn) : null,
        markets: investor.markets,
        email: investor.email,
        phone: investor.phone,
        evidenceSource: investor.evidenceSource,
        hasPriorCapitalActivity: capitalTransactions.some((t) => t.investorId === investor.id),
      }),
    }))
    .sort((a, b) => b.qualification.score - a.qualification.score)
    .slice(0, 2)
    .map(({ investor, qualification }) => ({
      id: investor.id,
      engine: 'Capital' as const,
      title: investor.name,
      command: 'CONTACT',
      metricLabel: 'Qualification',
      metricValue: qualification.score,
      metricFormat: 'integer' as const,
      confidence: qualification.score,
      actionLabel: 'Contact',
      href: '/engines/capital',
      reason: qualification.reasons[0] ?? 'Worth a check-in.',
    }))

  const operationsItems: AtlasRecommendationCommand[] = blockedTasks.map((task) => {
    const daysBlocked = Math.max(0, Math.round((Date.now() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)))
    return {
      id: task.id,
      engine: 'Operations' as const,
      title: task.description,
      command: 'UNBLOCK',
      metricLabel: 'Days Blocked',
      metricValue: daysBlocked,
      metricFormat: 'integer' as const,
      confidence: 100,
      actionLabel: 'Unblock',
      href: '/engines/operations',
      reason: `Blocked on ${task.project.name}.`,
    }
  })

  const packagedDealIds = new Set(dispositionPackages.map((item) => item.dealId))
  const dispositionableDeals = deals.filter((deal) => deal.decision !== 'kill' && !['dead', 'closed'].includes(deal.status.toLowerCase()) && !packagedDealIds.has(deal.id))
  const dispositionItems: AtlasRecommendationCommand[] = dispositionableDeals
    .slice(0, 2)
    .map((deal) => ({
      id: deal.id,
      engine: 'Disposition' as const,
      title: deal.address,
      command: 'PACKAGE',
      metricLabel: 'Wholesale Fee',
      metricValue: money(deal.wholesaleFee) || money(deal.flipProfit),
      metricFormat: 'currency' as const,
      confidence: 100 - deal.riskScore,
      actionLabel: 'Create Package',
      href: '/disposition-command-center',
      reason: 'Cleared for disposition, no package created yet.',
    }))

  const recommendations: AtlasRecommendationCommand[] = [
    ...acquisitionItems,
    ...capitalItems,
    ...operationsItems,
    ...dispositionItems,
  ].slice(0, 10)

  const data: DynastyAICommandCenterData = {
    recommendations,
    topDecisions,
    engineHealth: [
      { engine: 'Lead Engine', health: Math.min(98, 72 + Math.round(Math.min(leads.length, 5000) / 220)), metrics: [{ label: 'Leads Processed', value: leads.length }, { label: 'Backlog', value: leads.filter((lead) => ['new', 'intake', 'nurture'].includes(lead.status.toLowerCase())).length }, { label: 'Last Activity', value: sinceDate(leads[0]?.updatedAt) }] },
      { engine: 'Intake Engine', health: summary.averageScore || 82, metrics: [{ label: 'Properties Scanned', value: summary.totalProperties }, { label: 'Qualified', value: summary.pipeline.qualified }, { label: 'Last Activity', value: sinceDate(properties[0]?.updatedAt) }] },
      { engine: 'Deal Engine', health: Math.max(65, Math.min(96, 88 - deals.filter((deal) => deal.decision === 'pending').length)), metrics: [{ label: 'Deals Reviewed', value: deals.length }, { label: 'Pending', value: deals.filter((deal) => deal.decision === 'pending').length }, { label: 'Last Activity', value: sinceDate(deals[0]?.updatedAt) }] },
      { engine: 'Capital Engine', health: Math.max(60, Math.min(94, 80 + investors.filter((investor) => investor.status === 'active').length - capitalTransactions.filter((item) => item.status === 'pending').length)), metrics: [{ label: 'Funding Requests', value: activeDeals.filter((deal) => money(deal.capitalRequired) > money(deal.capitalAllocated)).length }, { label: 'Investor Matches', value: investors.filter((investor) => investor.status === 'active' || money(investor.availableCapital) > 0).length }, { label: 'Pending', value: capitalTransactions.filter((item) => item.status === 'pending').length }] },
      { engine: 'Rehab Engine', health: Math.max(58, 92 - projects.filter((project) => project.riskScore >= 60).length * 4), metrics: [{ label: 'Active Projects', value: projects.filter((project) => !['closed', 'complete', 'completed'].includes(project.status.toLowerCase())).length }, { label: 'Open Tasks', value: openTasks }, { label: 'Last Activity', value: sinceDate(projects[0]?.updatedAt) }] },
      { engine: 'Disposition Engine', health: Math.max(62, Math.min(96, 82 + buyerProfiles.filter((buyer) => buyer.status === 'ACTIVE').length - dispositionPackages.filter((item) => item.status === 'READY').length)), metrics: [{ label: 'Buyer Pool', value: buyerProfiles.filter((buyer) => buyer.status === 'ACTIVE').length }, { label: 'Active Exits', value: dispositionPackages.length - closedClosings.length }, { label: 'Last Activity', value: sinceDate(dispositionPackages[0]?.updatedAt ?? closingRecords[0]?.updatedAt) }] },
    ],
    memory: {
      targetMarkets: topStates(properties),
      preferredStrategy: (strategyGroups[0] as { strategy: string } | undefined)?.strategy ?? 'Wholesale',
      minimumProfit: 25000,
      minimumRoi: 0.25,
      maximumRehab: 'Medium',
      averageHoldDays: closedClosings.length ? Math.round(closedClosings.reduce((sum, item) => sum + holdDaysFor(item), 0) / closedClosings.length) : 92,
      closedDeals: closedClosings.length || positiveDeals.length,
      rejectedDeals: rejectedCount,
      predictionAccuracy: dealOutcomeTotal > 0
        ? Math.round((dealOutcomeProfitable / dealOutcomeTotal) * 100)
        : Math.max(82, Math.min(96, 90 + closedClosings.length - Math.round(rejectedCount / 2000))),
    },
    today: {
      // Real signals, same sources as the recommendations above - not
      // re-derived from the thin Deal/candidate data engineHealth/memory/
      // outlook below still use (out of scope for this pass).
      offersNeeded: goDealScoreCount,
      contractsClosing: closedClosings.length,
      drawRequests: pendingDraws,
      investorUpdates: activeInvestors.length,
      rehabDelays: blockedTaskCount,
      criticalAlerts: dispositionableDeals.length,
    },
    outlook: {
      next30: {
        expectedClosings: closingDeals.length,
        expectedRevenue: Math.round(
          closingDeals.reduce((s, d) => s + money(d.flipProfit) + money(d.wholesaleFee), 0) ||
          closingDeals.reduce((s, d) => s + money(d.capitalRequired), 0) * 0.12
        ),
        capitalRequired: Math.round(closingDeals.reduce((s, d) => s + money(d.capitalRequired), 0)),
        expectedProfit: Math.round(closingDeals.reduce((s, d) => s + money(d.flipProfit) + money(d.wholesaleFee), 0)),
      },
      next90: {
        projectedClosings: Math.min(activeDeals.length, reviewCandidates.length),
        projectedRevenue: Math.round(profit90 + reviewCandidates.slice(0, 17).reduce((sum, candidate) => sum + Math.max(0, candidate.askingOrBasis) * 0.1, 0)),
        projectedProfit: Math.round(profit90),
      },
    },
    architecture,
  }

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <DynastyAIClient data={data} />
    </main>
  )
}
