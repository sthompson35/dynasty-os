import { prisma } from '@/lib/db'

// Ensures a property has exactly one primary gallery image and that the
// property's legacy `photoUrl` (used by cards, dashboard, and public share
// pages) always mirrors that cover image. Returns the resolved cover URL or
// null when the gallery is empty. Server-only (imports prisma).
export async function reconcilePrimaryImage(propertyId: string, preferredImageId?: string): Promise<string | null> {
  const images = await prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  if (images.length === 0) {
    // No images left — clear the hero photo.
    await prisma.property.update({ where: { id: propertyId }, data: { photoUrl: null } })
    return null
  }

  const preferred = preferredImageId ? images.find((image) => image.id === preferredImageId) : undefined
  const cover = preferred ?? images.find((image) => image.isPrimary) ?? images[0]

  // Unset primary on everything except the cover, set it on the cover.
  await prisma.$transaction([
    prisma.propertyImage.updateMany({
      where: { propertyId, id: { not: cover.id } },
      data: { isPrimary: false },
    }),
    prisma.propertyImage.update({ where: { id: cover.id }, data: { isPrimary: true } }),
    prisma.property.update({ where: { id: propertyId }, data: { photoUrl: cover.url } }),
  ])

  return cover.url
}
