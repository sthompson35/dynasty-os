export type SelectOption = {
  value: string
  label: string
}

export const PROPERTY_TYPE_OPTIONS: SelectOption[] = [
  { value: 'single-family', label: 'Single-family' },
  { value: 'multi-family', label: 'Multi-family' },
  { value: 'land', label: 'Land development' },
  { value: 'other', label: 'Other' },
]

export const PROPERTY_STATUS_OPTIONS: SelectOption[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'under-contract', label: 'Under contract' },
  { value: 'owned', label: 'Owned' },
  { value: 'sold', label: 'Sold' },
]

export type PropertyDTO = {
  id: string
  address: string
  city: string
  state: string
  zip: string | null
  propertyType: string
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lotSize: number | null
  yearBuilt: number | null
  purchasePrice: number | null
  currentValue: number | null
  status: string
  photoUrl: string | null
  notes: string | null
  virtualTourUrl: string | null
  arv: number | null
  repairCosts: number | null
  holdingCosts: number | null
  closingCosts: number | null
  createdAt: string
  updatedAt: string
}

export type PropertyMutationData = {
  address: string
  city: string
  state: string
  zip: string | null
  propertyType: string
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lotSize: number | null
  yearBuilt: number | null
  purchasePrice: number | null
  currentValue: number | null
  status: string
  photoUrl: string | null
  notes: string | null
  virtualTourUrl: string | null
  arv: number | null
  repairCosts: number | null
  holdingCosts: number | null
  closingCosts: number | null
}

export type DealMetrics = {
  mao: number
  profit: number
  roi: number
  totalInvestment: number
  equity: number
  spreadToMao: number
  tone: 'good' | 'bad' | 'breakEven'
  decision: string
}

export function normalizeString(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  return value?.trim?.() ?? ''
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value?.replace?.(/[$,]/g, '')?.trim?.() ?? '0')
    return Number.isFinite(parsed) ? parsed : 0
  }

  const maybeString = (value as { toString?: () => string })?.toString?.() ?? '0'
  const parsed = Number(maybeString?.replace?.(/[$,]/g, '')?.trim?.() ?? '0')
  return Number.isFinite(parsed) ? parsed : 0
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const numberValue = toNumber(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

export function toNullableInt(value: unknown): number | null {
  const numberValue = toNullableNumber(value)
  if (numberValue === null) {
    return null
  }
  return Math.round(numberValue)
}

export function formatCurrency(value: unknown): string {
  const numberValue = toNumber(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

export function formatCompactCurrency(value: unknown): string {
  const numberValue = toNumber(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(numberValue)
}

export function formatPercent(value: unknown): string {
  const numberValue = toNumber(value)
  return `${numberValue.toFixed(1)}%`
}

export function formatNumber(value: unknown): string {
  const numberValue = toNumber(value)
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(numberValue)
}

export function getTypeLabel(value: unknown): string {
  const normalized = normalizeString(value)
  const option = PROPERTY_TYPE_OPTIONS?.find?.((item: SelectOption) => item?.value === normalized)
  return option?.label ?? 'Other'
}

export function getStatusLabel(value: unknown): string {
  const normalized = normalizeString(value)
  const option = PROPERTY_STATUS_OPTIONS?.find?.((item: SelectOption) => item?.value === normalized)
  return option?.label ?? 'Prospect'
}

export function getPropertyDisplayName(property: PropertyDTO | null | undefined): string {
  const address = property?.address ?? ''
  const city = property?.city ?? ''
  const state = property?.state ?? ''
  return [address, city, state]?.filter?.((part: string) => Boolean(part))?.join?.(', ') ?? 'Untitled property'
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

function safeChoice(value: unknown, options: SelectOption[], fallback: string): string {
  const normalized = normalizeString(value)
  const exists = options?.some?.((item: SelectOption) => item?.value === normalized) ?? false
  return exists ? normalized : fallback
}

export function buildPropertyMutationData(input: unknown): PropertyMutationData {
  const safeInput = (input ?? {}) as Record<string, unknown>

  return {
    address: normalizeString(safeInput?.address),
    city: normalizeString(safeInput?.city),
    state: normalizeString(safeInput?.state),
    zip: normalizeString(safeInput?.zip) || null,
    propertyType: safeChoice(safeInput?.propertyType, PROPERTY_TYPE_OPTIONS, 'other'),
    bedrooms: toNullableInt(safeInput?.bedrooms),
    bathrooms: toNullableNumber(safeInput?.bathrooms),
    sqft: toNullableInt(safeInput?.sqft),
    lotSize: toNullableNumber(safeInput?.lotSize),
    yearBuilt: toNullableInt(safeInput?.yearBuilt),
    purchasePrice: toNullableNumber(safeInput?.purchasePrice),
    currentValue: toNullableNumber(safeInput?.currentValue),
    status: safeChoice(safeInput?.status, PROPERTY_STATUS_OPTIONS, 'prospect'),
    photoUrl: normalizeString(safeInput?.photoUrl) || null,
    notes: normalizeString(safeInput?.notes) || null,
    virtualTourUrl: normalizeString(safeInput?.virtualTourUrl) || null,
    arv: toNullableNumber(safeInput?.arv),
    repairCosts: toNullableNumber(safeInput?.repairCosts),
    holdingCosts: toNullableNumber(safeInput?.holdingCosts),
    closingCosts: toNullableNumber(safeInput?.closingCosts),
  }
}

export function serializeProperty(property: unknown): PropertyDTO {
  const raw = (property ?? {}) as Record<string, unknown>

  return {
    id: String(raw?.id ?? ''),
    address: normalizeString(raw?.address),
    city: normalizeString(raw?.city),
    state: normalizeString(raw?.state),
    zip: normalizeString(raw?.zip) || null,
    propertyType: safeChoice(raw?.propertyType, PROPERTY_TYPE_OPTIONS, 'other'),
    bedrooms: toNullableInt(raw?.bedrooms),
    bathrooms: toNullableNumber(raw?.bathrooms),
    sqft: toNullableInt(raw?.sqft),
    lotSize: toNullableNumber(raw?.lotSize),
    yearBuilt: toNullableInt(raw?.yearBuilt),
    purchasePrice: toNullableNumber(raw?.purchasePrice),
    currentValue: toNullableNumber(raw?.currentValue),
    status: safeChoice(raw?.status, PROPERTY_STATUS_OPTIONS, 'prospect'),
    photoUrl: normalizeString(raw?.photoUrl) || null,
    notes: normalizeString(raw?.notes) || null,
    virtualTourUrl: normalizeString(raw?.virtualTourUrl) || null,
    arv: toNullableNumber(raw?.arv),
    repairCosts: toNullableNumber(raw?.repairCosts),
    holdingCosts: toNullableNumber(raw?.holdingCosts),
    closingCosts: toNullableNumber(raw?.closingCosts),
    createdAt: safeDateToIso(raw?.createdAt),
    updatedAt: safeDateToIso(raw?.updatedAt),
  }
}

export function calculateDealMetrics(property: Partial<PropertyDTO> | null | undefined): DealMetrics {
  const purchasePrice = toNumber(property?.purchasePrice)
  const currentValue = toNumber(property?.currentValue)
  const arv = toNumber(property?.arv ?? property?.currentValue)
  const repairCosts = toNumber(property?.repairCosts)
  const holdingCosts = toNumber(property?.holdingCosts)
  const closingCosts = toNumber(property?.closingCosts)
  const mao = (arv * 0.7) - repairCosts
  const totalInvestment = purchasePrice + repairCosts + holdingCosts + closingCosts
  const profit = arv - purchasePrice - repairCosts - holdingCosts - closingCosts
  const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0
  const equity = currentValue - purchasePrice
  const spreadToMao = mao - purchasePrice
  const tone = profit > 5000 && roi >= 10 ? 'good' : profit < 0 || roi < 0 ? 'bad' : 'breakEven'
  const decision = tone === 'good' ? 'Strong deal' : tone === 'bad' ? 'Needs discipline' : 'Break-even watch'

  return {
    mao,
    profit,
    roi,
    totalInvestment,
    equity,
    spreadToMao,
    tone,
    decision,
  }
}
