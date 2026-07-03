export function fmt(n: number, t: 'currency' | 'integer' | 'percent' = 'currency'): string {
  if (t === 'integer') return `${Math.round(n)}`
  if (t === 'percent') return `${(n * 100).toFixed(1)}%`
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${Math.round(abs).toLocaleString()}`
}
