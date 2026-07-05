import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PDFParse } from 'pdf-parse'
import { authOptions } from '@/lib/auth'
import { buildPropertyMutationData } from '@/lib/property-utils'
import { mapRowToPropertyFields } from '@/lib/property-import-utils'
import { requestJsonCompletion, LLMStudioError } from '@/lib/llmstudio'

export const dynamic = 'force-dynamic'

const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_TEXT_CHARS = 12000

const SYSTEM_PROMPT = `You extract real estate property details from documents (listing sheets, appraisals, property reports) into strict JSON.
Return ONLY a JSON object with these exact keys (omit a key if the document doesn't mention it):
address, city, state, zip, propertyType (one of: single-family, multi-family, land, other), bedrooms (number), bathrooms (number), sqft (number), lotSize (number), yearBuilt (number), purchasePrice (number), currentValue (number), arv (number), repairCosts (number), holdingCosts (number), closingCosts (number), notes (string).
Do not include any prose, explanation, or markdown — only the JSON object.`

// Extracts property fields from an uploaded PDF via a local LLM (LM Studio).
// Returns a single preview record for the client to review/edit before
// saving through the normal POST /api/properties endpoint — this route never
// writes to the database itself.
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
  const isPdf = typedFile.type === 'application/pdf' || typedFile.name?.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 })
  }
  if (typedFile.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File must be under 20MB.' }, { status: 400 })
  }

  let text: string
  try {
    const buffer = Buffer.from(await typedFile.arrayBuffer())
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    text = result.text?.trim() ?? ''
  } catch (error: unknown) {
    console.error('Unable to extract text from PDF', error)
    return NextResponse.json(
      { error: 'Unable to read this PDF. It may be corrupted, encrypted, or scanned as images without text.' },
      { status: 400 }
    )
  }

  if (!text) {
    return NextResponse.json(
      { error: 'No extractable text found in this PDF (it may be a scanned image without a text layer).' },
      { status: 400 }
    )
  }

  let extracted: Record<string, unknown>
  try {
    extracted = await requestJsonCompletion({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: text.slice(0, MAX_TEXT_CHARS),
    })
  } catch (error: unknown) {
    if (error instanceof LLMStudioError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    console.error('Unable to extract property fields via LM Studio', error)
    return NextResponse.json({ error: 'Unable to extract property details from this PDF.' }, { status: 502 })
  }

  const mapped = mapRowToPropertyFields(extracted)
  const data = buildPropertyMutationData(mapped)

  return NextResponse.json({ row: data })
}
