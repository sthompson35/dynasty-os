import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to read signup request body', error)
    return {}
  }
}

export async function POST(request: Request) {
  const body = await readBody(request)
  const email = typeof body?.email === 'string' ? body.email?.toLowerCase?.().trim?.() ?? '' : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const name = typeof body?.name === 'string' ? body.name?.trim?.() ?? '' : ''

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  if (!password || (password?.length ?? 0) < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser?.id) {
      return NextResponse.json({ error: 'An account already exists for that email.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email,
        name: name || 'Investor',
        password: passwordHash,
        role: 'INVESTOR',
      },
    })

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email ?? '',
        name: user.name ?? 'Investor',
        role: user.role ?? 'INVESTOR',
      },
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Signup failed', error)
    return NextResponse.json({ error: 'Unable to create the account right now.' }, { status: 500 })
  }
}
