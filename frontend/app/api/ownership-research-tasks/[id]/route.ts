import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { resolveResearchCompletion } from '@/lib/ownership-research/complete-research-task'
import { buildSkipTraceRow } from '@/lib/skip-trace/build-skip-trace-row'
import { toNumber } from '@/lib/property-utils'

export const dynamic = 'force-dynamic'

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await readBody(request)
  const completion = resolveResearchCompletion({
    ownerName: body.ownerName,
    confidence: body.confidence,
    sourceUrl: body.sourceUrl,
    notes: body.notes,
  })
  if (!completion) {
    return NextResponse.json({ error: 'Owner name is required.' }, { status: 400 })
  }

  const task = await prisma.ownershipResearchTask.findFirst({ where: { id: params.id, userId } })
  if (!task) return NextResponse.json({ error: 'Ownership research task not found.' }, { status: 404 })

  const skipTraceItem = await prisma.skipTraceExportQueue.findFirst({
    where: { id: task.skipTraceQueueId, userId },
    include: {
      ownerArtifact: true,
      property: {
        select: {
          address: true,
          city: true,
          state: true,
          zip: true,
          dealScores: { where: { userId }, take: 1, orderBy: { updatedAt: 'desc' }, select: { dealScore: true, scoreBucket: true, decision: true } },
          leadActionQueue: { where: { userId }, take: 1, orderBy: { updatedAt: 'desc' }, select: { actionType: true } },
        },
      },
    },
  })
  if (!skipTraceItem) return NextResponse.json({ error: 'Linked skip trace queue row not found.' }, { status: 404 })

  const mailingAddress = skipTraceItem.ownerArtifact.mailingAddress ?? task.mailingAddress

  const updatedArtifact = await prisma.ownerIntelligenceArtifact.update({
    where: { id: skipTraceItem.ownerArtifactId },
    data: {
      ownerName: completion.ownerName,
      mailingAddress,
      ownerType: completion.ownerType,
      contactConfidence: Math.max(skipTraceItem.ownerArtifact.contactConfidence, completion.confidence),
      source: 'MANUAL_RESEARCH',
      evidence: {
        ...(skipTraceItem.ownerArtifact.evidence as Record<string, unknown>),
        researchSourceUrl: completion.sourceUrl,
        researchNotes: completion.notes,
        researchConfidence: completion.confidence,
        researchCompletedAt: new Date().toISOString(),
      },
    },
  })

  const score = skipTraceItem.property.dealScores[0]
  const action = skipTraceItem.property.leadActionQueue[0]
  const skipTraceResult = buildSkipTraceRow({
    propertyId: task.propertyId,
    ownerArtifactId: updatedArtifact.id,
    userId,
    propertyAddress: skipTraceItem.propertyAddress,
    mailingAddress,
    absenteeOwner: updatedArtifact.absenteeOwner,
    vacancySignal: updatedArtifact.vacancyIndicator,
    equitySignal: toNumber(updatedArtifact.equityEstimate) || null,
    ownerName: completion.ownerName,
    contactConfidence: updatedArtifact.contactConfidence,
    phones: arrayOfStrings(updatedArtifact.phones),
    emails: arrayOfStrings(updatedArtifact.emails),
    dealScore: score?.dealScore ?? null,
    scoreBucket: score?.scoreBucket ?? null,
    decision: score?.decision ?? null,
    actionType: action?.actionType ?? null,
  })

  await prisma.skipTraceExportQueue.update({
    where: { id: skipTraceItem.id },
    data: {
      mailingAddress,
      priority: skipTraceResult.priority,
      recommendedChannel: skipTraceResult.recommendedChannel,
      evidence: skipTraceResult.evidence,
    },
  })

  const updatedTask = await prisma.ownershipResearchTask.update({
    where: { id: task.id },
    data: {
      researchStatus: 'COMPLETED',
      recoveredOwnerName: completion.ownerName,
      confidence: completion.confidence,
      sourceUrl: completion.sourceUrl,
      researchNotes: completion.notes,
      completedAt: new Date(),
      mailingAddress,
    },
  })

  return NextResponse.json({
    status: 'complete',
    task: {
      id: updatedTask.id,
      researchStatus: updatedTask.researchStatus,
      recoveredOwnerName: updatedTask.recoveredOwnerName,
      confidence: updatedTask.confidence,
    },
    recommendedChannel: skipTraceResult.recommendedChannel,
  })
}
