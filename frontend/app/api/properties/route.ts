import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildPropertyMutationData, serializeProperty } from '@/lib/property-utils'
import { enrichPropertyGis } from '@/lib/gis-enrichment'
import { buildGisEnrichedActivity, buildFemaUpdatedActivity, recordPropertyActivities } from '@/lib/property-activity'

export const dynamic = 'force-dynamic'

const GIS_ENRICHMENT_BUDGET_MS = 5000

async function tryEnrichNewProperty(property: { id: string; userId: string; address: string; city: string; state: string; zip: string | null }) {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), GIS_ENRICHMENT_BUDGET_MS))

  try {
    const result = await Promise.race([enrichPropertyGis(property), timeout])
    if (!result) return property // timed out - leave unenriched, don't block creation

    const updated = await prisma.property.update({
      where: { id: property.id },
      data: { ...result, gisEnrichedAt: new Date() },
    })

    // A brand-new property has no "previous" enrichment state by definition -
    // this only ever fires the GIS_ENRICHED/FEMA_UPDATED activities, never
    // PURCHASE_PRICE_ADDED (that's an update-time event, not a creation-time one).
    await recordPropertyActivities(prisma, property.id, property.userId, [
      buildGisEnrichedActivity({ wasEnriched: false, isEnriched: true }),
      buildFemaUpdatedActivity({ previousFemaDisasterCount: null, femaDisasterCount: updated.femaDisasterCount }),
    ])

    return updated
  } catch (error: unknown) {
    console.error('GIS enrichment failed for new property', property.id, error)
    return property
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to read property request body', error)
    return {}
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  try {
    const properties = await prisma.property.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      properties: properties?.map?.((property: unknown) => serializeProperty(property)) ?? [],
    })
  } catch (error: unknown) {
    console.error('Unable to load properties', error)
    return NextResponse.json({ error: 'Unable to load properties.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const body = await readBody(request)
  const data = buildPropertyMutationData(body)

  if (!data?.address || !data?.city || !data?.state) {
    return NextResponse.json({ error: 'Address, city, and state are required.' }, { status: 400 })
  }

  try {
    const property = await prisma.property.create({
      data: {
        ...data,
        userId,
      },
    })

    const enrichedProperty = await tryEnrichNewProperty(property)

    return NextResponse.json({ property: serializeProperty(enrichedProperty) }, { status: 201 })
  } catch (error: unknown) {
    console.error('Unable to create property', error)
    return NextResponse.json({ error: 'Unable to create property.' }, { status: 500 })
  }
}
