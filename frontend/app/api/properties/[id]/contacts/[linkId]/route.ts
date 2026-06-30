import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getDealTeamStatus,
  getRelationshipType,
  safeNumber,
  serializePropertyContactLink,
} from '@/lib/contact-utils'
import { normalizeString } from '@/lib/property-utils'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params?: {
    id?: string
    linkId?: string
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to read property contact request body', error)
    return {}
  }
}

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
}

function nullableDate(value: unknown): Date | null {
  const raw = normalizeString(value)
  if (!raw) {
    return null
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function buildPropertyContactData(body: Record<string, unknown>) {
  return {
    roleOnDeal: normalizeString(body?.roleOnDeal) || null,
    relationshipType: normalizeString(body?.relationshipType) ? getRelationshipType(body?.relationshipType) : null,
    dealResponsibility: normalizeString(body?.dealResponsibility) || null,
    status: getDealTeamStatus(body?.status),
    nextActionDate: nullableDate(body?.nextActionDate),
    lastContacted: nullableDate(body?.lastContacted),
    documentsNeeded: normalizeString(body?.documentsNeeded) || null,
    paymentOwed: safeNumber(body?.paymentOwed),
    receivesUpdates: Boolean(body?.receivesUpdates),
    communicationHistory: normalizeString(body?.communicationHistory) || null,
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const propertyId = context?.params?.id ?? ''
  const linkId = context?.params?.linkId ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!propertyId || !linkId) {
    return NextResponse.json({ error: 'Property and link ids are required.' }, { status: 400 })
  }

  const body = await readBody(request)
  const linkData = buildPropertyContactData(body)

  try {
    const existing = await prisma.propertyContact.findFirst({
      where: { id: linkId, propertyId, userId },
      select: { id: true },
    })

    if (!existing?.id) {
      return NextResponse.json({ error: 'Link not found.' }, { status: 404 })
    }

    const updated = await prisma.propertyContact.update({
      where: { id: linkId },
      data: linkData,
    })
    const serializedLink = serializePropertyContactLink(updated)

    return NextResponse.json({ success: true, link: serializedLink })
  } catch (error: unknown) {
    console.error('Unable to update property contact link', error)
    return NextResponse.json({ error: 'Unable to update this link.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const propertyId = context?.params?.id ?? ''
  const linkId = context?.params?.linkId ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!propertyId || !linkId) {
    return NextResponse.json({ error: 'Property and link ids are required.' }, { status: 400 })
  }

  try {
    const existing = await prisma.propertyContact.findFirst({
      where: { id: linkId, propertyId, userId },
      select: { id: true },
    })

    if (!existing?.id) {
      return NextResponse.json({ error: 'Link not found.' }, { status: 404 })
    }

    await prisma.propertyContact.delete({ where: { id: linkId } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Unable to unlink contact from property', error)
    return NextResponse.json({ error: 'Unable to unlink this contact.' }, { status: 500 })
  }
}
