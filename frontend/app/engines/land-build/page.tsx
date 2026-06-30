import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { LandBuildUWDDClient } from '@/components/dynasty/land-build-uw-dd-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Land + Build Underwriting' }

export default async function LandBuildUWDDPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) redirect('/login')

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <LandBuildUWDDClient />
    </main>
  )
}
