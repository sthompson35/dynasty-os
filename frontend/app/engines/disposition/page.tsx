// Deprecated: superseded by /disposition-command-center. No longer linked from
// nav (see components/dynasty/app-navigation.tsx). Left live, not deleted, so the
// legacy Buyer/Disposition rows it manages stay reachable; new work belongs in
// the Disposition Command Center instead.
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { DispositionEngineClient } from '@/components/dynasty/disposition-engine-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Disposition Engine (Legacy)' }

export default async function DispositionEnginePage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) redirect('/login')

  const [buyers, dispositions] = await Promise.all([
    prisma.buyer.findMany({ where: { userId }, orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }] }).catch(() => []),
    prisma.disposition.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { buyer: true },
    }).catch(() => []),
  ])

  const serializeBuyers = buyers.map(b => ({
    ...b,
    fundingCapacity: b.fundingCapacity ? Number(b.fundingCapacity) : null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }))

  const serializeDispositions = dispositions.map(d => ({
    ...d,
    listPrice: d.listPrice ? Number(d.listPrice) : null,
    salePrice: d.salePrice ? Number(d.salePrice) : null,
    netProfit: d.netProfit ? Number(d.netProfit) : null,
    closeDate: d.closeDate?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    buyer: d.buyer ? {
      ...d.buyer,
      fundingCapacity: d.buyer.fundingCapacity ? Number(d.buyer.fundingCapacity) : null,
      createdAt: d.buyer.createdAt.toISOString(),
      updatedAt: d.buyer.updatedAt.toISOString(),
    } : null,
  }))

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <DispositionEngineClient buyers={serializeBuyers} dispositions={serializeDispositions} />
    </main>
  )
}
