// GIS/flood/zoning enrichment (Acquisition Intelligence, slice 1). Composes
// three independent, fail-soft lookups against free public APIs:
//   1. Census Geocoder - lat/lon + census tract/GEOID + county, from address.
//   2. FEMA NFHL - flood zone code, queried by the point from step 1.
//   3. Zoning - per-jurisdiction adapter registry, keyed by matched county.
//      Empty for this slice: exact live feature-service URLs/fields for
//      Saint Louis City, Saint Louis County, and St. Francois County were not
//      confirmed during implementation (the one candidate found,
//      stlgis.stlouis-mo.gov/arcgis/rest/services/public/PDA_ZONING/MapServer,
//      500'd on every layer query attempt). Wiring a real adapter here means
//      guessing field names for a real underwriting input - properties fall
//      back to "unknown - verify locally" until an adapter is confirmed working.

const CENSUS_GEOCODER_URL = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress'
const FEMA_NFHL_FLOOD_ZONE_LAYER_URL = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query'
const LOOKUP_TIMEOUT_MS = 5000

export type GisEnrichmentInput = {
  address: string
  city: string
  state: string
  zip?: string | null
}

export type GisEnrichmentResult = {
  latitude: number | null
  longitude: number | null
  censusTract: string | null
  censusGeoid: string | null
  floodZone: string | null
  floodZoneSource: string | null
  zoningDistrict: string | null
  zoningSource: string | null
}

type ZoningAdapter = (input: GisEnrichmentInput) => Promise<{ zoningDistrict: string; zoningSource: string } | null>

// Keyed by normalized county name (lowercase, no "county"/"city" suffix).
// Intentionally empty for this slice - see file header.
const ZONING_ADAPTERS: Record<string, ZoningAdapter> = {}

const EMPTY_RESULT: GisEnrichmentResult = {
  latitude: null,
  longitude: null,
  censusTract: null,
  censusGeoid: null,
  floodZone: null,
  floodZoneSource: null,
  zoningDistrict: null,
  zoningSource: null,
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number = LOOKUP_TIMEOUT_MS): Promise<unknown | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null
    return await response.json()
  } catch (error: unknown) {
    console.error(`GIS enrichment: fetch failed for ${url}`, error)
    return null
  } finally {
    clearTimeout(timer)
  }
}

type CensusLookupResult = {
  latitude: number | null
  longitude: number | null
  censusTract: string | null
  censusGeoid: string | null
  county: string | null
}

async function lookupCensusGeography(input: GisEnrichmentInput): Promise<CensusLookupResult | null> {
  const oneLineAddress = [input.address, input.city, input.state, input.zip].filter(Boolean).join(', ')
  const params = new URLSearchParams({
    address: oneLineAddress,
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    format: 'json',
  })

  const data = await fetchJsonWithTimeout(`${CENSUS_GEOCODER_URL}?${params.toString()}`)
  const match = (data as { result?: { addressMatches?: unknown[] } })?.result?.addressMatches?.[0] as
    | {
        coordinates?: { x?: number; y?: number }
        geographies?: Record<string, Array<{ GEOID?: string; TRACT?: string; NAME?: string; BASENAME?: string }>>
      }
    | undefined
  if (!match) return null

  const tracts = match.geographies?.['Census Tracts']?.[0]
  const counties = match.geographies?.['Counties']?.[0]

  return {
    latitude: typeof match.coordinates?.y === 'number' ? match.coordinates.y : null,
    longitude: typeof match.coordinates?.x === 'number' ? match.coordinates.x : null,
    censusTract: tracts?.TRACT ?? null,
    censusGeoid: tracts?.GEOID ?? null,
    county: counties?.BASENAME ?? counties?.NAME ?? null,
  }
}

async function lookupFloodZone(latitude: number, longitude: number): Promise<{ floodZone: string; floodZoneSource: string } | null> {
  const params = new URLSearchParams({
    geometry: `${longitude},${latitude}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'FLD_ZONE,ZONE_SUBTY',
    returnGeometry: 'false',
    f: 'json',
  })

  const data = await fetchJsonWithTimeout(`${FEMA_NFHL_FLOOD_ZONE_LAYER_URL}?${params.toString()}`)
  const feature = (data as { features?: Array<{ attributes?: { FLD_ZONE?: string } }> })?.features?.[0]
  const floodZone = feature?.attributes?.FLD_ZONE
  if (!floodZone) return null

  return { floodZone, floodZoneSource: 'FEMA NFHL' }
}

function normalizeJurisdictionKey(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/\b(county|city|parish)\b/g, '')
    .replace(/[^a-z]/g, '')
    .trim()
}

async function lookupZoning(input: GisEnrichmentInput, county: string | null): Promise<{ zoningDistrict: string; zoningSource: string } | null> {
  const candidateKeys = [normalizeJurisdictionKey(county), normalizeJurisdictionKey(input.city)]
  for (const key of candidateKeys) {
    const adapter = ZONING_ADAPTERS[key]
    if (adapter) {
      const result = await adapter(input)
      if (result) return result
    }
  }
  return null
}

export async function enrichPropertyGis(input: GisEnrichmentInput): Promise<GisEnrichmentResult> {
  if (!input?.address || !input?.city || !input?.state) {
    return EMPTY_RESULT
  }

  const census = await lookupCensusGeography(input)

  const [flood, zoning] = await Promise.all([
    census?.latitude && census?.longitude ? lookupFloodZone(census.latitude, census.longitude) : Promise.resolve(null),
    lookupZoning(input, census?.county ?? null),
  ])

  return {
    latitude: census?.latitude ?? null,
    longitude: census?.longitude ?? null,
    censusTract: census?.censusTract ?? null,
    censusGeoid: census?.censusGeoid ?? null,
    floodZone: flood?.floodZone ?? null,
    floodZoneSource: flood?.floodZoneSource ?? null,
    zoningDistrict: zoning?.zoningDistrict ?? null,
    zoningSource: zoning?.zoningSource ?? 'unknown - verify locally',
  }
}
