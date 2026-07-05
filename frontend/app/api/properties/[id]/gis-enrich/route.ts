import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { serializeProperty } from '@/lib/property-utils'
import { enrichPropertyGis } from '@/lib/gis-enrichment'
import { buildGisEnrichedActivity, buildFemaUpdatedActivity, recordPropertyActivities } from '@/lib/property-activity'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params?: {
    id?: string
  }
}

async function requireUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
}

export async function POST(_request: Request, context: RouteContext) {
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
    })

    if (!existingProperty?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    const result = await enrichPropertyGis(existingProperty)

    const property = await prisma.property.update({
      where: { id: existingProperty.id },
      data: { ...result, gisEnrichedAt: new Date() },
    })

    await recordPropertyActivities(prisma, property.id, userId, [
      buildGisEnrichedActivity({ wasEnriched: Boolean(existingProperty.gisEnrichedAt), isEnriched: true }),
      buildFemaUpdatedActivity({ previousFemaDisasterCount: existingProperty.femaDisasterCount, femaDisasterCount: property.femaDisasterCount }),
    ])

    return NextResponse.json({ property: serializeProperty(property) })
  } catch (error: unknown) {
    console.error('Unable to re-run GIS enrichment', error)
    return NextResponse.json({ error: 'Unable to re-run GIS enrichment.' }, { status: 500 })
  }
}
