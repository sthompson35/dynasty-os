import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await prisma.project.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: body,
  })
  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { tasks: true },
  })
  return NextResponse.json(project)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.project.deleteMany({ where: { id: params.id, userId: session.user.id } })
  return NextResponse.json({ deleted: true })
}
