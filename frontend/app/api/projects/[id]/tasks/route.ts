import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const maxOrder = await prisma.projectTask.aggregate({ where: { projectId: params.id }, _max: { sortOrder: true } })
  const task = await prisma.projectTask.create({
    data: { ...body, projectId: params.id, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
  })
  return NextResponse.json(task, { status: 201 })
}
