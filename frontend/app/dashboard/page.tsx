import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PROPERTY_STATUS_OPTIONS, PROPERTY_TYPE_OPTIONS, PropertyDTO, calculateDealMetrics, getStatusLabel, getTypeLabel, serializeProperty, toNumber } from '@/lib/property-utils'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { DashboardClient } from '@/components/dynasty/dashboard-client'
import type { ChartDatum } from '@/components/dynasty/property-type-chart'

export const dynamic = 'force-dynamic'

const chartColors = ['#0B1F3A', '#C59D3D', '#B6A17A', '#3F7D58', '#B84A4A']

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''

  if (!userId) {
    redirect('/login')
  }

  const rawProperties = await prisma.property.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })

  const properties = rawProperties?.map?.((property: unknown) => serializeProperty(property)) ?? []
  const portfolioValue = properties?.reduce?.((total: number, property: PropertyDTO) => total + toNumber(property?.currentValue ?? property?.purchasePrice), 0) ?? 0
  const totalBasis = properties?.reduce?.((total: number, property: PropertyDTO) => total + toNumber(property?.purchasePrice), 0) ?? 0
  const totalEquity = portfolioValue - totalBasis
  const roiValues = properties?.map?.((property: PropertyDTO) => calculateDealMetrics(property)?.roi ?? 0)?.filter?.((roi: number) => Number.isFinite(roi)) ?? []
  const averageRoi = (roiValues?.length ?? 0) > 0 ? (roiValues?.reduce?.((sum: number, roi: number) => sum + roi, 0) ?? 0) / (roiValues?.length ?? 1) : 0

  const typeData: ChartDatum[] = PROPERTY_TYPE_OPTIONS?.map?.((option, index: number) => ({
    name: getTypeLabel(option?.value),
    value: properties?.filter?.((property: PropertyDTO) => property?.propertyType === option?.value)?.length ?? 0,
    color: chartColors?.[index % (chartColors?.length ?? 1)] ?? '#C59D3D',
  })) ?? []

  const statusData: ChartDatum[] = PROPERTY_STATUS_OPTIONS?.map?.((option, index: number) => ({
    name: getStatusLabel(option?.value),
    value: properties?.filter?.((property: PropertyDTO) => property?.status === option?.value)?.length ?? 0,
    color: chartColors?.[(index + 1) % (chartColors?.length ?? 1)] ?? '#C59D3D',
  })) ?? []

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <DashboardClient
        metrics={{
          totalProperties: properties?.length ?? 0,
          portfolioValue,
          totalEquity,
          averageRoi,
        }}
        recentProperties={properties?.slice?.(0, 4) ?? []}
        typeData={typeData}
        statusData={statusData}
      />
    </main>
  )
}
