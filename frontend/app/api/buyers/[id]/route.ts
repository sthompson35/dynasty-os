// Deprecated: superseded by /api/buyer-profiles. Kept for the legacy
// /engines/disposition page — do not build new features against it.
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await prisma.buyer.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: body,
  })
  const buyer = await prisma.buyer.findFirst({ where: { id: params.id, userId: session.user.id } })
  return NextResponse.json(buyer)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.buyer.deleteMany({ where: { id: params.id, userId: session.user.id } })
  return NextResponse.json({ deleted: true })
}
