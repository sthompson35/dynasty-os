'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, BarChart3, ClipboardList, Download, FileText, Filter, HandCoins, Home, Loader2, Mail, MessageSquare, Phone, Radar, RefreshCcw, Search, Send, SkipForward, Target, UserRound } from 'lucide-react'
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

type QueueItemPayload = {
  id: string
  propertyId: string
  actionType: string
  priority: number
  status: string
  nextActionDate: string | null
  reason: string
  property: {
    address: string
    city: string
    state: string
    zip: string | null
    propertyType: string
  } | null
  dealScore: {
    dealScore: number
    strategy: string
    scoreBucket: string
  } | null
}

type QueuePayload = {
  totalItems: number
  actions: { actionType: string; count: number }[]
  statuses: { status: string; count: number }[]
  items: QueueItemPayload[]
}

type CampaignPayload = {
  totalBatches: number
  totalItems: number
  types: { campaignType: string; count: number }[]
  batches: {
    id: string
    name: string
    campaignType: string
    status: string
    totalItems: number
    itemCount: number
    createdAt: string
  }[]
  items: {
    id: string
    campaignType: string
    status: string
    priority: number
    artifact: {
      headline?: string
      workType?: string
      instructions?: string[]
    }
    property: {
      address: string
      city: string
      state: string
      zip: string | null
    } | null
  }[]
}

type OwnerIntelligencePayload = {
  totalArtifacts: number
  absenteeOwners: number
  vacantOwners: number
  withPhones: number
  withEmails: number
  highConfidence: number
  ownerTypes: { ownerType: string; count: number }[]
  items: {
    id: string
    propertyId: string
    ownerName: string | null
    mailingAddress: string | null
    ownerType: string
    absenteeOwner: boolean
    vacancyIndicator: boolean
    contactConfidence: number
    phones: string[]
    emails: string[]
    property: {
      address: string
      city: string
      state: string
      zip: string | null
    } | null
  }[]
}

type SkipTracePayload = {
  totalItems: number
  highPriority: number
  channels: { recommendedChannel: string; count: number }[]
  statuses: { status: string; count: number }[]
  items: {
    id: string
    propertyId: string
    propertyAddress: string
    mailingAddress: string | null
    absenteeOwner: boolean
    vacancySignal: boolean
    equitySignal: number
    priority: number
    recommendedChannel: string
    status: string
  }[]
}

type OwnershipResearchPayload = {
  totalTasks: number
  highPriority: number
  statuses: { researchStatus: string; count: number }[]
  counties: { county: string; count: number }[]
  sources: { recommendedSource: string; count: number }[]
  tasks: {
    id: string
    propertyId: string
    propertyAddress: string
    mailingAddress: string | null
    county: string | null
    sourcePriority: number
    researchStatus: string
    researchReason: string
    recommendedSource: string
  }[]
}

const actionSections = [
  { type: 'CALL_NOW', label: 'Call Now', icon: Phone, tone: 'bg-emerald-50 text-emerald-800' },
  { type: 'MAIL_NOW', label: 'Mail Now', icon: Mail, tone: 'bg-sky-50 text-sky-800' },
  { type: 'TEXT_NOW', label: 'Text Now', icon: MessageSquare, tone: 'bg-indigo-50 text-indigo-800' },
  { type: 'RESEARCH', label: 'Research', icon: ClipboardList, tone: 'bg-amber-50 text-amber-800' },
  { type: 'LOW_OFFER', label: 'Low Offer', icon: HandCoins, tone: 'bg-orange-50 text-orange-800' },
  { type: 'SKIP', label: 'Skip', icon: SkipForward, tone: 'bg-red-50 text-red-800' },
]

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

function countAction(items: { actionType: string; count: number }[], key: string) {
  return items.find((item) => item.actionType === key)?.count ?? 0
}

function countCampaign(items: { campaignType: string; count: number }[], key: string) {
  return items.find((item) => item.campaignType === key)?.count ?? 0
}

function countSkipTrace(items: { recommendedChannel: string; count: number }[], key: string) {
  return items.find((item) => item.recommendedChannel === key)?.count ?? 0
}

function toneForDecision(decision: string) {
  if (decision === 'GO') return 'bg-emerald-100 text-emerald-800'
  if (decision === 'RENEGOTIATE') return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

export function AcquisitionCommandCenterClient() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [queue, setQueue] = useState<QueuePayload | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignPayload | null>(null)
  const [owners, setOwners] = useState<OwnerIntelligencePayload | null>(null)
  const [skipTrace, setSkipTrace] = useState<SkipTracePayload | null>(null)
  const [ownershipResearch, setOwnershipResearch] = useState<OwnershipResearchPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [queueLoading, setQueueLoading] = useState(true)
  const [campaignLoading, setCampaignLoading] = useState(true)
  const [ownerLoading, setOwnerLoading] = useState(true)
  const [skipTraceLoading, setSkipTraceLoading] = useState(true)
  const [ownershipResearchLoading, setOwnershipResearchLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [queueRunning, setQueueRunning] = useState(false)
  const [campaignRunning, setCampaignRunning] = useState(false)
  const [ownerRunning, setOwnerRunning] = useState(false)
  const [skipTraceRunning, setSkipTraceRunning] = useState(false)
  const [ownershipResearchRunning, setOwnershipResearchRunning] = useState(false)
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

  async function loadQueue() {
    setQueueLoading(true)
    const response = await fetch('/api/lead-action-queue?limit=180', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setQueue(payload as unknown as QueuePayload)
    } else if (!error) {
      setError(String(payload.error ?? 'Unable to load lead action queue.'))
    }
    setQueueLoading(false)
  }

  async function loadCampaigns() {
    setCampaignLoading(true)
    const response = await fetch('/api/campaign-batches?limit=10', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setCampaigns(payload as unknown as CampaignPayload)
    } else if (!error) {
      setError(String(payload.error ?? 'Unable to load campaign batches.'))
    }
    setCampaignLoading(false)
  }

  async function loadOwners() {
    setOwnerLoading(true)
    const response = await fetch('/api/owner-intelligence?limit=8', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setOwners(payload as unknown as OwnerIntelligencePayload)
    } else if (!error) {
      setError(String(payload.error ?? 'Unable to load owner intelligence.'))
    }
    setOwnerLoading(false)
  }

  async function loadSkipTrace() {
    setSkipTraceLoading(true)
    const response = await fetch('/api/skip-trace-export-queue?limit=8', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setSkipTrace(payload as unknown as SkipTracePayload)
    } else if (!error) {
      setError(String(payload.error ?? 'Unable to load skip trace export queue.'))
    }
    setSkipTraceLoading(false)
  }

  async function loadOwnershipResearch() {
    setOwnershipResearchLoading(true)
    const response = await fetch('/api/ownership-research-tasks?limit=8', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setOwnershipResearch(payload as unknown as OwnershipResearchPayload)
    } else if (!error) {
      setError(String(payload.error ?? 'Unable to load ownership research tasks.'))
    }
    setOwnershipResearchLoading(false)
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
      await loadQueue()
    } else {
      const message = String(payload.error ?? 'Portfolio scoring failed.')
      setError(message)
      toast.error(message)
    }
    setRunning(false)
  }

  async function runQueue() {
    setQueueRunning(true)
    setError(null)
    const response = await fetch('/api/lead-action-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 'all' }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success(`Generated ${payload.generated ?? 0} lead actions.`)
      await loadQueue()
    } else {
      const message = String(payload.error ?? 'Lead action queue generation failed.')
      setError(message)
      toast.error(message)
    }
    setQueueRunning(false)
  }

  async function runCampaigns() {
    setCampaignRunning(true)
    setError(null)
    const response = await fetch('/api/campaign-batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignType: 'ALL', limit: 500 }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success(`Generated ${payload.generated ?? 0} campaign items.`)
      await loadCampaigns()
    } else {
      const message = String(payload.error ?? 'Campaign generation failed.')
      setError(message)
      toast.error(message)
    }
    setCampaignRunning(false)
  }

  async function runOwners() {
    setOwnerRunning(true)
    setError(null)
    const response = await fetch('/api/owner-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 'all' }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success(`Generated ${payload.generated ?? 0} owner intelligence artifacts.`)
      await loadOwners()
      await loadSkipTrace()
      await loadCampaigns()
    } else {
      const message = String(payload.error ?? 'Owner intelligence generation failed.')
      setError(message)
      toast.error(message)
    }
    setOwnerRunning(false)
  }

  async function runSkipTrace() {
    setSkipTraceRunning(true)
    setError(null)
    const response = await fetch('/api/skip-trace-export-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 'all' }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success(`Generated ${payload.generated ?? 0} skip trace export rows.`)
      await loadSkipTrace()
      await loadOwnershipResearch()
    } else {
      const message = String(payload.error ?? 'Skip trace prep failed.')
      setError(message)
      toast.error(message)
    }
    setSkipTraceRunning(false)
  }

  async function runOwnershipResearch() {
    setOwnershipResearchRunning(true)
    setError(null)
    const response = await fetch('/api/ownership-research-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 'all' }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success(`Generated ${payload.generated ?? 0} ownership research tasks.`)
      await loadOwnershipResearch()
    } else {
      const message = String(payload.error ?? 'Ownership research task generation failed.')
      setError(message)
      toast.error(message)
    }
    setOwnershipResearchRunning(false)
  }

  useEffect(() => {
    void loadScores()
    void loadQueue()
    void loadCampaigns()
    void loadOwners()
    void loadSkipTrace()
    void loadOwnershipResearch()
  }, [queryString])

  const buckets = summary?.buckets ?? []
  const decisions = summary?.decisions ?? []
  const scores = summary?.scores ?? []
  const actionCounts = queue?.actions ?? []
  const queueItems = queue?.items ?? []
  const campaignCounts = campaigns?.types ?? []
  const campaignItems = campaigns?.items ?? []

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
            <Button type="button" onClick={runQueue} loading={queueRunning} className="bg-[#F8F7F2] text-[var(--dynasty-navy)] hover:bg-white">
              {queueRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              Build Queue
            </Button>
            <Button type="button" onClick={runCampaigns} loading={campaignRunning} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {campaignRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Build Campaigns
            </Button>
            <Button type="button" onClick={runOwners} loading={ownerRunning} className="bg-white/10 text-[#F8F7F2] hover:bg-white/20">
              {ownerRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
              Owner Intel
            </Button>
            <Button type="button" onClick={runSkipTrace} loading={skipTraceRunning} className="bg-white/10 text-[#F8F7F2] hover:bg-white/20">
              {skipTraceRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Skip Trace
            </Button>
            <Button type="button" onClick={runOwnershipResearch} loading={ownershipResearchRunning} className="bg-white/10 text-[#F8F7F2] hover:bg-white/20">
              {ownershipResearchRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Research
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4 lg:grid-cols-8">
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Inventory</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{summary?.totalProperties ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Scored</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{summary?.totalScores ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Action Queue</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{queue?.totalItems ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Campaign Items</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{campaigns?.totalItems ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Owner Intel</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{owners?.totalArtifacts ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Skip Trace</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{skipTrace?.totalItems ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Research Tasks</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{ownershipResearch?.totalTasks ?? 0}</p></CardContent></Card>
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

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <UserRound className="h-5 w-5 text-[var(--dynasty-gold)]" /> Owner Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ownerLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading owner profiles...</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="grid gap-2">
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">Absentee Owners</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{owners?.absenteeOwners ?? 0}</p></div>
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">Vacancy Signals</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{owners?.vacantOwners ?? 0}</p></div>
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">Phone Coverage</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{owners?.withPhones ?? 0}</p></div>
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">High Confidence</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{owners?.highConfidence ?? 0}</p></div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(owners?.items ?? []).length === 0 ? (
                  <div className="rounded-lg bg-white/75 p-6 text-center md:col-span-2">
                    <Home className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
                    <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No owner profiles yet.</p>
                    <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Generate owner intelligence to connect scored properties to reachable owners.</p>
                  </div>
                ) : owners?.items.map((item) => (
                  <Link key={item.id} href={`/properties/${item.propertyId}`} className="rounded-lg bg-white/75 p-4 shadow-sm transition hover:shadow-md">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{item.ownerType}</Badge>
                      {item.absenteeOwner && <Badge className="border-0 bg-sky-100 text-sky-800">Absentee</Badge>}
                      {item.vacancyIndicator && <Badge className="border-0 bg-amber-100 text-amber-800">Vacant</Badge>}
                    </div>
                    <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{item.ownerName ?? 'Unknown owner'}</p>
                    <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{item.property?.address}</p>
                    <p className="mt-2 text-xs text-[var(--dynasty-black)]/50">Confidence {item.contactConfidence}/100 - Phones {item.phones.length} - Emails {item.emails.length}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <ClipboardList className="h-5 w-5 text-[var(--dynasty-gold)]" /> Lead Action Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queueLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading action lanes...</div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-6 md:grid-cols-3">
              {actionSections.map((section) => {
                const Icon = section.icon
                const items = queueItems.filter((item) => item.actionType === section.type).slice(0, 3)
                return (
                  <div key={section.type} className="rounded-lg bg-white/75 p-3 shadow-sm">
                    <div className={`mb-3 flex items-center justify-between rounded-md px-3 py-2 ${section.tone}`}>
                      <span className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4" /> {section.label}</span>
                      <span className="font-display text-lg font-black">{countAction(actionCounts, section.type)}</span>
                    </div>
                    <div className="space-y-2">
                      {items.length === 0 ? (
                        <p className="px-1 py-3 text-xs text-[var(--dynasty-black)]/50">No active items.</p>
                      ) : items.map((item) => (
                        <Link key={item.id} href={`/properties/${item.propertyId}`} className="block rounded-md border border-[var(--dynasty-tan)]/20 bg-[#F8F7F2] p-2 transition hover:border-[var(--dynasty-gold)]/70">
                          <p className="truncate text-sm font-bold text-[var(--dynasty-navy)]">{item.property?.address ?? 'Unknown property'}</p>
                          <p className="mt-1 text-xs text-[var(--dynasty-black)]/55">{item.property?.city}, {item.property?.state} - Score {item.dealScore?.dealScore ?? 0}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--dynasty-black)]/50">{item.reason}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <Search className="h-5 w-5 text-[var(--dynasty-gold)]" /> Ownership Research
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ownershipResearchLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading ownership research tasks...</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="grid gap-2">
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">High Priority</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{ownershipResearch?.highPriority ?? 0}</p></div>
                {(ownershipResearch?.sources ?? []).slice(0, 5).map((source) => (
                  <div key={source.recommendedSource} className="flex items-center justify-between rounded-lg bg-white/75 px-3 py-2 shadow-sm">
                    <span className="text-xs font-bold text-[var(--dynasty-navy)]">{source.recommendedSource}</span>
                    <span className="font-display text-lg font-black text-[var(--dynasty-navy)]">{source.count}</span>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(ownershipResearch?.tasks ?? []).length === 0 ? (
                  <div className="rounded-lg bg-white/75 p-6 text-center md:col-span-2">
                    <Search className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
                    <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No ownership research tasks yet.</p>
                    <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Generate tasks from ownership-research skip trace rows.</p>
                  </div>
                ) : ownershipResearch?.tasks.map((task) => (
                  <Link key={task.id} href={`/properties/${task.propertyId}`} className="rounded-lg bg-white/75 p-4 shadow-sm transition hover:shadow-md">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{task.recommendedSource}</Badge>
                      <Badge className="border-0 bg-sky-100 text-sky-800">{task.county ?? 'Unknown county'}</Badge>
                      <Badge className="border-0 bg-emerald-100 text-emerald-800">{task.researchStatus}</Badge>
                    </div>
                    <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{task.propertyAddress}</p>
                    <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{task.mailingAddress ?? 'Mailing address missing'}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--dynasty-black)]/50">Priority {task.sourcePriority} - {task.researchReason}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <Download className="h-5 w-5 text-[var(--dynasty-gold)]" /> Skip Trace Prep
          </CardTitle>
        </CardHeader>
        <CardContent>
          {skipTraceLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading export queue...</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="grid gap-2">
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">High Priority</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{skipTrace?.highPriority ?? 0}</p></div>
                {['PHONE_EMAIL_SKIP_TRACE', 'MAILING_ADDRESS_EXPORT', 'MOBILE_APPEND', 'OWNERSHIP_RESEARCH', 'NO_TOUCH'].map((channel) => (
                  <div key={channel} className="flex items-center justify-between rounded-lg bg-white/75 px-3 py-2 shadow-sm">
                    <span className="text-xs font-bold text-[var(--dynasty-navy)]">{channel.replace(/_/g, ' ')}</span>
                    <span className="font-display text-lg font-black text-[var(--dynasty-navy)]">{countSkipTrace(skipTrace?.channels ?? [], channel)}</span>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(skipTrace?.items ?? []).length === 0 ? (
                  <div className="rounded-lg bg-white/75 p-6 text-center md:col-span-2">
                    <Download className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
                    <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No skip trace export rows yet.</p>
                    <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Build the export queue to prioritize owner/contact enrichment.</p>
                  </div>
                ) : skipTrace?.items.map((item) => (
                  <Link key={item.id} href={`/properties/${item.propertyId}`} className="rounded-lg bg-white/75 p-4 shadow-sm transition hover:shadow-md">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{item.recommendedChannel.replace(/_/g, ' ')}</Badge>
                      {item.absenteeOwner && <Badge className="border-0 bg-sky-100 text-sky-800">Absentee</Badge>}
                      {item.vacancySignal && <Badge className="border-0 bg-amber-100 text-amber-800">Vacant</Badge>}
                    </div>
                    <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{item.propertyAddress}</p>
                    <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{item.mailingAddress ?? 'Mailing address missing'}</p>
                    <p className="mt-2 text-xs text-[var(--dynasty-black)]/50">Priority {item.priority} - Equity {formatCurrency(item.equitySignal || 0)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <Send className="h-5 w-5 text-[var(--dynasty-gold)]" /> Campaign Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaignLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading campaign worklists...</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="grid gap-2">
                {actionSections.map((section) => {
                  const Icon = section.icon
                  return (
                    <div key={section.type} className="flex items-center justify-between rounded-lg bg-white/75 px-3 py-2 shadow-sm">
                      <span className="flex items-center gap-2 text-sm font-bold text-[var(--dynasty-navy)]"><Icon className="h-4 w-4 text-[var(--dynasty-gold)]" /> {section.label}</span>
                      <span className="font-display text-lg font-black text-[var(--dynasty-navy)]">{countCampaign(campaignCounts, section.type)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="space-y-3">
                {campaignItems.length === 0 ? (
                  <div className="rounded-lg bg-white/75 p-6 text-center">
                    <FileText className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
                    <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No campaign batches yet.</p>
                    <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Build campaigns to turn queue lanes into call scripts, mail rows, research checklists, and offer worksheets.</p>
                  </div>
                ) : campaignItems.map((item) => (
                  <div key={item.id} className="rounded-lg bg-white/75 p-4 shadow-sm">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className="border-0 bg-emerald-100 text-emerald-800">{item.campaignType.replace(/_/g, ' ')}</Badge>
                      <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{item.status}</Badge>
                      <span className="text-xs text-[var(--dynasty-black)]/50">Priority {item.priority}</span>
                    </div>
                    <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{item.artifact?.headline ?? item.property?.address ?? 'Campaign item'}</p>
                    <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{item.artifact?.workType ?? 'Work item'}</p>
                    <p className="mt-2 text-xs text-[var(--dynasty-black)]/50">{item.artifact?.instructions?.slice(0, 2).join(' ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
