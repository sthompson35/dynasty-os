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
  const assignment = await prisma.assignmentPipeline.findFirst({ where: { id: params.id, userId } })
  if (!assignment) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.stage) data.stage = String(body.stage).trim()
  if (body.emdReceived !== undefined) data.emdReceived = Boolean(body.emdReceived)
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() || null : null

  const updated = await prisma.assignmentPipeline.update({ where: { id: assignment.id }, data })
  return NextResponse.json({ status: 'complete', assignment: { id: updated.id, stage: updated.stage, emdReceived: updated.emdReceived } })
}
