import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transactions = await prisma.capitalTransaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
    include: { investor: true },
  })
  return NextResponse.json(transactions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const tx = await prisma.capitalTransaction.create({
    data: { ...body, userId: session.user.id },
  })
  return NextResponse.json(tx, { status: 201 })
}
