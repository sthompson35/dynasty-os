import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildDrawMutationData, serializeDraw } from '@/lib/draw-utils'

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
    console.error('Unable to read draw request body', error)
    return {}
  }
}

async function requireUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
}

async function ensurePropertyOwnership(propertyId: string, userId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId },
    select: { id: true },
  })
  return Boolean(property?.id)
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
    const owns = await ensurePropertyOwnership(propertyId, userId)
    if (!owns) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    const draws = await prisma.draw.findMany({
      where: { propertyId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({
      draws: draws?.map?.((draw: unknown) => serializeDraw(draw)) ?? [],
    })
  } catch (error: unknown) {
    console.error('Unable to load draws', error)
    return NextResponse.json({ error: 'Unable to load draw schedule.' }, { status: 500 })
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
  const bulkInput = Array.isArray((body as { draws?: unknown })?.draws)
    ? ((body as { draws?: unknown[] }).draws as unknown[])
    : null

  // --- bulk create (e.g. generating a schedule from the rehab budget) ------
  if (bulkInput) {
    const prepared = bulkInput
      .map((entry) => buildDrawMutationData(entry))
      .filter((entry) => Boolean(entry?.name))

    if (prepared.length === 0) {
      return NextResponse.json({ error: 'No valid draws were provided.' }, { status: 400 })
    }

    try {
      const owns = await ensurePropertyOwnership(propertyId, userId)
      if (!owns) {
        return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
      }

      const count = await prisma.draw.count({ where: { propertyId } })

      const created = await prisma.$transaction(
        prepared.map((data, index) =>
          prisma.draw.create({
            data: {
              ...data,
              propertyId,
              sortOrder: count + index,
            },
          }),
        ),
      )

      return NextResponse.json({ draws: created.map((draw) => serializeDraw(draw)) }, { status: 201 })
    } catch (error: unknown) {
      console.error('Unable to create draws', error)
      return NextResponse.json({ error: 'Unable to create draws.' }, { status: 500 })
    }
  }

  // --- single create ------------------------------------------------------
  const data = buildDrawMutationData(body)

  if (!data?.name) {
    return NextResponse.json({ error: 'A draw name is required.' }, { status: 400 })
  }

  try {
    const owns = await ensurePropertyOwnership(propertyId, userId)
    if (!owns) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    const count = await prisma.draw.count({ where: { propertyId } })

    const draw = await prisma.draw.create({
      data: {
        ...data,
        propertyId,
        sortOrder: count,
      },
    })

    return NextResponse.json({ draw: serializeDraw(draw) }, { status: 201 })
  } catch (error: unknown) {
    console.error('Unable to create draw', error)
    return NextResponse.json({ error: 'Unable to create draw.' }, { status: 500 })
  }
}
