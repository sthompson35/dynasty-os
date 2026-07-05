import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateDealMetrics, getPropertyDisplayName, serializeProperty } from '@/lib/property-utils'
import { serializeRehabItem, summarizeRehabItems } from '@/lib/rehab-utils'
import { buildDealReportHtml, DealReportOptions } from '@/lib/deal-report-html'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params?: {
    id?: string
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function slugify(value: string): string {
  return (value || 'deal-report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'deal-report'
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  const propertyId = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!propertyId) {
    return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
  }

  const body = await readBody(request)
  const shareId = typeof body?.shareId === 'string' ? body.shareId : ''

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId },
      include: {
        rehabItems: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    if (!property?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    let options: DealReportOptions = {
      showFinancials: true,
      showRehab: true,
    }

    if (shareId) {
      const share = await prisma.dealShare.findFirst({
        where: { id: shareId, userId, propertyId },
      })
      if (share?.id) {
        options = {
          title: share.title,
          preparedBy: share.preparedBy,
          contactEmail: share.contactEmail,
          message: share.message,
          showFinancials: share.showFinancials,
          showRehab: share.showRehab,
        }
      }
    }

    const serialized = serializeProperty(property)
    const metrics = calculateDealMetrics(serialized)
    const rehabItems = property.rehabItems?.map?.((item: unknown) => serializeRehabItem(item)) ?? []
    const rehabSummary = summarizeRehabItems(rehabItems)

    const html = buildDealReportHtml({
      property: serialized,
      metrics,
      rehabItems,
      rehabSummary,
      options,
    })

    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content: html,
        pdf_options: { format: 'A4', print_background: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } },
        base_url: process.env.NEXTAUTH_URL || '',
      }),
    })

    if (!createResponse.ok) {
      const errorPayload = await createResponse.json().catch(() => ({ error: 'Failed to create PDF request' }))
      console.error('PDF create request failed', errorPayload)
      return NextResponse.json({ error: 'Unable to start report generation.' }, { status: 502 })
    }

    const { request_id: requestId } = await createResponse.json()
    if (!requestId) {
      return NextResponse.json({ error: 'Report service did not return a request id.' }, { status: 502 })
    }

    const maxAttempts = 180
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, deployment_token: process.env.ABACUSAI_API_KEY }),
      })

      const statusResult = await statusResponse.json().catch(() => ({ status: 'FAILED' }))
      const status = statusResult?.status || 'FAILED'
      const result = statusResult?.result || null

      if (status === 'SUCCESS' && result?.result) {
        const pdfBuffer = Buffer.from(result.result, 'base64')
        const fileName = `${slugify(getPropertyDisplayName(serialized))}-deal-report.pdf`
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Cache-Control': 'no-store',
          },
        })
      }

      if (status === 'FAILED') {
        console.error('PDF generation failed', result)
        return NextResponse.json({ error: 'Report generation failed.' }, { status: 502 })
      }
    }

    return NextResponse.json({ error: 'Report generation timed out. Please try again.' }, { status: 504 })
  } catch (error: unknown) {
    console.error('Unable to generate deal report', error)
    return NextResponse.json({ error: 'Unable to generate deal report.' }, { status: 500 })
  }
}
