import { normalizeString } from '@/lib/property-utils'

export type SelectOption = {
  value: string
  label: string
}

export const DOCUMENT_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'contract', label: 'Purchase contract' },
  { value: 'inspection', label: 'Inspection report' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'closing', label: 'Closing documents' },
  { value: 'financial', label: 'Financials' },
  { value: 'photo', label: 'Photos' },
  { value: 'other', label: 'Other' },
]

export type PropertyDocumentDTO = {
  id: string
  propertyId: string
  fileName: string
  cloudStoragePath: string
  contentType: string
  fileSize: number
  category: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
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

export function getDocumentCategory(value: unknown): string {
  const normalized = normalizeString(value)
  const exists = DOCUMENT_CATEGORY_OPTIONS?.some?.((item: SelectOption) => item?.value === normalized) ?? false
  return exists ? normalized : 'other'
}

export function getDocumentCategoryLabel(value: unknown): string {
  const normalized = normalizeString(value)
  const option = DOCUMENT_CATEGORY_OPTIONS?.find?.((item: SelectOption) => item?.value === normalized)
  return option?.label ?? 'Other'
}

export function formatFileSize(bytes: unknown): string {
  const value = typeof bytes === 'number' && Number.isFinite(bytes) ? bytes : Number(bytes ?? 0)
  if (!Number.isFinite(value) || value <= 0) {
    return '—'
  }
  if (value < 1024) {
    return `${Math.round(value)} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function serializeDocument(doc: unknown): PropertyDocumentDTO {
  const raw = (doc ?? {}) as Record<string, unknown>
  return {
    id: String(raw?.id ?? ''),
    propertyId: String(raw?.propertyId ?? ''),
    fileName: normalizeString(raw?.fileName) || 'Untitled file',
    cloudStoragePath: String(raw?.cloudStoragePath ?? ''),
    contentType: normalizeString(raw?.contentType) || 'application/octet-stream',
    fileSize: Math.max(0, Math.round(Number(raw?.fileSize ?? 0) || 0)),
    category: getDocumentCategory(raw?.category),
    isPublic: toBoolean(raw?.isPublic, false),
    createdAt: safeDateToIso(raw?.createdAt),
    updatedAt: safeDateToIso(raw?.updatedAt),
  }
}
