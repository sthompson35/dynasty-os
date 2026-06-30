import { normalizeString } from '@/lib/property-utils'

export type SelectOption = {
  value: string
  label: string
}

export const CONTACT_ROLE_OPTIONS: SelectOption[] = [
  { value: 'seller', label: 'Seller' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'agent', label: 'Agent' },
  { value: 'lender', label: 'Lender' },
  { value: 'investor', label: 'Investor' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'title-company', label: 'Title Company' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'appraiser', label: 'Appraiser' },
  { value: 'insurance-agent', label: 'Insurance Agent' },
  { value: 'property-manager', label: 'Property Manager' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'architect-engineer', label: 'Architect / Engineer' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' },
]

export const RELATIONSHIP_TYPE_OPTIONS: SelectOption[] = [
  { value: 'decision-maker', label: 'Decision-maker' },
  { value: 'service-provider', label: 'Service provider' },
  { value: 'capital-source', label: 'Capital source' },
  { value: 'buyer-side', label: 'Buyer-side' },
  { value: 'seller-side', label: 'Seller-side' },
  { value: 'internal-team', label: 'Internal team' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'other', label: 'Other' },
]

export const DEAL_TEAM_STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'call-today', label: 'Call today' },
  { value: 'blocked', label: 'Blocking progress' },
  { value: 'documents-due', label: 'Documents due' },
  { value: 'payment-due', label: 'Payment due' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'inactive', label: 'Inactive' },
]

export type LinkedPropertySummary = {
  id: string
  propertyId: string
  roleOnDeal: string | null
  relationshipType: string | null
  dealResponsibility: string | null
  status: string
  nextActionDate: string | null
  lastContacted: string | null
  documentsNeeded: string | null
  paymentOwed: number | null
  receivesUpdates: boolean
  communicationHistory: string | null
  address: string
  city: string
  state: string
}

export type ContactDTO = {
  id: string
  name: string
  role: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  linkedCount: number
  links: LinkedPropertySummary[]
  createdAt: string
  updatedAt: string
}

export type ContactMutationData = {
  name: string
  role: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
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

function nullableIso(value: unknown): string | null {
  const iso = safeDateToIso(value)
  return iso || null
}

export function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const decimalValue = value as { toNumber?: () => number }
    const parsed = decimalValue.toNumber?.()
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null
  }
  const parsed = Number(String(value).replace(/[$,]/g, '').trim())
  return Number.isFinite(parsed) ? parsed : null
}

export function getContactRole(value: unknown): string {
  const normalized = normalizeString(value)
  const exists = CONTACT_ROLE_OPTIONS?.some?.((item: SelectOption) => item?.value === normalized) ?? false
  return exists ? normalized : 'other'
}

export function getContactRoleLabel(value: unknown): string {
  const normalized = normalizeString(value)
  const option = CONTACT_ROLE_OPTIONS?.find?.((item: SelectOption) => item?.value === normalized)
  return option?.label ?? 'Other'
}

export function getRelationshipType(value: unknown): string {
  const normalized = normalizeString(value)
  const exists = RELATIONSHIP_TYPE_OPTIONS?.some?.((item: SelectOption) => item?.value === normalized) ?? false
  return exists ? normalized : 'other'
}

export function getRelationshipTypeLabel(value: unknown): string {
  const normalized = getRelationshipType(value)
  const option = RELATIONSHIP_TYPE_OPTIONS?.find?.((item: SelectOption) => item?.value === normalized)
  return option?.label ?? 'Other'
}

export function getDealTeamStatus(value: unknown): string {
  const normalized = normalizeString(value)
  const exists = DEAL_TEAM_STATUS_OPTIONS?.some?.((item: SelectOption) => item?.value === normalized) ?? false
  return exists ? normalized : 'active'
}

export function getDealTeamStatusLabel(value: unknown): string {
  const normalized = getDealTeamStatus(value)
  const option = DEAL_TEAM_STATUS_OPTIONS?.find?.((item: SelectOption) => item?.value === normalized)
  return option?.label ?? 'Active'
}

export function buildContactMutationData(input: unknown): ContactMutationData {
  const safeInput = (input ?? {}) as Record<string, unknown>
  return {
    name: normalizeString(safeInput?.name),
    role: getContactRole(safeInput?.role),
    email: normalizeString(safeInput?.email) || null,
    phone: normalizeString(safeInput?.phone) || null,
    company: normalizeString(safeInput?.company) || null,
    notes: normalizeString(safeInput?.notes) || null,
  }
}

function serializeLink(link: unknown): LinkedPropertySummary {
  const raw = (link ?? {}) as Record<string, unknown>
  const property = (raw?.property ?? {}) as Record<string, unknown>
  return {
    id: String(raw?.id ?? ''),
    propertyId: String(raw?.propertyId ?? property?.id ?? ''),
    roleOnDeal: normalizeString(raw?.roleOnDeal) || null,
    relationshipType: normalizeString(raw?.relationshipType) || null,
    dealResponsibility: normalizeString(raw?.dealResponsibility) || null,
    status: getDealTeamStatus(raw?.status),
    nextActionDate: nullableIso(raw?.nextActionDate),
    lastContacted: nullableIso(raw?.lastContacted),
    documentsNeeded: normalizeString(raw?.documentsNeeded) || null,
    paymentOwed: safeNumber(raw?.paymentOwed),
    receivesUpdates: Boolean(raw?.receivesUpdates),
    communicationHistory: normalizeString(raw?.communicationHistory) || null,
    address: normalizeString(property?.address),
    city: normalizeString(property?.city),
    state: normalizeString(property?.state),
  }
}

export function serializePropertyContactLink(link: unknown): Omit<LinkedPropertySummary, 'address' | 'city' | 'state'> {
  const serialized = serializeLink(link)
  return {
    id: serialized.id,
    propertyId: serialized.propertyId,
    roleOnDeal: serialized.roleOnDeal,
    relationshipType: serialized.relationshipType,
    dealResponsibility: serialized.dealResponsibility,
    status: serialized.status,
    nextActionDate: serialized.nextActionDate,
    lastContacted: serialized.lastContacted,
    documentsNeeded: serialized.documentsNeeded,
    paymentOwed: serialized.paymentOwed,
    receivesUpdates: serialized.receivesUpdates,
    communicationHistory: serialized.communicationHistory,
  }
}

export function serializeContact(contact: unknown): ContactDTO {
  const raw = (contact ?? {}) as Record<string, unknown>
  const links = Array.isArray(raw?.links) ? raw.links : []
  const serializedLinks = links?.map?.((link: unknown) => serializeLink(link)) ?? []
  return {
    id: String(raw?.id ?? ''),
    name: normalizeString(raw?.name) || 'Unnamed contact',
    role: getContactRole(raw?.role),
    email: normalizeString(raw?.email) || null,
    phone: normalizeString(raw?.phone) || null,
    company: normalizeString(raw?.company) || null,
    notes: normalizeString(raw?.notes) || null,
    linkedCount: serializedLinks.length,
    links: serializedLinks,
    createdAt: safeDateToIso(raw?.createdAt),
    updatedAt: safeDateToIso(raw?.updatedAt),
  }
}
