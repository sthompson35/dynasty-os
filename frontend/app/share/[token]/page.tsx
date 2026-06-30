import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { calculateDealMetrics, getPropertyDisplayName, serializeProperty } from '@/lib/property-utils'
import { serializeRehabItem, summarizeRehabItems } from '@/lib/rehab-utils'
import { serializeShare } from '@/lib/share-utils'
import { DealPackageView } from '@/components/dynasty/deal-package-view'

export const dynamic = 'force-dynamic'

type SharePageProps = {
  params?: {
    token?: string
  }
}

export async function generateMetadata(props: SharePageProps): Promise<Metadata> {
  const token = props?.params?.token ?? ''
  if (!token) {
    return { title: 'Deal package · Dynasty PropertyOS' }
  }
  const share = await prisma.dealShare.findUnique({
    where: { token },
    include: { property: true },
  })
  if (!share?.isActive || !share?.property) {
    return { title: 'Deal package · Dynasty PropertyOS' }
  }
  const title = share.title || `Investment opportunity — ${getPropertyDisplayName(serializeProperty(share.property))}`
  return {
    title: `${title} · Dynasty PropertyOS`,
    description: share.message || 'A confidential real estate investment deal package.',
  }
}

export default async function SharePage(props: SharePageProps) {
  const token = props?.params?.token ?? ''

  if (!token) {
    notFound()
  }

  const share = await prisma.dealShare.findUnique({
    where: { token },
    include: {
      property: {
        include: {
          rehabItems: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
  })

  if (!share?.id || !share?.isActive || !share?.property?.id) {
    notFound()
  }

  // Increment view count without blocking render.
  try {
    await prisma.dealShare.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    })
  } catch (error: unknown) {
    console.error('Unable to increment share view count', error)
  }

  const property = serializeProperty(share.property)
  const metrics = calculateDealMetrics(property)
  const rehabItems = share.property.rehabItems?.map?.((item: unknown) => serializeRehabItem(item)) ?? []
  const rehabSummary = summarizeRehabItems(rehabItems)

  return (
    <DealPackageView
      share={serializeShare(share)}
      property={property}
      metrics={metrics}
      rehabItems={rehabItems}
      rehabSummary={rehabSummary}
    />
  )
}
