import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generatePresignedUploadUrl } from '@/lib/s3'
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
  } catch {
    return {}
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
  const fileName = normalizeString(body?.fileName)
  const contentType = normalizeString(body?.contentType) || 'application/octet-stream'

  if (!fileName) {
    return NextResponse.json({ error: 'File name is required.' }, { status: 400 })
  }

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId },
      select: { id: true },
    })
    if (!property?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    // Documents are private — served via signed URLs only.
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(fileName, contentType, false)
    return NextResponse.json({ uploadUrl, cloudStoragePath: cloud_storage_path })
  } catch (error: unknown) {
    console.error('Unable to create upload URL', error)
    return NextResponse.json({ error: 'Unable to prepare upload.' }, { status: 500 })
  }
}
