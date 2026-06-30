import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await prisma.deal.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: body,
  })
  const deal = await prisma.deal.findFirst({ where: { id: params.id, userId: session.user.id } })
  return NextResponse.json(deal)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.deal.deleteMany({ where: { id: params.id, userId: session.user.id } })
  return NextResponse.json({ deleted: true })
}
