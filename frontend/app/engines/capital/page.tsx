import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { CapitalEngineClient } from '@/components/dynasty/capital-engine-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Capital Engine' }

export default async function CapitalEnginePage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) redirect('/login')

  const [investors, transactions] = await Promise.all([
    prisma.investor.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }).catch(() => []),
    prisma.capitalTransaction.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 50 }).catch(() => []),
  ])

  const serializeInvestors = investors.map(i => ({
    ...i,
    availableCapital: i.availableCapital ? Number(i.availableCapital) : null,
    committedCapital: i.committedCapital ? Number(i.committedCapital) : null,
    investedCapital: i.investedCapital ? Number(i.investedCapital) : null,
    preferredReturn: i.preferredReturn ? Number(i.preferredReturn) : null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }))

  const serializeTransactions = transactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    date: t.date.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <CapitalEngineClient investors={serializeInvestors} transactions={serializeTransactions} />
    </main>
  )
}
