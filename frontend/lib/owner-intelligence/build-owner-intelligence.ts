import { toNumber } from '@/lib/property-utils'
import type { OwnerIntelligenceInput, OwnerIntelligenceResult, OwnerType } from './types'

function parseNotes(notes: string | null) {
  const fields = new Map<string, string>()
  for (const line of String(notes ?? '').split(/\r?\n/)) {
    const [label, ...rest] = line.split(':')
    if (!label || rest.length === 0) continue
    fields.set(label.trim().toLowerCase(), rest.join(':').trim())
  }
  return fields
}

function yes(value: string | undefined) {
  return ['yes', 'true', '1', 'y'].includes(String(value ?? '').trim().toLowerCase())
}

function money(value: string | undefined) {
  if (!value) return null
  const parsed = Number(value.replace(/[$,\s]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function yearsSince(value: string | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const years = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return Number.isFinite(years) && years >= 0 ? Math.round(years * 10) / 10 : null
}

export function ownerType(ownerName: string | null): OwnerType {
  const value = String(ownerName ?? '').toUpperCase()
  if (!value) return 'UNKNOWN'
  if (/\b(LLC|L\.L\.C\.|INC|CORP|COMPANY|CO\.|LP|LTD)\b/.test(value)) return 'LLC'
  if (/\b(TRUST|TRUSTEE|REVOCABLE)\b/.test(value)) return 'TRUST'
  if (/\b(CITY OF|COUNTY|STATE OF|LAND BANK|AUTHORITY)\b/.test(value)) return 'GOVERNMENT'
  if (/\b(BANK|ASSOCIATION|FUND|HOLDINGS|PROPERTIES|INVESTMENTS)\b/.test(value)) return 'CORPORATE'
  return 'INDIVIDUAL'
}

function extractPhones(notes: string | null) {
  const matches = String(notes ?? '').match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) ?? []
  return Array.from(new Set(matches.map((item) => item.replace(/[^\d]/g, '')).filter((item) => item.length === 10)))
}

function extractEmails(notes: string | null) {
  const matches = String(notes ?? '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []
  return Array.from(new Set(matches.map((item) => item.toLowerCase())))
}

function samePropertyMailing(input: OwnerIntelligenceInput, mailingAddress: string | null) {
  if (!mailingAddress) return true
  const normalizedMailing = mailingAddress.toLowerCase()
  return normalizedMailing.includes(input.address.toLowerCase()) &&
    normalizedMailing.includes(input.city.toLowerCase())
}

export function buildOwnerIntelligence(input: OwnerIntelligenceInput): OwnerIntelligenceResult {
  const fields = parseNotes(input.notes)
  const ownerName = fields.get('owner') || null
  const mailingAddress = fields.get('mailing address') || null
  const equityFromNotes = money(fields.get('equity'))
  const calculatedEquity = Math.max(0, toNumber(input.currentValue) - toNumber(input.purchasePrice))
  const equityEstimate = equityFromNotes ?? (calculatedEquity > 0 ? calculatedEquity : null)
  const absenteeOwner = yes(fields.get('absentee owner')) || !samePropertyMailing(input, mailingAddress)
  const vacancyIndicator = yes(fields.get('vacant'))
  const yearsOwned = yearsSince(fields.get('last sale date'))
  const phones = extractPhones(input.notes)
  const emails = extractEmails(input.notes)
  const type = ownerType(ownerName)

  let contactConfidence = 0
  if (ownerName) contactConfidence += 25
  if (mailingAddress) contactConfidence += 25
  if (phones.length > 0) contactConfidence += 25
  if (emails.length > 0) contactConfidence += 15
  if (absenteeOwner || vacancyIndicator) contactConfidence += 10
  contactConfidence = Math.min(100, contactConfidence)

  return {
    propertyId: input.propertyId,
    userId: input.userId,
    ownerName,
    mailingAddress,
    ownerType: type,
    absenteeOwner,
    yearsOwned,
    equityEstimate,
    vacancyIndicator,
    contactConfidence,
    phones,
    emails,
    evidence: {
      source: fields.get('propwire source') || 'Property notes',
      county: fields.get('county') || null,
      apn: fields.get('apn') || null,
      lastSaleDate: fields.get('last sale date') || null,
      lastSaleAmount: money(fields.get('last sale amount')),
      mortgageBalance: money(fields.get('mortgage balance')),
      hasOwnerName: Boolean(ownerName),
      hasMailingAddress: Boolean(mailingAddress),
    },
  }
}
