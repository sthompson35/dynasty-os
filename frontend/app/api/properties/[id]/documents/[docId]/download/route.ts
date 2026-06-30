import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getFileUrl } from '@/lib/s3'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params?: {
    id?: string
    docId?: string
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  const propertyId = context?.params?.id ?? ''
  const docId = context?.params?.docId ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!propertyId || !docId) {
    return NextResponse.json({ error: 'Document id is required.' }, { status: 400 })
  }

  try {
    const document = await prisma.propertyDocument.findFirst({
      where: { id: docId, propertyId, userId },
    })
    if (!document?.id) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    const url = await getFileUrl(document.cloudStoragePath, document.contentType, document.isPublic)
    return NextResponse.json({ url })
  } catch (error: unknown) {
    console.error('Unable to create download URL', error)
    return NextResponse.json({ error: 'Unable to prepare download.' }, { status: 500 })
  }
}
