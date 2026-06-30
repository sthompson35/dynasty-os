import { normalizeString, toNumber } from '@/lib/property-utils'

export type DealShareDTO = {
  id: string
  propertyId: string
  token: string
  title: string | null
  message: string | null
  preparedBy: string | null
  contactEmail: string | null
  showFinancials: boolean
  showRehab: boolean
  isActive: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
}

export type DealShareMutationData = {
  title: string | null
  message: string | null
  preparedBy: string | null
  contactEmail: string | null
  showFinancials: boolean
  showRehab: boolean
  isActive: boolean
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

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  if (value === 'true' || value === 1 || value === '1') {
    return true
  }
  if (value === 'false' || value === 0 || value === '0') {
    return false
  }
  return fallback
}

// URL-safe token generator using only unambiguous characters.
export function generateShareToken(length = 22): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length)
    token += alphabet.charAt(index)
  }
  return token
}

export function buildShareMutationData(input: unknown): DealShareMutationData {
  const safeInput = (input ?? {}) as Record<string, unknown>
  return {
    title: normalizeString(safeInput?.title) || null,
    message: normalizeString(safeInput?.message) || null,
    preparedBy: normalizeString(safeInput?.preparedBy) || null,
    contactEmail: normalizeString(safeInput?.contactEmail) || null,
    showFinancials: toBoolean(safeInput?.showFinancials, true),
    showRehab: toBoolean(safeInput?.showRehab, true),
    isActive: toBoolean(safeInput?.isActive, true),
  }
}

export function serializeShare(share: unknown): DealShareDTO {
  const raw = (share ?? {}) as Record<string, unknown>
  return {
    id: String(raw?.id ?? ''),
    propertyId: String(raw?.propertyId ?? ''),
    token: String(raw?.token ?? ''),
    title: normalizeString(raw?.title) || null,
    message: normalizeString(raw?.message) || null,
    preparedBy: normalizeString(raw?.preparedBy) || null,
    contactEmail: normalizeString(raw?.contactEmail) || null,
    showFinancials: toBoolean(raw?.showFinancials, true),
    showRehab: toBoolean(raw?.showRehab, true),
    isActive: toBoolean(raw?.isActive, true),
    viewCount: Math.round(toNumber(raw?.viewCount)),
    createdAt: safeDateToIso(raw?.createdAt),
    updatedAt: safeDateToIso(raw?.updatedAt),
  }
}
