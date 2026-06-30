import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildShareMutationData, generateShareToken, serializeShare } from '@/lib/share-utils'

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
    console.error('Unable to read share request body', error)
    return {}
  }
}

async function requireUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
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
    const shares = await prisma.dealShare.findMany({
      where: { propertyId, userId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      shares: shares?.map?.((share: unknown) => serializeShare(share)) ?? [],
    })
  } catch (error: unknown) {
    console.error('Unable to load shares', error)
    return NextResponse.json({ error: 'Unable to load shares.' }, { status: 500 })
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
  const data = buildShareMutationData(body)

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId },
      select: { id: true },
    })

    if (!property?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    // Generate a unique token, retrying on the rare collision.
    let token = generateShareToken()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await prisma.dealShare.findUnique({ where: { token }, select: { id: true } })
      if (!existing?.id) {
        break
      }
      token = generateShareToken()
    }

    const share = await prisma.dealShare.create({
      data: {
        ...data,
        propertyId,
        userId,
        token,
      },
    })

    return NextResponse.json({ share: serializeShare(share) }, { status: 201 })
  } catch (error: unknown) {
    console.error('Unable to create share', error)
    return NextResponse.json({ error: 'Unable to create share link.' }, { status: 500 })
  }
}
