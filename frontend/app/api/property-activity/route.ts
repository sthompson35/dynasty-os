import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { collapseActivityFeed, type ActivityFeedRow } from '@/lib/property-activity'

export const dynamic = 'force-dynamic'

const RAW_FETCH_LIMIT = 100
const FEED_LIMIT = 10

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  // Fetch more raw rows than the feed will show, since a bulk import's rows
  // collapse down to a single entry - without headroom, a large import batch
  // could consume the whole raw fetch and leave nothing else to show.
  const rows = await prisma.propertyActivity.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: RAW_FETCH_LIMIT,
    include: {
      property: { select: { address: true, city: true, state: true } },
    },
  })

  const feedRows: ActivityFeedRow[] = rows.map((row) => ({
    id: row.id,
    propertyId: row.propertyId,
    eventType: row.eventType,
    summary: row.summary,
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    address: row.property ? `${row.property.address}, ${row.property.city}, ${row.property.state}` : null,
  }))

  const items = collapseActivityFeed(feedRows).slice(0, FEED_LIMIT)

  return NextResponse.json({ items })
}
