import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildPropertyMutationData } from '@/lib/property-utils'
import { propertyDuplicateKey } from '@/lib/property-import-utils'
import { buildImportCompletedActivity } from '@/lib/property-activity'

export const dynamic = 'force-dynamic'

const MAX_ROWS = 2000

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

// Bulk-creates properties from rows the client reviewed after
// /api/properties/import/csv. Duplicates are re-checked here (not just
// trusted from the earlier preview) in case data changed in between.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const body = await readBody(request)
  const inputRows = Array.isArray(body?.rows) ? (body.rows as Record<string, unknown>[]) : []

  if (inputRows.length === 0) {
    return NextResponse.json({ error: 'No rows to import.' }, { status: 400 })
  }
  if (inputRows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Cannot import more than ${MAX_ROWS} rows at once.` }, { status: 400 })
  }

  const existingProperties = await prisma.property.findMany({
    where: { userId },
    select: { address: true, city: true, state: true },
  })
  const existingKeys = new Set(existingProperties.map((property) => propertyDuplicateKey(property)))

  const toCreate: ReturnType<typeof buildPropertyMutationData>[] = []
  const errors: { row: number; error: string }[] = []
  let skipped = 0

  inputRows.forEach((row, index) => {
    const data = buildPropertyMutationData(row)
    if (!data.address || !data.city || !data.state) {
      errors.push({ row: index + 1, error: 'Missing address, city, or state.' })
      return
    }
    const key = propertyDuplicateKey(data)
    if (existingKeys.has(key)) {
      skipped += 1
      return
    }
    // Guards against duplicate addresses within this same import batch.
    existingKeys.add(key)
    toCreate.push(data)
  })

  let created = 0
  try {
    if (toCreate.length > 0) {
      const importStartedAt = new Date()
      const result = await prisma.property.createMany({
        data: toCreate.map((data) => ({ ...data, userId })),
      })
      created = result.count

      // createMany doesn't return the created rows' ids, so the just-created
      // batch is identified by createdAt >= a timestamp captured immediately
      // before the insert - cheap, and reliable for a single request's batch.
      const createdProperties = await prisma.property.findMany({
        where: { userId, createdAt: { gte: importStartedAt } },
        select: { id: true },
      })
      if (createdProperties.length > 0) {
        await prisma.propertyActivity.createMany({
          data: createdProperties.map((property) => {
            const draft = buildImportCompletedActivity()
            return { propertyId: property.id, userId, eventType: draft.eventType, summary: draft.summary, metadata: draft.metadata as Prisma.InputJsonValue }
          }),
        })
      }
    }
  } catch (error: unknown) {
    console.error('Unable to bulk-create properties', error)
    return NextResponse.json({ error: 'Unable to save the imported properties.' }, { status: 500 })
  }

  // Cheap data-quality signal: if an import path silently drops a field
  // (e.g. purchasePrice) for most/all rows, this surfaces it in the response
  // and server logs immediately instead of only showing up later as "why
  // does this account have zero GO decisions."
  const pct = (count: number) => (toCreate.length > 0 ? Math.round((count / toCreate.length) * 100) : 0)
  const completeness = {
    purchasePrice: pct(toCreate.filter((row) => Boolean(row.purchasePrice)).length),
    currentValue: pct(toCreate.filter((row) => Boolean(row.currentValue)).length),
    notes: pct(toCreate.filter((row) => Boolean(row.notes)).length),
  }
  if (toCreate.length >= 20 && completeness.purchasePrice < 10) {
    console.warn(`Property import completeness warning: ${completeness.purchasePrice}% of ${toCreate.length} imported rows have a purchasePrice - check the source file's column headers against FIELD_ALIASES in lib/property-import-utils.ts.`)
  }

  return NextResponse.json({ created, skipped, errors, completeness })
}
