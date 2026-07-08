import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { LearningCenterClient } from '@/components/dynasty/learning-center-client'
import { STRATEGIES, GLOSSARY } from '@/lib/learning-center'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Learning Center' }

export default async function LearningCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  const { term } = await searchParams

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <LearningCenterClient strategies={STRATEGIES} glossary={GLOSSARY} initialTerm={term} />
    </main>
  )
}
