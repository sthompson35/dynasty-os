import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildShareMutationData, serializeShare } from '@/lib/share-utils'

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
    console.error('Unable to read share update body', error)
    return {}
  }
}

async function requireUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const shareId = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!shareId) {
    return NextResponse.json({ error: 'Share id is required.' }, { status: 400 })
  }

  const body = await readBody(request)
  const data = buildShareMutationData(body)

  try {
    const existing = await prisma.dealShare.findFirst({
      where: { id: shareId, userId },
      select: { id: true },
    })

    if (!existing?.id) {
      return NextResponse.json({ error: 'Share not found.' }, { status: 404 })
    }

    const share = await prisma.dealShare.update({
      where: { id: existing.id },
      data,
    })

    return NextResponse.json({ share: serializeShare(share) })
  } catch (error: unknown) {
    console.error('Unable to update share', error)
    return NextResponse.json({ error: 'Unable to update share.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const shareId = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!shareId) {
    return NextResponse.json({ error: 'Share id is required.' }, { status: 400 })
  }

  try {
    const existing = await prisma.dealShare.findFirst({
      where: { id: shareId, userId },
      select: { id: true },
    })

    if (!existing?.id) {
      return NextResponse.json({ error: 'Share not found.' }, { status: 404 })
    }

    await prisma.dealShare.delete({ where: { id: existing.id } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Unable to delete share', error)
    return NextResponse.json({ error: 'Unable to delete share.' }, { status: 500 })
  }
}
