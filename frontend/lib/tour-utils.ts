// Virtual tour link detection + safe embed URL builder.
// Supports common real-estate 3D/360 walkthrough providers so the viewer
// works with genuine scans (Matterport, Zillow 3D Home, Kuula, iGuide,
// CloudPano, YouTube 360 / regular video). Falls back to a sanitized
// generic embed for any other https source.

export type TourProvider =
  | 'matterport'
  | 'zillow'
  | 'kuula'
  | 'iguide'
  | 'cloudpano'
  | 'youtube'
  | 'generic'

export type TourEmbed = {
  provider: TourProvider
  providerLabel: string
  embedUrl: string
  originalUrl: string
  // Some providers (e.g. Zillow) frequently block iframe embedding.
  // When true, the UI should surface an "open in new tab" fallback prominently.
  mayBlockEmbedding: boolean
}

const PROVIDER_LABELS: Record<TourProvider, string> = {
  matterport: 'Matterport',
  zillow: 'Zillow 3D Home',
  kuula: 'Kuula',
  iguide: 'iGuide',
  cloudpano: 'CloudPano',
  youtube: 'YouTube',
  generic: 'Virtual tour',
}

export function getProviderLabel(provider: TourProvider): string {
  return PROVIDER_LABELS[provider] ?? PROVIDER_LABELS.generic
}

function safeParseUrl(input: string): URL | null {
  const trimmed = (input ?? '').trim()
  if (!trimmed) return null
  // Allow users to paste without a scheme.
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    // Only ever embed secure content.
    if (url.protocol !== 'https:') return null
    return url
  } catch {
    return null
  }
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`)
}

function extractYouTubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase()
  if (hostMatches(host, 'youtu.be')) {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id || null
  }
  if (hostMatches(host, 'youtube.com') || hostMatches(host, 'youtube-nocookie.com')) {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v')
    }
    const parts = url.pathname.split('/').filter(Boolean)
    // /embed/ID , /v/ID , /shorts/ID
    if (parts.length >= 2 && ['embed', 'v', 'shorts'].includes(parts[0])) {
      return parts[1]
    }
  }
  return null
}

/**
 * Validates a pasted tour URL and returns a sanitized embed descriptor.
 * Returns null when the input cannot be turned into a safe https embed.
 */
export function buildTourEmbed(input: string): TourEmbed | null {
  const url = safeParseUrl(input)
  if (!url) return null

  const host = url.hostname.toLowerCase()
  const originalUrl = url.toString()

  // --- Matterport ---
  if (hostMatches(host, 'matterport.com')) {
    const modelId = url.searchParams.get('m')
    if (modelId) {
      const params = new URLSearchParams({ m: modelId, play: '1', qs: '1' })
      return {
        provider: 'matterport',
        providerLabel: PROVIDER_LABELS.matterport,
        embedUrl: `https://my.matterport.com/show/?${params.toString()}`,
        originalUrl,
        mayBlockEmbedding: false,
      }
    }
    return {
      provider: 'matterport',
      providerLabel: PROVIDER_LABELS.matterport,
      embedUrl: originalUrl,
      originalUrl,
      mayBlockEmbedding: false,
    }
  }

  // --- YouTube (incl. 360 videos) ---
  const ytId = extractYouTubeId(url)
  if (ytId) {
    const params = new URLSearchParams({ rel: '0', modestbranding: '1' })
    return {
      provider: 'youtube',
      providerLabel: PROVIDER_LABELS.youtube,
      embedUrl: `https://www.youtube.com/embed/${ytId}?${params.toString()}`,
      originalUrl,
      mayBlockEmbedding: false,
    }
  }

  // --- Kuula ---
  if (hostMatches(host, 'kuula.co')) {
    const sep = url.search ? '&' : '?'
    return {
      provider: 'kuula',
      providerLabel: PROVIDER_LABELS.kuula,
      embedUrl: `${originalUrl}${sep}fs=1&vr=1&autop=1&autopalt=1`,
      originalUrl,
      mayBlockEmbedding: false,
    }
  }

  // --- iGuide ---
  if (hostMatches(host, 'youriguide.com') || hostMatches(host, 'iguide.io')) {
    return {
      provider: 'iguide',
      providerLabel: PROVIDER_LABELS.iguide,
      embedUrl: originalUrl,
      originalUrl,
      mayBlockEmbedding: false,
    }
  }

  // --- CloudPano ---
  if (hostMatches(host, 'cloudpano.com')) {
    return {
      provider: 'cloudpano',
      providerLabel: PROVIDER_LABELS.cloudpano,
      embedUrl: originalUrl,
      originalUrl,
      mayBlockEmbedding: false,
    }
  }

  // --- Zillow 3D Home (frequently blocks framing) ---
  if (hostMatches(host, 'zillow.com')) {
    return {
      provider: 'zillow',
      providerLabel: PROVIDER_LABELS.zillow,
      embedUrl: originalUrl,
      originalUrl,
      mayBlockEmbedding: true,
    }
  }

  // --- Generic https fallback ---
  return {
    provider: 'generic',
    providerLabel: PROVIDER_LABELS.generic,
    embedUrl: originalUrl,
    originalUrl,
    mayBlockEmbedding: true,
  }
}

export function isValidTourUrl(input: string): boolean {
  return buildTourEmbed(input) !== null
}
