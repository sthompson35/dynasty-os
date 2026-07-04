import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const status = body.status ? String(body.status).trim() : ''
  if (!status) return NextResponse.json({ error: 'status is required.' }, { status: 400 })

  const followup = await prisma.sellerFollowup.findFirst({ where: { id: params.id, userId } })
  if (!followup) return NextResponse.json({ error: 'Follow-up not found.' }, { status: 404 })

  const updated = await prisma.sellerFollowup.update({ where: { id: followup.id }, data: { status } })
  return NextResponse.json({ status: 'complete', followup: { id: updated.id, status: updated.status } })
}
