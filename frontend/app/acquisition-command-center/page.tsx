import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { AcquisitionCommandCenterClient } from '@/components/dynasty/acquisition-command-center-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Acquisition Command Center' }

export default async function AcquisitionCommandCenterPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <AcquisitionCommandCenterClient />
    </main>
  )
}
