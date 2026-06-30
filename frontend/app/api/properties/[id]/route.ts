import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildPropertyMutationData, serializeProperty } from '@/lib/property-utils'

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
    console.error('Unable to read property detail request body', error)
    return {}
  }
}

async function requireUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
}

export async function GET(_request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const id = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!id) {
    return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
  }

  try {
    const property = await prisma.property.findFirst({
      where: { id, userId },
    })

    if (!property?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    return NextResponse.json({ property: serializeProperty(property) })
  } catch (error: unknown) {
    console.error('Unable to load property', error)
    return NextResponse.json({ error: 'Unable to load property.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const id = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!id) {
    return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
  }

  const body = await readBody(request)
  const data = buildPropertyMutationData(body)

  if (!data?.address || !data?.city || !data?.state) {
    return NextResponse.json({ error: 'Address, city, and state are required.' }, { status: 400 })
  }

  try {
    const existingProperty = await prisma.property.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!existingProperty?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    const property = await prisma.property.update({
      where: { id: existingProperty.id },
      data,
    })

    return NextResponse.json({ property: serializeProperty(property) })
  } catch (error: unknown) {
    console.error('Unable to update property', error)
    return NextResponse.json({ error: 'Unable to update property.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const id = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!id) {
    return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
  }

  try {
    const existingProperty = await prisma.property.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!existingProperty?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    await prisma.property.delete({ where: { id: existingProperty.id } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Unable to delete property', error)
    return NextResponse.json({ error: 'Unable to delete property.' }, { status: 500 })
  }
}
