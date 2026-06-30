import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { serializeProperty } from '@/lib/property-utils'
import { buildTourEmbed } from '@/lib/tour-utils'

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
    console.error('Unable to read tour request body', error)
    return {}
  }
}

async function requireUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
}

// PATCH /api/properties/[id]/tour — lightweight endpoint to set or clear the
// virtual tour link without requiring the full property edit payload.
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
  const rawValue = typeof body?.virtualTourUrl === 'string' ? body.virtualTourUrl.trim() : ''

  // An empty string clears the saved tour.
  let normalized: string | null = null
  if (rawValue) {
    const embed = buildTourEmbed(rawValue)
    if (!embed) {
      return NextResponse.json(
        { error: 'That does not look like a valid tour link. Please paste a full https link.' },
        { status: 400 },
      )
    }
    normalized = embed.originalUrl
  }

  try {
    const existing = await prisma.property.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!existing?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    const updated = await prisma.property.update({
      where: { id },
      data: { virtualTourUrl: normalized },
    })

    return NextResponse.json({ property: serializeProperty(updated) })
  } catch (error: unknown) {
    console.error('Unable to update virtual tour link', error)
    return NextResponse.json({ error: 'Unable to save the tour link.' }, { status: 500 })
  }
}
