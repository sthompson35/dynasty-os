import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildPropertyImageMutationData, serializePropertyImage } from '@/lib/gallery-utils'
import { reconcilePrimaryImage } from '@/lib/gallery-server'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params?: {
    id?: string
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch (error: unknown) {
    return {}
  }
}

async function requireOwnedProperty(propertyId: string, userId: string) {
  return prisma.property.findFirst({ where: { id: propertyId, userId }, select: { id: true } })
}

export async function GET(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  const propertyId = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!propertyId) {
    return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
  }

  try {
    const property = await requireOwnedProperty(propertyId, userId)
    if (!property?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    const images = await prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ images: images.map(serializePropertyImage) })
  } catch (error: unknown) {
    console.error('Unable to load property images', error)
    return NextResponse.json({ error: 'Unable to load images.' }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  const propertyId = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!propertyId) {
    return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
  }

  const body = await readBody(request)

  try {
    const property = await requireOwnedProperty(propertyId, userId)
    if (!property?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    const rawList = Array.isArray(body?.images) ? (body.images as Record<string, unknown>[]) : [body]
    const prepared = rawList.map((item) => buildPropertyImageMutationData(item)).filter((item): item is NonNullable<typeof item> => Boolean(item))

    if (prepared.length === 0) {
      return NextResponse.json({ error: 'A valid image url and storage path are required.' }, { status: 400 })
    }

    const existingCount = await prisma.propertyImage.count({ where: { propertyId } })

    const created = await prisma.$transaction(
      prepared.map((item, index) =>
        prisma.propertyImage.create({
          data: {
            propertyId,
            userId,
            url: item.url,
            cloudStoragePath: item.cloudStoragePath,
            caption: item.caption,
            isPrimary: false,
            sortOrder: existingCount + index,
          },
        }),
      ),
    )

    // Keep exactly one primary image and mirror it into property.photoUrl.
    const explicitPrimary = prepared.findIndex((item) => item.isPrimary === true)
    const preferredId = explicitPrimary >= 0 ? created[explicitPrimary]?.id : undefined
    await reconcilePrimaryImage(propertyId, preferredId)

    const images = await prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ images: images.map(serializePropertyImage) })
  } catch (error: unknown) {
    console.error('Unable to save property images', error)
    return NextResponse.json({ error: 'Unable to save images.' }, { status: 500 })
  }
}
