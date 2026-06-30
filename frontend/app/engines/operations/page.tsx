import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { OperationsEngineClient } from '@/components/dynasty/operations-engine-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Operations Engine' }

export default async function OperationsEnginePage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) redirect('/login')

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { tasks: { orderBy: { sortOrder: 'asc' } } },
  }).catch(() => [])

  const serialized = projects.map(p => ({
    ...p,
    budget: p.budget ? Number(p.budget) : null,
    actualCost: p.actualCost ? Number(p.actualCost) : null,
    startDate: p.startDate?.toISOString() ?? null,
    targetCompletion: p.targetCompletion?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    tasks: p.tasks.map(t => ({
      ...t,
      dueDate: t.dueDate?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  }))

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <OperationsEngineClient projects={serialized} />
    </main>
  )
}
