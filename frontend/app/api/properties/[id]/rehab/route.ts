import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildRehabItemMutationData, serializeRehabItem } from '@/lib/rehab-utils'

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
    console.error('Unable to read rehab request body', error)
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

    const items = await prisma.rehabItem.findMany({
      where: { propertyId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({
      items: items?.map?.((item: unknown) => serializeRehabItem(item)) ?? [],
    })
  } catch (error: unknown) {
    console.error('Unable to load rehab items', error)
    return NextResponse.json({ error: 'Unable to load rehab items.' }, { status: 500 })
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
  const bulkInput = Array.isArray((body as { items?: unknown })?.items)
    ? ((body as { items?: unknown[] }).items as unknown[])
    : null

  // --- bulk create (e.g. pushing builder rooms into the estimator) --------
  if (bulkInput) {
    const prepared = bulkInput
      .map((entry) => buildRehabItemMutationData(entry))
      .filter((entry) => Boolean(entry?.description))

    if (prepared.length === 0) {
      return NextResponse.json({ error: 'No valid line items were provided.' }, { status: 400 })
    }

    try {
      const owns = await ensurePropertyOwnership(propertyId, userId)
      if (!owns) {
        return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
      }

      const count = await prisma.rehabItem.count({ where: { propertyId } })

      const created = await prisma.$transaction(
        prepared.map((data, index) =>
          prisma.rehabItem.create({
            data: {
              ...data,
              propertyId,
              sortOrder: count + index,
            },
          }),
        ),
      )

      return NextResponse.json({ items: created.map((item) => serializeRehabItem(item)) }, { status: 201 })
    } catch (error: unknown) {
      console.error('Unable to create rehab items', error)
      return NextResponse.json({ error: 'Unable to create rehab items.' }, { status: 500 })
    }
  }

  // --- single create ------------------------------------------------------
  const data = buildRehabItemMutationData(body)

  if (!data?.description) {
    return NextResponse.json({ error: 'A line item description is required.' }, { status: 400 })
  }

  try {
    const owns = await ensurePropertyOwnership(propertyId, userId)
    if (!owns) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    const count = await prisma.rehabItem.count({ where: { propertyId } })

    const item = await prisma.rehabItem.create({
      data: {
        ...data,
        propertyId,
        sortOrder: count,
      },
    })

    return NextResponse.json({ item: serializeRehabItem(item) }, { status: 201 })
  } catch (error: unknown) {
    console.error('Unable to create rehab item', error)
    return NextResponse.json({ error: 'Unable to create rehab item.' }, { status: 500 })
  }
}
