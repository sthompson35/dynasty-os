import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { serializePropertyImage } from '@/lib/gallery-utils'
import { reconcilePrimaryImage } from '@/lib/gallery-server'
import { deleteFile } from '@/lib/s3'
import { normalizeString } from '@/lib/property-utils'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params?: {
    id?: string
    imageId?: string
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch (error: unknown) {
    return {}
  }
}

async function requireOwnedImage(propertyId: string, imageId: string, userId: string) {
  return prisma.propertyImage.findFirst({ where: { id: imageId, propertyId, userId } })
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  const propertyId = context?.params?.id ?? ''
  const imageId = context?.params?.imageId ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!propertyId || !imageId) {
    return NextResponse.json({ error: 'Property id and image id are required.' }, { status: 400 })
  }

  const body = await readBody(request)

  try {
    const image = await requireOwnedImage(propertyId, imageId, userId)
    if (!image?.id) {
      return NextResponse.json({ error: 'Image not found.' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body?.caption !== undefined) {
      data.caption = normalizeString(body?.caption) || null
    }
    if (body?.sortOrder !== undefined) {
      const parsed = parseInt(String(body?.sortOrder), 10)
      if (Number.isFinite(parsed)) {
        data.sortOrder = parsed
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.propertyImage.update({ where: { id: imageId }, data })
    }

    const makePrimary = body?.isPrimary === true || body?.makePrimary === true
    // Reconcile (preferring this image if requested) to keep one cover + sync photoUrl.
    await reconcilePrimaryImage(propertyId, makePrimary ? imageId : undefined)

    const images = await prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ images: images.map(serializePropertyImage) })
  } catch (error: unknown) {
    console.error('Unable to update property image', error)
    return NextResponse.json({ error: 'Unable to update image.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  const propertyId = context?.params?.id ?? ''
  const imageId = context?.params?.imageId ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!propertyId || !imageId) {
    return NextResponse.json({ error: 'Property id and image id are required.' }, { status: 400 })
  }

  try {
    const image = await requireOwnedImage(propertyId, imageId, userId)
    if (!image?.id) {
      return NextResponse.json({ error: 'Image not found.' }, { status: 404 })
    }

    await prisma.propertyImage.delete({ where: { id: imageId } })

    // Best-effort remove the object from storage (don't fail the request if S3 errors).
    try {
      if (image.cloudStoragePath) {
        await deleteFile(image.cloudStoragePath)
      }
    } catch (storageError: unknown) {
      console.error('Unable to delete image from storage', storageError)
    }

    // Promote a new cover if needed and re-sync photoUrl.
    await reconcilePrimaryImage(propertyId)

    const images = await prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ images: images.map(serializePropertyImage) })
  } catch (error: unknown) {
    console.error('Unable to delete property image', error)
    return NextResponse.json({ error: 'Unable to delete image.' }, { status: 500 })
  }
}
