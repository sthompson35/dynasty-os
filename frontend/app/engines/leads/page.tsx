import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { LeadEngineClient } from '@/components/dynasty/lead-engine-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Lead Engine' }

export default async function LeadEnginePage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) redirect('/login')

  const leads = await prisma.lead.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  }).catch(() => [])

  const serialized = leads.map(l => ({
    ...l,
    equity: l.equity ? Number(l.equity) : null,
    askingPrice: l.askingPrice ? Number(l.askingPrice) : null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    nextActionDate: l.nextActionDate?.toISOString() ?? null,
  }))

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <LeadEngineClient leads={serialized} />
    </main>
  )
}
