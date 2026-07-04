import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function syncDealForClosingStatus(dealId: string, status: string, finalAmount: number | null) {
  if (status !== 'CLOSED' && status !== 'FELL_THROUGH') return
  const deal = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!deal) return
  await prisma.deal.update({
    where: { id: deal.id },
    data: {
      status: status === 'CLOSED' ? 'closed' : 'dead',
      notes: [deal.notes, status === 'CLOSED'
        ? `Closed for $${finalAmount?.toLocaleString() ?? '0'}.`
        : 'Closing fell through.'].filter(Boolean).join('\n'),
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const closing = await prisma.closingTracker.findFirst({ where: { id: params.id, userId } })
  if (!closing) return NextResponse.json({ error: 'Closing record not found.' }, { status: 404 })

  const status = body.status ? String(body.status).trim() : closing.status
  const finalAmount = body.finalAmount !== undefined && body.finalAmount !== null && body.finalAmount !== ''
    ? Number(body.finalAmount)
    : closing.finalAmount

  const updated = await prisma.closingTracker.update({
    where: { id: closing.id },
    data: {
      status,
      finalAmount,
      fundsReceivedDate: body.fundsReceivedDate ? new Date(String(body.fundsReceivedDate)) : closing.fundsReceivedDate,
    },
  })

  await syncDealForClosingStatus(closing.dealId, status, finalAmount !== null ? Number(finalAmount) : null)

  return NextResponse.json({ status: 'complete', closing: { id: updated.id, status: updated.status } })
}
