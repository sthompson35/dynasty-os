import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { serializeProperty } from '@/lib/property-utils'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { PropertyManager } from '@/components/dynasty/property-manager'

export const dynamic = 'force-dynamic'

export default async function PropertiesPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''

  if (!userId) {
    redirect('/login')
  }

  const properties = await prisma.property.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <PropertyManager initialProperties={properties?.map?.((property: unknown) => serializeProperty(property)) ?? []} />
    </main>
  )
}
