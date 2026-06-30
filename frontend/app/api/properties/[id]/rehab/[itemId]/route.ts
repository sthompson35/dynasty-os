import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildRehabItemMutationData, serializeRehabItem } from '@/lib/rehab-utils'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params?: {
    id?: string
    itemId?: string
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to read rehab item request body', error)
    return {}
  }
}

async function requireUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
}

async function findOwnedItem(itemId: string, propertyId: string, userId: string) {
  return prisma.rehabItem.findFirst({
    where: {
      id: itemId,
      propertyId,
      property: { userId },
    },
  })
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const propertyId = context?.params?.id ?? ''
  const itemId = context?.params?.itemId ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!propertyId || !itemId) {
    return NextResponse.json({ error: 'Property id and item id are required.' }, { status: 400 })
  }

  const body = await readBody(request)
  const data = buildRehabItemMutationData(body)

  if (!data?.description) {
    return NextResponse.json({ error: 'A line item description is required.' }, { status: 400 })
  }

  try {
    const existing = await findOwnedItem(itemId, propertyId, userId)
    if (!existing?.id) {
      return NextResponse.json({ error: 'Rehab item not found.' }, { status: 404 })
    }

    const item = await prisma.rehabItem.update({
      where: { id: existing.id },
      data,
    })

    return NextResponse.json({ item: serializeRehabItem(item) })
  } catch (error: unknown) {
    console.error('Unable to update rehab item', error)
    return NextResponse.json({ error: 'Unable to update rehab item.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const propertyId = context?.params?.id ?? ''
  const itemId = context?.params?.itemId ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!propertyId || !itemId) {
    return NextResponse.json({ error: 'Property id and item id are required.' }, { status: 400 })
  }

  try {
    const existing = await findOwnedItem(itemId, propertyId, userId)
    if (!existing?.id) {
      return NextResponse.json({ error: 'Rehab item not found.' }, { status: 404 })
    }

    await prisma.rehabItem.delete({ where: { id: existing.id } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Unable to delete rehab item', error)
    return NextResponse.json({ error: 'Unable to delete rehab item.' }, { status: 500 })
  }
}
