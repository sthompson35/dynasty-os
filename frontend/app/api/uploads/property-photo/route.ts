import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/s3'
import { normalizeString } from '@/lib/property-utils'

export const dynamic = 'force-dynamic'

const ALLOWED_PREFIX = 'image/'

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

// Generates a presigned upload URL for a property photo. Photos are stored as
// PUBLIC objects because they render in property cards, the dashboard, and the
// public investor share pages via plain <img> tags (signed URLs would expire).
// This route is intentionally not tied to a property id so it can be used while
// creating a brand-new property (before an id exists).
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const body = await readBody(request)
  const fileName = normalizeString(body?.fileName)
  const contentType = normalizeString(body?.contentType) || 'application/octet-stream'

  if (!fileName) {
    return NextResponse.json({ error: 'File name is required.' }, { status: 400 })
  }

  if (!contentType.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json({ error: 'Only image files can be uploaded as property photos.' }, { status: 400 })
  }

  try {
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(fileName, contentType, true)
    const publicUrl = await getFileUrl(cloud_storage_path, contentType, true)
    return NextResponse.json({ uploadUrl, cloudStoragePath: cloud_storage_path, publicUrl })
  } catch (error: unknown) {
    console.error('Unable to create photo upload URL', error)
    return NextResponse.json({ error: 'Unable to prepare upload.' }, { status: 500 })
  }
}
