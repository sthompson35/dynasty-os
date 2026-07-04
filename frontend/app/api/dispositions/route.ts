// Deprecated: superseded by /api/disposition-packages + /api/assignment-pipeline
// + /api/closing-tracker. Kept for the legacy /engines/disposition page — do not
// build new features against it.
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dispositions = await prisma.disposition.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: { buyer: true },
  })
  return NextResponse.json(dispositions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const disposition = await prisma.disposition.create({
    data: { ...body, userId: session.user.id },
  })
  return NextResponse.json(disposition, { status: 201 })
}
