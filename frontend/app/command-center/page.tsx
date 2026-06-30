import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { CommandCenterClient } from '@/components/dynasty/command-center-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Command Center' }

export default async function CommandCenterPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) redirect('/login')

  const [
    properties,
    leads,
    deals,
    investors,
    projects,
    dispositions,
    capitalTxns,
  ] = await Promise.all([
    prisma.property.findMany({ where: { userId } }).catch(() => []),
    prisma.lead.findMany({ where: { userId } }).catch(() => []),
    prisma.deal.findMany({ where: { userId } }).catch(() => []),
    prisma.investor.findMany({ where: { userId } }).catch(() => []),
    prisma.project.findMany({ where: { userId } }).catch(() => []),
    prisma.disposition.findMany({ where: { userId } }).catch(() => []),
    prisma.capitalTransaction.findMany({ where: { userId } }).catch(() => []),
  ])

  // Capital Intelligence
  const totalAvailableCapital = investors.reduce((s, i) => s + Number(i.availableCapital ?? 0), 0)
  const totalCommittedCapital = investors.reduce((s, i) => s + Number(i.committedCapital ?? 0), 0)
  const totalDeployedCapital = capitalTxns
    .filter(t => t.type === 'investment' && t.status === 'completed')
    .reduce((s, t) => s + Number(t.amount), 0)
  const totalReturnedCapital = capitalTxns
    .filter(t => t.type === 'return' && t.status === 'completed')
    .reduce((s, t) => s + Number(t.amount), 0)
  const dryPowder = totalAvailableCapital - totalCommittedCapital

  // Lead stats
  const qualifiedLeads = leads.filter(l => ['qualified', 'appointment', 'offer', 'contract'].includes(l.status)).length
  const sellerLeads = leads.filter(l => l.leadType === 'seller').length
  const buyerLeads = leads.filter(l => l.leadType === 'buyer').length
  const investorLeads = leads.filter(l => l.leadType === 'investor').length

  // Deal stats
  const pipelineValue = deals.reduce((s, d) => s + Number(d.arv ?? 0), 0)
  const approvedDeals = deals.filter(d => d.decision === 'go').length
  const killDeals = deals.filter(d => d.decision === 'kill').length
  const capitalRequired = deals.reduce((s, d) => s + Number(d.capitalRequired ?? 0), 0)

  // Operations stats
  const activeProjects = projects.filter(p => p.status === 'active').length
  const projectsBudget = projects.reduce((s, p) => s + Number(p.budget ?? 0), 0)
  const projectsActual = projects.reduce((s, p) => s + Number(p.actualCost ?? 0), 0)
  const budgetVariance = projectsBudget - projectsActual

  // Disposition stats
  const propsForSale = dispositions.filter(d => ['marketing', 'offers'].includes(d.status)).length
  const pendingClosings = dispositions.filter(d => d.status === 'under_contract').length
  const capitalRecovered = dispositions
    .filter(d => d.status === 'closed')
    .reduce((s, d) => s + Number(d.salePrice ?? 0), 0)
  const totalProfit = dispositions
    .filter(d => d.status === 'closed')
    .reduce((s, d) => s + Number(d.netProfit ?? 0), 0)

  // Investor stats
  const activeInvestors = investors.filter(i => i.status === 'funded').length

  // Portfolio value from properties
  const portfolioValue = properties.reduce((s, p) => s + Number(p.currentValue ?? p.purchasePrice ?? 0), 0)

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <CommandCenterClient
        capital={{
          available: totalAvailableCapital,
          committed: totalCommittedCapital,
          deployed: totalDeployedCapital,
          returned: totalReturnedCapital,
          dryPowder,
        }}
        leads={{
          total: leads.length,
          qualified: qualifiedLeads,
          seller: sellerLeads,
          buyer: buyerLeads,
          investor: investorLeads,
        }}
        deals={{
          total: deals.length,
          approved: approvedDeals,
          killed: killDeals,
          pipelineValue,
          capitalRequired,
        }}
        operations={{
          activeProjects,
          budgetVariance,
          completedProjects: projects.filter(p => p.status === 'complete').length,
        }}
        disposition={{
          forSale: propsForSale,
          pendingClosings,
          capitalRecovered,
          totalProfit,
        }}
        investors={{
          total: investors.length,
          active: activeInvestors,
          totalCapacity: totalAvailableCapital + totalCommittedCapital,
        }}
        portfolioValue={portfolioValue}
      />
    </main>
  )
}
