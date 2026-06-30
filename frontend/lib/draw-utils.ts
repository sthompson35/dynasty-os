import { SelectOption, toNumber, toNullableNumber, normalizeString } from '@/lib/property-utils'

// Draw schedule = the staged release of rehab/construction loan funds.
// Each draw is tied to a milestone, inspected, then funded by the lender.

export const DRAW_STATUS_OPTIONS: SelectOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'funded', label: 'Funded' },
]

// Ordered workflow used to advance a draw to the next stage.
export const DRAW_STATUS_FLOW = ['pending', 'requested', 'approved', 'funded'] as const

export type DrawDTO = {
  id: string
  propertyId: string
  name: string
  description: string
  amount: number
  status: string
  sortOrder: number
  scheduledDate: string
  fundedDate: string
  lender: string
  createdAt: string
  updatedAt: string
}

export type DrawMutationData = {
  name: string
  description: string
  amount: number
  status: string
  scheduledDate: Date | null
  fundedDate: Date | null
  lender: string
}

function safeChoice(value: unknown, options: SelectOption[], fallback: string): string {
  const normalized = normalizeString(value)
  const exists = options?.some?.((item: SelectOption) => item?.value === normalized) ?? false
  return exists ? normalized : fallback
}

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const text = normalizeString(value)
  if (!text) {
    return null
  }
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function safeDateToIso(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  }
  if (typeof value === 'string' && value) {
    const dateValue = new Date(value)
    return Number.isNaN(dateValue.getTime()) ? '' : dateValue.toISOString()
  }
  return ''
}

export function buildDrawMutationData(input: unknown): DrawMutationData {
  const safeInput = (input ?? {}) as Record<string, unknown>
  const amount = toNullableNumber(safeInput?.amount)
  const status = safeChoice(safeInput?.status, DRAW_STATUS_OPTIONS, 'pending')

  return {
    name: normalizeString(safeInput?.name),
    description: normalizeString(safeInput?.description),
    amount: amount === null || amount < 0 ? 0 : amount,
    status,
    scheduledDate: toDateOrNull(safeInput?.scheduledDate),
    // A draw is only “funded” once money is released — capture the date automatically.
    fundedDate:
      status === 'funded'
        ? toDateOrNull(safeInput?.fundedDate) ?? new Date()
        : toDateOrNull(safeInput?.fundedDate),
    lender: normalizeString(safeInput?.lender),
  }
}

export function serializeDraw(draw: unknown): DrawDTO {
  const raw = (draw ?? {}) as Record<string, unknown>
  return {
    id: String(raw?.id ?? ''),
    propertyId: String(raw?.propertyId ?? ''),
    name: normalizeString(raw?.name),
    description: normalizeString(raw?.description),
    amount: toNumber(raw?.amount),
    status: safeChoice(raw?.status, DRAW_STATUS_OPTIONS, 'pending'),
    sortOrder: Math.round(toNumber(raw?.sortOrder)),
    scheduledDate: safeDateToIso(raw?.scheduledDate),
    fundedDate: safeDateToIso(raw?.fundedDate),
    lender: normalizeString(raw?.lender),
    createdAt: safeDateToIso(raw?.createdAt),
    updatedAt: safeDateToIso(raw?.updatedAt),
  }
}

export type DrawSummary = {
  count: number
  scheduledTotal: number
  fundedTotal: number
  approvedTotal: number
  requestedTotal: number
  pendingTotal: number
  // Money committed by the lender but not yet released (approved, awaiting funding).
  outstandingTotal: number
  remainingTotal: number
  percentFunded: number
  byStatus: { status: string; label: string; count: number; total: number }[]
}

export function summarizeDraws(draws: DrawDTO[] | null | undefined): DrawSummary {
  const safeDraws = Array.isArray(draws) ? draws : []
  const scheduledTotal = safeDraws.reduce((sum, draw) => sum + toNumber(draw?.amount), 0)

  const totalByStatus = (status: string) =>
    safeDraws
      .filter((draw) => draw?.status === status)
      .reduce((sum, draw) => sum + toNumber(draw?.amount), 0)

  const fundedTotal = totalByStatus('funded')
  const approvedTotal = totalByStatus('approved')
  const requestedTotal = totalByStatus('requested')
  const pendingTotal = totalByStatus('pending')

  const byStatus = DRAW_STATUS_OPTIONS.map((option) => ({
    status: option.value,
    label: option.label,
    count: safeDraws.filter((draw) => draw?.status === option.value).length,
    total: totalByStatus(option.value),
  }))

  return {
    count: safeDraws.length,
    scheduledTotal,
    fundedTotal,
    approvedTotal,
    requestedTotal,
    pendingTotal,
    outstandingTotal: approvedTotal + requestedTotal,
    remainingTotal: Math.max(scheduledTotal - fundedTotal, 0),
    percentFunded: scheduledTotal > 0 ? Math.min((fundedTotal / scheduledTotal) * 100, 100) : 0,
    byStatus,
  }
}

export function getDrawStatusLabel(value: unknown): string {
  const normalized = normalizeString(value)
  const option = DRAW_STATUS_OPTIONS?.find?.((item: SelectOption) => item?.value === normalized)
  return option?.label ?? 'Pending'
}

export function getNextDrawStatus(value: unknown): string | null {
  const normalized = normalizeString(value)
  const index = DRAW_STATUS_FLOW.indexOf(normalized as (typeof DRAW_STATUS_FLOW)[number])
  if (index < 0 || index >= DRAW_STATUS_FLOW.length - 1) {
    return null
  }
  return DRAW_STATUS_FLOW[index + 1]
}

// Standard rehab construction milestones used to auto-build a schedule from a budget.
export const DRAW_SCHEDULE_PRESET: { name: string; description: string; share: number }[] = [
  { name: 'Draw 1 — Demo, Debris & Structural', description: 'Tear-out, dumpster, structural repairs, roof', share: 0.2 },
  { name: 'Draw 2 — Rough Mechanicals & Framing', description: 'Framing, rough plumbing, electrical and HVAC', share: 0.25 },
  { name: 'Draw 3 — Insulation, Drywall & Windows', description: 'Insulation, drywall, windows and exterior dry-in', share: 0.2 },
  { name: 'Draw 4 — Finishes', description: 'Cabinets, flooring, paint, trim and fixtures', share: 0.25 },
  { name: 'Draw 5 — Final & Punch List', description: 'Final inspection, punch list and cleanup', share: 0.1 },
]

export function buildPresetDraws(budget: number): DrawMutationData[] {
  const safeBudget = toNumber(budget) > 0 ? toNumber(budget) : 0
  return DRAW_SCHEDULE_PRESET.map((preset) => ({
    name: preset.name,
    description: preset.description,
    amount: Math.round(safeBudget * preset.share),
    status: 'pending',
    scheduledDate: null,
    fundedDate: null,
    lender: '',
  }))
}
