// Shared by both the /api/investors GET route and the capital engine page
// (which queries Prisma directly rather than calling that route) so the
// snapshot-on-read logic for Investor Intelligence Slice 3 lives in one place.
import type { PrismaClient, Prisma } from '@prisma/client'
import { computeInvestorQualification } from './investor-qualification'
import { computeQualificationChange, type QualificationChange, type QualificationSnapshot } from './investor-qualification-change'

type InvestorRow = {
  id: string
  status: string
  availableCapital: Prisma.Decimal | number | null
  preferredReturn: Prisma.Decimal | number | null
  markets: string | null
  email: string | null
  phone: string | null
  evidenceSource: string | null
  updatedAt: Date
  lastQualificationScore: number | null
  lastQualificationReasons: Prisma.JsonValue | null
}

export async function snapshotQualificationChange(
  prisma: PrismaClient,
  investor: InvestorRow,
  hasPriorCapitalActivity: boolean
): Promise<QualificationChange | null> {
  const qualification = computeInvestorQualification({
    status: investor.status,
    availableCapital: investor.availableCapital !== null ? Number(investor.availableCapital) : null,
    preferredReturn: investor.preferredReturn !== null ? Number(investor.preferredReturn) : null,
    markets: investor.markets,
    email: investor.email,
    phone: investor.phone,
    evidenceSource: investor.evidenceSource,
    hasPriorCapitalActivity,
  })

  const previous: QualificationSnapshot = investor.lastQualificationScore != null
    ? { score: investor.lastQualificationScore, reasons: (investor.lastQualificationReasons as string[] | null) ?? [] }
    : null

  const change = computeQualificationChange(qualification, previous)

  const snapshotStale = previous === null
    || previous.score !== qualification.score
    || JSON.stringify(previous.reasons) !== JSON.stringify(qualification.reasons)

  if (snapshotStale) {
    try {
      // Explicit updatedAt preserves the roster's "most recently edited" sort
      // order - this is a background snapshot write, not a real edit.
      await prisma.investor.update({
        where: { id: investor.id },
        data: {
          lastQualificationScore: qualification.score,
          lastQualificationReasons: qualification.reasons as Prisma.InputJsonValue,
          lastQualificationAt: new Date(),
          updatedAt: investor.updatedAt,
        },
      })
    } catch (error) {
      console.error(`Failed to snapshot qualification for investor ${investor.id}`, error)
    }
  }

  return change
}
