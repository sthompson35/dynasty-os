import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { DealIntelligencePanel } from '@/components/dynasty/deal-intelligence-panel'
import { fetchDeal, fetchDealIntelligence } from '@/lib/api'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Charlie — Deal Intelligence' }

export default async function DealIntelligencePage({ params }: { params: { dealId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const [dealResult, intelligenceResult] = await Promise.all([
    fetchDeal(params.dealId),
    fetchDealIntelligence(params.dealId),
  ])

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session.user.name ?? 'Investor'} userEmail={session.user.email ?? ''} />
      <DealIntelligencePanel
        dealId={params.dealId}
        approvedBy={session.user.name ?? session.user.email ?? 'Investor'}
        initialDeal={dealResult.ok ? dealResult.data : null}
        initialIntelligence={intelligenceResult.ok ? intelligenceResult.data : null}
        dealFetchError={dealResult.ok ? null : dealResult.error}
      />
    </main>
  )
}
