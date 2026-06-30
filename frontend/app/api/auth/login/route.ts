import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to read login request body', error)
    return {}
  }
}

export async function POST(request: Request) {
  const body = await readBody(request)
  const email = typeof body?.email === 'string' ? body.email?.toLowerCase?.().trim?.() ?? '' : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user?.id || !user?.password) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email ?? '',
        name: user.name ?? 'Investor',
        role: user.role ?? 'INVESTOR',
      },
    })
  } catch (error: unknown) {
    console.error('Login failed', error)
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 })
  }
}
