import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { serializeProperty } from '@/lib/property-utils'
import { serializeRehabItem } from '@/lib/rehab-utils'
import { serializeShare } from '@/lib/share-utils'
import { serializeDocument } from '@/lib/document-utils'
import { serializeContact, serializePropertyContactLink } from '@/lib/contact-utils'
import { serializeDraw } from '@/lib/draw-utils'
import { serializePropertyImage } from '@/lib/gallery-utils'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { PropertyDetailClient } from '@/components/dynasty/property-detail-client'

export const dynamic = 'force-dynamic'

type PropertyDetailPageProps = {
  params?: {
    id?: string
  }
}

export default async function PropertyDetailPage(props: PropertyDetailPageProps) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  const id = props?.params?.id ?? ''

  if (!userId) {
    redirect('/login')
  }

  if (!id) {
    notFound()
  }

  const property = await prisma.property.findFirst({
    where: { id, userId },
  })

  if (!property?.id) {
    notFound()
  }

  const [rehabItems, shares, documents, contactLinks, draws, propertyImages] = await Promise.all([
    prisma.rehabItem.findMany({
      where: { propertyId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.dealShare.findMany({
      where: { propertyId: id, userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.propertyDocument.findMany({
      where: { propertyId: id, userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.propertyContact.findMany({
      where: { propertyId: id, userId },
      include: {
        contact: {
          include: {
            links: {
              include: {
                property: { select: { id: true, address: true, city: true, state: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.draw.findMany({
      where: { propertyId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.propertyImage.findMany({
      where: { propertyId: id, userId },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  const initialContacts = contactLinks?.map?.((link: Record<string, unknown>) => {
    const serializedLink = serializePropertyContactLink(link)
    return {
      ...serializeContact(link?.contact),
      linkId: serializedLink.id,
      roleOnDeal: serializedLink.roleOnDeal,
      relationshipType: serializedLink.relationshipType,
      dealResponsibility: serializedLink.dealResponsibility,
      status: serializedLink.status,
      nextActionDate: serializedLink.nextActionDate,
      lastContacted: serializedLink.lastContacted,
      documentsNeeded: serializedLink.documentsNeeded,
      paymentOwed: serializedLink.paymentOwed,
      receivesUpdates: serializedLink.receivesUpdates,
      communicationHistory: serializedLink.communicationHistory,
    }
  }) ?? []

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <PropertyDetailClient
        property={serializeProperty(property)}
        initialRehabItems={rehabItems?.map?.((item: unknown) => serializeRehabItem(item)) ?? []}
        initialShares={shares?.map?.((share: unknown) => serializeShare(share)) ?? []}
        initialDocuments={documents?.map?.((doc: unknown) => serializeDocument(doc)) ?? []}
        initialContacts={initialContacts}
        initialDraws={draws?.map?.((draw: unknown) => serializeDraw(draw)) ?? []}
        initialImages={propertyImages?.map?.((image: Record<string, unknown>) => serializePropertyImage(image)) ?? []}
      />
    </main>
  )
}
