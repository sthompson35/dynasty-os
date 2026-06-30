import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { deleteFile } from '@/lib/s3'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params?: {
    id?: string
    docId?: string
  }
}

async function requireUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId()
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

    // Best-effort removal from cloud storage; proceed even if it fails.
    try {
      await deleteFile(document.cloudStoragePath)
    } catch (storageError: unknown) {
      console.error('Unable to delete file from storage', storageError)
    }

    await prisma.propertyDocument.delete({ where: { id: docId } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Unable to delete document', error)
    return NextResponse.json({ error: 'Unable to delete document.' }, { status: 500 })
  }
}
