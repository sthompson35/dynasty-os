import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readAutomationBody, requireAutomationAuth } from '@/lib/automation-auth'
import { enrichPropertyGis } from '@/lib/gis-enrichment'

export const dynamic = 'force-dynamic'

// Each property costs up to ~2 outbound HTTP calls (Census, then FEMA), so a
// single automation-route invocation stays small - unlike the pure-compute
// portfolio-scores route, this is meant to be called repeatedly (e.g. on an
// n8n schedule) until `remaining` drops to 0, not to process the whole
// portfolio in one request.
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 250
const CONCURRENCY = 5

export async function POST(request: Request) {
  const auth = await requireAutomationAuth(request)
  if (!auth.ok) return auth.response

  const body = await readAutomationBody(request)
  const requestedLimit = Number(body.limit ?? 0)
  const take = requestedLimit > 0 ? Math.min(MAX_LIMIT, requestedLimit) : DEFAULT_LIMIT

  const properties = await prisma.property.findMany({
    where: { userId: auth.userId, gisEnrichedAt: null },
    orderBy: { createdAt: 'asc' },
    take,
  })

  let enriched = 0
  let failed = 0
  for (let index = 0; index < properties.length; index += CONCURRENCY) {
    const batch = properties.slice(index, index + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (property) => {
        const result = await enrichPropertyGis(property)
        await prisma.property.update({
          where: { id: property.id },
          data: { ...result, gisEnrichedAt: new Date() },
        })
      })
    )
    for (const result of results) {
      if (result.status === 'fulfilled') enriched += 1
      else failed += 1
    }
  }

  const remaining = await prisma.property.count({ where: { userId: auth.userId, gisEnrichedAt: null } })

  return NextResponse.json({
    status: 'complete',
    engine: 'gis_enrichment',
    enriched,
    failed,
    remaining,
    automation: true,
  })
}
