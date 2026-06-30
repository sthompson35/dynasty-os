import { normalizeString } from '@/lib/property-utils'

export type PropertyImageDTO = {
  id: string
  propertyId: string
  url: string
  cloudStoragePath: string
  caption: string | null
  isPrimary: boolean
  sortOrder: number
  createdAt: string | null
}

export type PropertyImageMutationData = {
  url: string
  cloudStoragePath: string
  caption: string | null
  isPrimary?: boolean
  sortOrder?: number
}

function safeDateToIso(value: unknown): string | null {
  if (!value) {
    return null
  }
  try {
    const date = value instanceof Date ? value : new Date(String(value))
    if (Number.isNaN(date.getTime())) {
      return null
    }
    return date.toISOString()
  } catch (error: unknown) {
    return null
  }
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    return value === 'true' || value === '1'
  }
  return Boolean(value)
}

function toInt(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

// Builds a sanitized record for creating a PropertyImage from raw client input.
export function buildPropertyImageMutationData(input: Record<string, unknown> | null | undefined): PropertyImageMutationData | null {
  const url = normalizeString(input?.url)
  const cloudStoragePath = normalizeString(input?.cloudStoragePath)
  if (!url || !cloudStoragePath) {
    return null
  }
  const caption = normalizeString(input?.caption) || null
  const data: PropertyImageMutationData = { url, cloudStoragePath, caption }
  if (input?.isPrimary !== undefined) {
    data.isPrimary = toBoolean(input?.isPrimary)
  }
  if (input?.sortOrder !== undefined) {
    data.sortOrder = toInt(input?.sortOrder, 0)
  }
  return data
}

export function serializePropertyImage(raw: Record<string, any> | null | undefined): PropertyImageDTO {
  return {
    id: String(raw?.id ?? ''),
    propertyId: String(raw?.propertyId ?? ''),
    url: normalizeString(raw?.url),
    cloudStoragePath: normalizeString(raw?.cloudStoragePath),
    caption: raw?.caption === null || raw?.caption === undefined ? null : normalizeString(raw?.caption) || null,
    isPrimary: toBoolean(raw?.isPrimary),
    sortOrder: toInt(raw?.sortOrder, 0),
    createdAt: safeDateToIso(raw?.createdAt),
  }
}

// Sorts gallery images for display: primary first, then by sortOrder, then by creation order.
export function sortGalleryImages(images: PropertyImageDTO[] | null | undefined): PropertyImageDTO[] {
  const list = Array.isArray(images) ? [...images] : []
  list.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) {
      return a.isPrimary ? -1 : 1
    }
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder
    }
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
  })
  return list
}

// Returns the cover image URL for a property given its gallery and legacy photoUrl.
export function getCoverImageUrl(images: PropertyImageDTO[] | null | undefined, fallback?: string | null): string | null {
  const sorted = sortGalleryImages(images)
  if (sorted.length > 0) {
    return sorted[0]?.url ?? fallback ?? null
  }
  return fallback ?? null
}
