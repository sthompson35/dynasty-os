import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const buyers = await prisma.buyer.findMany({
    where: { userId: session.user.id },
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
  })
  return NextResponse.json(buyers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const buyer = await prisma.buyer.create({
    data: { ...body, userId: session.user.id },
  })
  return NextResponse.json(buyer, { status: 201 })
}
