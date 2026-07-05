import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { parse } from 'csv-parse/sync'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildPropertyMutationData } from '@/lib/property-utils'
import { mapRowToPropertyFields, propertyDuplicateKey } from '@/lib/property-import-utils'

export const dynamic = 'force-dynamic'

const MAX_ROWS = 2000
const MAX_FILE_BYTES = 10 * 1024 * 1024

// Parses an uploaded CSV and returns a preview of what would be imported —
// this route never writes to the database. The client reviews/deselects rows,
// then POSTs the kept rows to /api/properties/import/commit.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  const typedFile = file as File
  if (typedFile.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File must be under 10MB.' }, { status: 400 })
  }

  let records: Record<string, unknown>[]
  try {
    const text = await typedFile.text()
    records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, unknown>[]
  } catch (error: unknown) {
    console.error('Unable to parse CSV', error)
    return NextResponse.json({ error: 'Unable to parse this file as CSV. Check the format and try again.' }, { status: 400 })
  }

  if (records.length === 0) {
    return NextResponse.json({ error: 'No rows found in this CSV.' }, { status: 400 })
  }
  if (records.length > MAX_ROWS) {
    return NextResponse.json({ error: `This file has ${records.length} rows; the limit is ${MAX_ROWS} per import.` }, { status: 400 })
  }

  const existingProperties = await prisma.property.findMany({
    where: { userId },
    select: { address: true, city: true, state: true },
  })
  const existingKeys = new Set(existingProperties.map((property) => propertyDuplicateKey(property)))

  const rows = records.map((record, index) => {
    const mapped = mapRowToPropertyFields(record)
    const data = buildPropertyMutationData(mapped)
    const errors: string[] = []
    if (!data.address) errors.push('Missing address')
    if (!data.city) errors.push('Missing city')
    if (!data.state) errors.push('Missing state')
    const duplicate = errors.length === 0 && existingKeys.has(propertyDuplicateKey(data))
    // +2: CSV rows are 1-indexed and the header row itself is row 1.
    return { rowNumber: index + 2, data, errors, duplicate }
  })

  return NextResponse.json({ rows, totalRows: rows.length })
}
