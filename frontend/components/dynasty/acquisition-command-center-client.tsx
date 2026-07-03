'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, BarChart3, Filter, Loader2, Radar, RefreshCcw, Search, Target } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, getTypeLabel } from '@/lib/property-utils'

type ScorePayload = {
  id: string
  propertyId: string
  dealScore: number
  riskScore: number
  arvConfidence: number
  capitalScore: number
  strategy: string
  decision: string
  scoreBucket: string
  reasons: string[]
  updatedAt: string
  property: {
    address: string
    city: string
    state: string
    zip: string | null
    propertyType: string
    purchasePrice: number
    currentValue: number
    arv: number
    lotSize: number | null
  } | null
}

type SummaryPayload = {
  totalProperties: number
  totalScores: number
  outstanding: number
  buckets: { bucket: string; count: number }[]
  decisions: { decision: string; count: number }[]
  scores: ScorePayload[]
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function countOf(items: { bucket?: string; decision?: string; count: number }[], key: string) {
  return items.find((item) => item.bucket === key || item.decision === key)?.count ?? 0
}

function toneForDecision(decision: string) {
  if (decision === 'GO') return 'bg-emerald-100 text-emerald-800'
  if (decision === 'RENEGOTIATE') return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

export function AcquisitionCommandCenterClient() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [limit, setLimit] = useState('all')
  const [bucket, setBucket] = useState('all')
  const [decision, setDecision] = useState('all')
  const [propertyType, setPropertyType] = useState('all')
  const [city, setCity] = useState('')
  const [error, setError] = useState<string | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: '100' })
    if (bucket !== 'all') params.set('bucket', bucket)
    if (decision !== 'all') params.set('decision', decision)
    if (propertyType !== 'all') params.set('propertyType', propertyType)
    if (city.trim()) params.set('city', city.trim())
    return params.toString()
  }, [bucket, decision, propertyType, city])

  async function loadScores() {
    setLoading(true)
    setError(null)
    const response = await fetch(`/api/portfolio-scores?${queryString}`, { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setSummary(payload as unknown as SummaryPayload)
    } else {
      setError(String(payload.error ?? 'Unable to load portfolio scores.'))
    }
    setLoading(false)
  }

  async function runBatch() {
    setRunning(true)
    setError(null)
    const response = await fetch('/api/portfolio-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success(`Scored ${payload.scored ?? 0} properties.`)
      await loadScores()
    } else {
      const message = String(payload.error ?? 'Portfolio scoring failed.')
      setError(message)
      toast.error(message)
    }
    setRunning(false)
  }

  useEffect(() => {
    void loadScores()
  }, [queryString])

  const buckets = summary?.buckets ?? []
  const decisions = summary?.decisions ?? []
  const scores = summary?.scores ?? []

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
      <div className="mb-6 rounded-lg bg-[var(--dynasty-navy)] p-6 text-[#F8F7F2] shadow-lg">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
          <Radar className="h-3.5 w-3.5" /> Acquisition Command Center
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Rank every property into an acquisition pipeline.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F8F7F2]/76">
              Batch-score inventory, surface the top 100 opportunities, and route every asset into GO, renegotiate, or kill.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-[150px] border-white/12 bg-white/10 text-[#F8F7F2]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">Analyze 100</SelectItem>
                <SelectItem value="500">Analyze 500</SelectItem>
                <SelectItem value="all">Analyze All</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={runBatch} loading={running} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Run Scoring
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Inventory</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{summary?.totalProperties ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Scored</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{summary?.totalScores ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-emerald-50 shadow-sm"><CardContent className="p-4"><p className="text-xs text-emerald-700/70">GO</p><p className="font-display text-2xl font-black text-emerald-800">{countOf(decisions, 'GO')}</p></CardContent></Card>
        <Card className="border-0 bg-amber-50 shadow-sm"><CardContent className="p-4"><p className="text-xs text-amber-700/70">Renegotiate</p><p className="font-display text-2xl font-black text-amber-800">{countOf(decisions, 'RENEGOTIATE')}</p></CardContent></Card>
        <Card className="border-0 bg-red-50 shadow-sm"><CardContent className="p-4"><p className="text-xs text-red-700/70">Kill</p><p className="font-display text-2xl font-black text-red-800">{countOf(decisions, 'KILL')}</p></CardContent></Card>
      </div>

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_190px_190px_190px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dynasty-tan)]" />
            <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Filter city" className="pl-10" />
          </div>
          <Select value={bucket} onValueChange={setBucket}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buckets</SelectItem>
              <SelectItem value="Elite Deals">Elite Deals</SelectItem>
              <SelectItem value="Strong GO">Strong GO</SelectItem>
              <SelectItem value="GO With Conditions">GO With Conditions</SelectItem>
              <SelectItem value="Renegotiate">Renegotiate</SelectItem>
              <SelectItem value="Kill">Kill</SelectItem>
            </SelectContent>
          </Select>
          <Select value={decision} onValueChange={setDecision}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All decisions</SelectItem>
              <SelectItem value="GO">GO</SelectItem>
              <SelectItem value="RENEGOTIATE">Renegotiate</SelectItem>
              <SelectItem value="KILL">Kill</SelectItem>
            </SelectContent>
          </Select>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="single-family">Single-family</SelectItem>
              <SelectItem value="multi-family">Multi-family</SelectItem>
              <SelectItem value="land">Land</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="condo">Condo</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" onClick={() => { setBucket('all'); setDecision('all'); setPropertyType('all'); setCity('') }}>
            <Filter className="h-4 w-4" /> Reset
          </Button>
        </CardContent>
      </Card>

      {error && <div className="mb-5 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><AlertTriangle className="h-4 w-4" /> {error}</div>}

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        {['Elite Deals', 'Strong GO', 'GO With Conditions', 'Renegotiate', 'Kill'].map((item) => (
          <Card key={item} className="border-0 bg-[#F8F7F2] shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-[var(--dynasty-black)]/55">{item}</p>
              <p className="mt-1 font-display text-xl font-black text-[var(--dynasty-navy)]">{countOf(buckets, item)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <Target className="h-5 w-5 text-[var(--dynasty-gold)]" /> Top Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading ranked pipeline...</div>
          ) : scores.length === 0 ? (
            <div className="rounded-lg bg-white/75 p-8 text-center">
              <BarChart3 className="mx-auto mb-3 h-9 w-9 text-[var(--dynasty-gold)]" />
              <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No scores yet.</p>
              <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Run portfolio scoring to generate the ranked acquisition queue.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scores.map((score) => (
                <div key={score.id} className="grid gap-3 rounded-lg bg-white/75 p-4 shadow-sm lg:grid-cols-[1fr_100px_120px_120px_auto] lg:items-center">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge className={`border-0 ${toneForDecision(score.decision)}`}>{score.decision}</Badge>
                      <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{score.scoreBucket}</Badge>
                      <Badge className="border-0 bg-[var(--dynasty-tan)]/20 text-[var(--dynasty-navy)]">{score.strategy}</Badge>
                    </div>
                    <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{score.property?.address ?? 'Unknown property'}</p>
                    <p className="text-sm text-[var(--dynasty-black)]/60">{score.property?.city}, {score.property?.state} {score.property?.zip ?? ''} · {getTypeLabel(score.property?.propertyType)}</p>
                    <p className="mt-1 text-xs text-[var(--dynasty-black)]/50">{score.reasons.slice(0, 3).join(' · ')}</p>
                  </div>
                  <div><p className="text-xs text-[var(--dynasty-black)]/45">Deal score</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{score.dealScore}</p></div>
                  <div><p className="text-xs text-[var(--dynasty-black)]/45">Risk</p><p className="font-bold text-[var(--dynasty-navy)]">{score.riskScore}</p></div>
                  <div><p className="text-xs text-[var(--dynasty-black)]/45">Value</p><p className="font-bold text-[var(--dynasty-navy)]">{formatCurrency(score.property?.arv || score.property?.currentValue || 0)}</p></div>
                  <Button asChild className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
                    <Link href={`/properties/${score.propertyId}`}>Open</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
