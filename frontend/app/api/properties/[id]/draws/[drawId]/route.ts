import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildDrawMutationData, serializeDraw } from '@/lib/draw-utils'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params?: {
    id?: string
    drawId?: string
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to read draw request body', error)
    return {}
  }
}

async function requireUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
}

async function ensureDrawOwnership(propertyId: string, drawId: string, userId: string) {
  const draw = await prisma.draw.findFirst({
    where: { id: drawId, propertyId, property: { userId } },
    select: { id: true },
  })
  return Boolean(draw?.id)
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const propertyId = context?.params?.id ?? ''
  const drawId = context?.params?.drawId ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!propertyId || !drawId) {
    return NextResponse.json({ error: 'Property and draw ids are required.' }, { status: 400 })
  }

  const body = await readBody(request)
  const data = buildDrawMutationData(body)

  if (!data?.name) {
    return NextResponse.json({ error: 'A draw name is required.' }, { status: 400 })
  }

  try {
    const owns = await ensureDrawOwnership(propertyId, drawId, userId)
    if (!owns) {
      return NextResponse.json({ error: 'Draw not found.' }, { status: 404 })
    }

    const draw = await prisma.draw.update({
      where: { id: drawId },
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount,
        status: data.status,
        scheduledDate: data.scheduledDate,
        fundedDate: data.fundedDate,
        lender: data.lender,
      },
    })

    return NextResponse.json({ draw: serializeDraw(draw) })
  } catch (error: unknown) {
    console.error('Unable to update draw', error)
    return NextResponse.json({ error: 'Unable to update draw.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const propertyId = context?.params?.id ?? ''
  const drawId = context?.params?.drawId ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!propertyId || !drawId) {
    return NextResponse.json({ error: 'Property and draw ids are required.' }, { status: 400 })
  }

  try {
    const owns = await ensureDrawOwnership(propertyId, drawId, userId)
    if (!owns) {
      return NextResponse.json({ error: 'Draw not found.' }, { status: 404 })
    }

    await prisma.draw.delete({ where: { id: drawId } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Unable to delete draw', error)
    return NextResponse.json({ error: 'Unable to delete draw.' }, { status: 500 })
  }
}
