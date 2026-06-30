import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildContactMutationData, serializeContact } from '@/lib/contact-utils'

export const dynamic = 'force-dynamic'

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

export async function GET() {
  const userId = await requireUserId()

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  try {
    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: linkInclude,
      orderBy: [{ name: 'asc' }],
    })
    return NextResponse.json({
      contacts: contacts?.map?.((contact: unknown) => serializeContact(contact)) ?? [],
    })
  } catch (error: unknown) {
    console.error('Unable to load contacts', error)
    return NextResponse.json({ error: 'Unable to load contacts.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await requireUserId()

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const body = await readBody(request)
  const data = buildContactMutationData(body)

  if (!data.name) {
    return NextResponse.json({ error: 'A contact name is required.' }, { status: 400 })
  }

  try {
    const contact = await prisma.contact.create({
      data: {
        ...data,
        userId,
      },
      include: linkInclude,
    })
    return NextResponse.json({ contact: serializeContact(contact) }, { status: 201 })
  } catch (error: unknown) {
    console.error('Unable to create contact', error)
    return NextResponse.json({ error: 'Unable to create contact.' }, { status: 500 })
  }
}
