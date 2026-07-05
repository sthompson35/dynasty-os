import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type AutomationAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

function automationSecret() {
  return process.env.AUTOMATION_SECRET || process.env.WEBHOOK_SECRET || ''
}

function timingSafeEqual(left: string, right: string) {
  if (!left || !right || left.length !== right.length) return false

  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return diff === 0
}

async function resolveAutomationUserId() {
  const configuredUserId = process.env.AUTOMATION_USER_ID || process.env.DYNASTY_AUTOMATION_USER_ID
  if (configuredUserId) return configuredUserId

  const email = process.env.AUTOMATION_USER_EMAIL || process.env.DYNASTY_AUTOMATION_USER_EMAIL || process.env.NOTIFICATION_EMAIL
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (user?.id) return user.id
  }

  const [inventoryOwner] = await prisma.user.findMany({
    select: { id: true },
    orderBy: { properties: { _count: 'desc' } },
    take: 1,
  })
  return inventoryOwner?.id ?? ''
}

export async function requireAutomationAuth(request: Request): Promise<AutomationAuthResult> {
  const expectedSecret = automationSecret()
  if (!expectedSecret) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Automation secret is not configured.' }, { status: 500 }),
    }
  }

  const providedSecret = request.headers.get('x-automation-secret') || ''
  if (!timingSafeEqual(providedSecret, expectedSecret)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Automation authentication required.' }, { status: 401 }),
    }
  }

  const userId = await resolveAutomationUserId()
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Automation user is not configured or was not found.' }, { status: 500 }),
    }
  }

  return { ok: true, userId }
}

export async function readAutomationBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}
