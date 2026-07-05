import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildPropertyMutationData } from '@/lib/property-utils'
import { propertyDuplicateKey } from '@/lib/property-import-utils'

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
      const result = await prisma.property.createMany({
        data: toCreate.map((data) => ({ ...data, userId })),
      })
      created = result.count
    }
  } catch (error: unknown) {
    console.error('Unable to bulk-create properties', error)
    return NextResponse.json({ error: 'Unable to save the imported properties.' }, { status: 500 })
  }

  return NextResponse.json({ created, skipped, errors })
}
