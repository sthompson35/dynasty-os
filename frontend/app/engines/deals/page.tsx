import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { DealEngineClient } from '@/components/dynasty/deal-engine-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Deal Engine' }

export default async function DealEnginePage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) redirect('/login')

  const deals = await prisma.deal.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  }).catch(() => [])

  const serialized = deals.map(d => ({
    ...d,
    purchasePrice: d.purchasePrice ? Number(d.purchasePrice) : null,
    arv: d.arv ? Number(d.arv) : null,
    repairCosts: d.repairCosts ? Number(d.repairCosts) : null,
    holdingCosts: d.holdingCosts ? Number(d.holdingCosts) : null,
    closingCosts: d.closingCosts ? Number(d.closingCosts) : null,
    mao: d.mao ? Number(d.mao) : null,
    wholesaleFee: d.wholesaleFee ? Number(d.wholesaleFee) : null,
    flipProfit: d.flipProfit ? Number(d.flipProfit) : null,
    rentalEquity: d.rentalEquity ? Number(d.rentalEquity) : null,
    monthlyCashFlow: d.monthlyCashFlow ? Number(d.monthlyCashFlow) : null,
    roi: d.roi ? Number(d.roi) : null,
    capitalRequired: d.capitalRequired ? Number(d.capitalRequired) : null,
    capitalAllocated: d.capitalAllocated ? Number(d.capitalAllocated) : null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }))

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <DealEngineClient deals={serialized} />
    </main>
  )
}
