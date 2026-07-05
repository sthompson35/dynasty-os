import { PropertyMutationData, normalizeString } from './property-utils'

// Maps common column-header / extracted-field spellings to the exact
// PropertyMutationData keys buildPropertyMutationData() expects.
const FIELD_ALIASES: Record<keyof PropertyMutationData, string[]> = {
  address: ['address', 'street address', 'street', 'property address'],
  city: ['city'],
  state: ['state', 'st'],
  zip: ['zip', 'zipcode', 'zip code', 'postal code'],
  propertyType: ['property type', 'propertytype', 'type'],
  bedrooms: ['bedrooms', 'beds', 'bed', 'bd'],
  bathrooms: ['bathrooms', 'baths', 'bath', 'ba'],
  sqft: ['sqft', 'square feet', 'sq ft', 'square footage'],
  lotSize: ['lot size', 'lotsize', 'lot sqft', 'lot acres'],
  yearBuilt: ['year built', 'yearbuilt', 'year'],
  purchasePrice: ['purchase price', 'purchaseprice', 'price', 'list price'],
  currentValue: ['current value', 'currentvalue', 'value', 'estimated value'],
  status: ['status'],
  photoUrl: ['photo url', 'photourl', 'photo', 'image url'],
  notes: ['notes', 'note', 'comments'],
  virtualTourUrl: ['virtual tour url', 'virtual tour', 'tour url'],
  arv: ['arv', 'after repair value'],
  repairCosts: ['repair costs', 'repaircosts', 'rehab cost', 'rehab costs'],
  holdingCosts: ['holding costs', 'holdingcosts'],
  closingCosts: ['closing costs', 'closingcosts'],
}

// Takes a raw row (CSV columns as parsed, or an LLM's extracted field/value
// pairs) with arbitrary header spellings and remaps it to the canonical
// PropertyMutationData keys so buildPropertyMutationData() can normalize it.
export function mapRowToPropertyFields(row: Record<string, unknown>): Record<string, unknown> {
  const normalizedRow: Record<string, unknown> = {}
  for (const [rawKey, value] of Object.entries(row ?? {})) {
    normalizedRow[rawKey.trim().toLowerCase()] = value
  }

  const mapped: Record<string, unknown> = {}
  for (const field of Object.keys(FIELD_ALIASES) as (keyof PropertyMutationData)[]) {
    for (const alias of FIELD_ALIASES[field]) {
      const value = normalizedRow[alias]
      if (value !== undefined && value !== null && value !== '') {
        mapped[field] = value
        break
      }
    }
  }
  return mapped
}

// Key used to detect an existing property with the same address/city/state
// (case-insensitive), so imports can skip duplicates rather than create
// near-identical records.
export function propertyDuplicateKey(input: { address?: string | null; city?: string | null; state?: string | null }): string {
  return [input?.address, input?.city, input?.state]
    .map((part) => normalizeString(part).toLowerCase())
    .join('|')
}
