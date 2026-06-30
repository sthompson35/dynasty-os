import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildContactMutationData, serializeContact } from '@/lib/contact-utils'

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
    console.error('Unable to read contact request body', error)
    return {}
  }
}

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? ''
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

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const contactId = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!contactId) {
    return NextResponse.json({ error: 'Contact id is required.' }, { status: 400 })
  }

  const body = await readBody(request)
  const data = buildContactMutationData(body)

  if (!data.name) {
    return NextResponse.json({ error: 'A contact name is required.' }, { status: 400 })
  }

  try {
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
      select: { id: true },
    })

    if (!existing?.id) {
      return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data,
      include: linkInclude,
    })
    return NextResponse.json({ contact: serializeContact(contact) })
  } catch (error: unknown) {
    console.error('Unable to update contact', error)
    return NextResponse.json({ error: 'Unable to update contact.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId()
  const contactId = context?.params?.id ?? ''

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!contactId) {
    return NextResponse.json({ error: 'Contact id is required.' }, { status: 400 })
  }

  try {
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
      select: { id: true },
    })

    if (!existing?.id) {
      return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })
    }

    await prisma.contact.delete({ where: { id: contactId } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Unable to delete contact', error)
    return NextResponse.json({ error: 'Unable to delete contact.' }, { status: 500 })
  }
}
