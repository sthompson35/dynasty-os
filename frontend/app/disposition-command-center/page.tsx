import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { DispositionCommandCenterClient } from '@/components/dynasty/disposition-command-center-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Disposition Command Center' }

export default async function DispositionCommandCenterPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <DispositionCommandCenterClient />
    </main>
  )
}
