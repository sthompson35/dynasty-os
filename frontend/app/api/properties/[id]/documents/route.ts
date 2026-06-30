import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getDocumentCategory, serializeDocument } from '@/lib/document-utils'
import { normalizeString } from '@/lib/property-utils'

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

async function requireUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
}

export async function GET(_request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const propertyId = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!propertyId) {
    return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
  }

  try {
    const documents = await prisma.propertyDocument.findMany({
      where: { propertyId, userId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      documents: documents?.map?.((doc: unknown) => serializeDocument(doc)) ?? [],
    })
  } catch (error: unknown) {
    console.error('Unable to load documents', error)
    return NextResponse.json({ error: 'Unable to load documents.' }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const propertyId = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!propertyId) {
    return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
  }

  const body = await readBody(request)
  const fileName = normalizeString(body?.fileName)
  const cloudStoragePath = normalizeString(body?.cloudStoragePath)
  const contentType = normalizeString(body?.contentType) || 'application/octet-stream'
  const category = getDocumentCategory(body?.category)
  const fileSizeRaw = Number(body?.fileSize ?? 0)
  const fileSize = Number.isFinite(fileSizeRaw) && fileSizeRaw > 0 ? Math.round(fileSizeRaw) : 0

  if (!fileName || !cloudStoragePath) {
    return NextResponse.json({ error: 'File name and storage path are required.' }, { status: 400 })
  }

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId },
      select: { id: true },
    })
    if (!property?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    const document = await prisma.propertyDocument.create({
      data: {
        propertyId,
        userId,
        fileName,
        cloudStoragePath,
        contentType,
        fileSize,
        category,
        isPublic: false,
      },
    })

    return NextResponse.json({ document: serializeDocument(document) }, { status: 201 })
  } catch (error: unknown) {
    console.error('Unable to save document record', error)
    return NextResponse.json({ error: 'Unable to save document.' }, { status: 500 })
  }
}
