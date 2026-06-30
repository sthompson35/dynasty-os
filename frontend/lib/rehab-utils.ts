import { SelectOption, toNullableNumber, toNumber, normalizeString } from '@/lib/property-utils'

export const REHAB_ROOM_OPTIONS: SelectOption[] = [
  { value: 'Kitchen', label: 'Kitchen' },
  { value: 'Primary Bath', label: 'Primary Bath' },
  { value: 'Bathrooms', label: 'Bathrooms' },
  { value: 'Living Areas', label: 'Living Areas' },
  { value: 'Bedrooms', label: 'Bedrooms' },
  { value: 'Flooring', label: 'Flooring' },
  { value: 'Roof', label: 'Roof' },
  { value: 'Exterior', label: 'Exterior' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Foundation', label: 'Foundation' },
  { value: 'Landscaping', label: 'Landscaping' },
  { value: 'General', label: 'General / Other' },
]

export const REHAB_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'Materials', label: 'Materials' },
  { value: 'Labor', label: 'Labor' },
  { value: 'Fixtures', label: 'Fixtures' },
  { value: 'Permits', label: 'Permits & Fees' },
  { value: 'Contingency', label: 'Contingency' },
]

export const REHAB_STATUS_OPTIONS: SelectOption[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'complete', label: 'Complete' },
]

export type RehabItemDTO = {
  id: string
  propertyId: string
  room: string
  category: string
  description: string
  quantity: number
  unitCost: number
  lineTotal: number
  status: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type RehabItemMutationData = {
  room: string
  category: string
  description: string
  quantity: number
  unitCost: number
  status: string
}

function safeChoice(value: unknown, options: SelectOption[], fallback: string): string {
  const normalized = normalizeString(value)
  const exists = options?.some?.((item: SelectOption) => item?.value === normalized) ?? false
  return exists ? normalized : fallback
}

function safeDateToIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === 'string') {
    const dateValue = new Date(value)
    return Number.isNaN(dateValue?.getTime?.() ?? Number.NaN) ? '' : dateValue.toISOString()
  }
  return ''
}

export function buildRehabItemMutationData(input: unknown): RehabItemMutationData {
  const safeInput = (input ?? {}) as Record<string, unknown>
  const quantity = toNullableNumber(safeInput?.quantity)
  const unitCost = toNullableNumber(safeInput?.unitCost)

  return {
    room: safeChoice(safeInput?.room, REHAB_ROOM_OPTIONS, 'General'),
    category: safeChoice(safeInput?.category, REHAB_CATEGORY_OPTIONS, 'Materials'),
    description: normalizeString(safeInput?.description),
    quantity: quantity === null || quantity <= 0 ? 1 : quantity,
    unitCost: unitCost === null ? 0 : unitCost,
    status: safeChoice(safeInput?.status, REHAB_STATUS_OPTIONS, 'planned'),
  }
}

export function serializeRehabItem(item: unknown): RehabItemDTO {
  const raw = (item ?? {}) as Record<string, unknown>
  const quantity = toNumber(raw?.quantity)
  const unitCost = toNumber(raw?.unitCost)
  const safeQuantity = quantity > 0 ? quantity : 1

  return {
    id: String(raw?.id ?? ''),
    propertyId: String(raw?.propertyId ?? ''),
    room: safeChoice(raw?.room, REHAB_ROOM_OPTIONS, 'General'),
    category: safeChoice(raw?.category, REHAB_CATEGORY_OPTIONS, 'Materials'),
    description: normalizeString(raw?.description),
    quantity: safeQuantity,
    unitCost,
    lineTotal: safeQuantity * unitCost,
    status: safeChoice(raw?.status, REHAB_STATUS_OPTIONS, 'planned'),
    sortOrder: Math.round(toNumber(raw?.sortOrder)),
    createdAt: safeDateToIso(raw?.createdAt),
    updatedAt: safeDateToIso(raw?.updatedAt),
  }
}

export type RehabSummary = {
  total: number
  itemCount: number
  byRoom: { room: string; total: number }[]
  byStatus: { status: string; label: string; total: number }[]
}

export function summarizeRehabItems(items: RehabItemDTO[] | null | undefined): RehabSummary {
  const safeItems = Array.isArray(items) ? items : []
  const total = safeItems.reduce((sum: number, item: RehabItemDTO) => sum + toNumber(item?.lineTotal), 0)

  const roomMap = new Map<string, number>()
  safeItems.forEach((item: RehabItemDTO) => {
    const key = item?.room ?? 'General'
    roomMap.set(key, (roomMap.get(key) ?? 0) + toNumber(item?.lineTotal))
  })
  const byRoom = Array.from(roomMap.entries())
    .map(([room, roomTotal]) => ({ room, total: roomTotal }))
    .sort((a, b) => b.total - a.total)

  const byStatus = REHAB_STATUS_OPTIONS.map((option: SelectOption) => ({
    status: option.value,
    label: option.label,
    total: safeItems
      .filter((item: RehabItemDTO) => item?.status === option.value)
      .reduce((sum: number, item: RehabItemDTO) => sum + toNumber(item?.lineTotal), 0),
  }))

  return {
    total,
    itemCount: safeItems.length,
    byRoom,
    byStatus,
  }
}

export function getRehabStatusLabel(value: unknown): string {
  const normalized = normalizeString(value)
  const option = REHAB_STATUS_OPTIONS?.find?.((item: SelectOption) => item?.value === normalized)
  return option?.label ?? 'Planned'
}
