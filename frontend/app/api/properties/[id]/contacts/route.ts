import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  buildContactMutationData,
  getDealTeamStatus,
  getRelationshipType,
  safeNumber,
  serializeContact,
  serializePropertyContactLink,
} from '@/lib/contact-utils'
import { normalizeString } from '@/lib/property-utils'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params?: {
    id?: string
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

const linkInclude = {
  links: {
    include: {
      property: {
        select: { id: true, address: true, city: true, state: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
}

export async function GET(_request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const propertyId = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!propertyId) {
    return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
  }

  try {
    const links = await prisma.propertyContact.findMany({
      where: { propertyId, userId },
      include: {
        contact: { include: linkInclude },
      },
      orderBy: { createdAt: 'desc' },
    })

    const contacts = links?.map?.((link: Record<string, unknown>) => {
      const serialized = serializeContact(link?.contact)
      const serializedLink = serializePropertyContactLink(link)
      return {
        ...serialized,
        linkId: serializedLink.id,
        roleOnDeal: serializedLink.roleOnDeal,
        relationshipType: serializedLink.relationshipType,
        dealResponsibility: serializedLink.dealResponsibility,
        status: serializedLink.status,
        nextActionDate: serializedLink.nextActionDate,
        lastContacted: serializedLink.lastContacted,
        documentsNeeded: serializedLink.documentsNeeded,
        paymentOwed: serializedLink.paymentOwed,
        receivesUpdates: serializedLink.receivesUpdates,
        communicationHistory: serializedLink.communicationHistory,
      }
    }) ?? []

    return NextResponse.json({ contacts })
  } catch (error: unknown) {
    console.error('Unable to load property contacts', error)
    return NextResponse.json({ error: 'Unable to load contacts for this property.' }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const propertyId = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!propertyId) {
    return NextResponse.json({ error: 'Property id is required.' }, { status: 400 })
  }

  const body = await readBody(request)
  const requestedContactId = normalizeString(body?.contactId)
  const linkData = buildPropertyContactData(body)

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId },
      select: { id: true },
    })

    if (!property?.id) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
    }

    let contactId = requestedContactId

    if (contactId) {
      const existingContact = await prisma.contact.findFirst({
        where: { id: contactId, userId },
        select: { id: true },
      })
      if (!existingContact?.id) {
        return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })
      }
    } else {
      const data = buildContactMutationData(body)
      if (!data.name) {
        return NextResponse.json({ error: 'A contact name is required.' }, { status: 400 })
      }
      const createdContact = await prisma.contact.create({
        data: { ...data, userId },
        select: { id: true },
      })
      contactId = createdContact.id
    }

    const existingLink = await prisma.propertyContact.findUnique({
      where: { propertyId_contactId: { propertyId, contactId } },
      select: { id: true },
    })

    if (existingLink?.id) {
      return NextResponse.json({ error: 'That contact is already linked to this property.' }, { status: 409 })
    }

    await prisma.propertyContact.create({
      data: {
        propertyId,
        contactId,
        userId,
        ...linkData,
      },
    })

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId },
      include: linkInclude,
    })

    const link = await prisma.propertyContact.findUnique({
      where: { propertyId_contactId: { propertyId, contactId } },
    })

    const serialized = serializeContact(contact)
    const serializedLink = serializePropertyContactLink(link)

    return NextResponse.json(
      {
        contact: {
          ...serialized,
          linkId: serializedLink.id,
          roleOnDeal: serializedLink.roleOnDeal,
          relationshipType: serializedLink.relationshipType,
          dealResponsibility: serializedLink.dealResponsibility,
          status: serializedLink.status,
          nextActionDate: serializedLink.nextActionDate,
          lastContacted: serializedLink.lastContacted,
          documentsNeeded: serializedLink.documentsNeeded,
          paymentOwed: serializedLink.paymentOwed,
          receivesUpdates: serializedLink.receivesUpdates,
          communicationHistory: serializedLink.communicationHistory,
        },
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    console.error('Unable to link contact to property', error)
    return NextResponse.json({ error: 'Unable to link contact to this property.' }, { status: 500 })
  }
}
