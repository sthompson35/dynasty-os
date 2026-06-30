'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSignature,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import type { IntakeCandidate, IntakeSummary } from '@/lib/intake-analysis'

type DecisionFilter = 'all' | IntakeCandidate['decision']
type ScoreTone = 'good' | 'warn' | 'bad' | 'neutral'

const decisionLabels: Record<IntakeCandidate['decision'], string> = {
  go: 'GO',
  go_conditions: 'GO w/ Conditions',
  renegotiate: 'Renegotiate',
  hold: 'Hold',
  kill: 'Kill',
  pending: 'Pending',
}

const flowStages = ['Lead Engine', 'Intake Engine', 'Underwriting Engine', 'Strategy Engine', 'Deal Engine']
const ultimateFlow = ['Lead', 'Intake', 'ATLAS', 'Deal', 'Rehab', 'Capital', 'Investor', 'Disposition', 'Operations', 'Portfolio']

const dispositionLabels: Record<keyof IntakeCandidate['dispositionScores'], string> = {
  wholesale: 'Wholesale',
  fix_flip: 'Fix & Flip',
  brrrr: 'BRRRR',
  rental: 'Rental',
  owner_finance: 'Owner Finance',
  development: 'Development',
}

function fmt(n: number, mode: 'currency' | 'percent' | 'integer' = 'currency'): string {
  if (mode === 'percent') return `${(n * 100).toFixed(1)}%`
  if (mode === 'integer') return Math.round(n).toLocaleString()
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${Math.round(abs).toLocaleString()}`
}

function decisionClass(decision: IntakeCandidate['decision']): string {
  switch (decision) {
    case 'go':
      return 'bg-emerald-100 text-emerald-800'
    case 'go_conditions':
      return 'bg-lime-100 text-lime-800'
    case 'renegotiate':
      return 'bg-blue-100 text-blue-800'
    case 'hold':
      return 'bg-amber-100 text-amber-800'
    case 'kill':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function atlasClass(action: IntakeCandidate['atlasRecommendation']['action']): string {
  if (action === 'BUY') return 'bg-emerald-100 text-emerald-800'
  if (action === 'PASS') return 'bg-red-100 text-red-800'
  return 'bg-amber-100 text-amber-800'
}

function scoreTone(score: number): ScoreTone {
  if (score >= 72) return 'good'
  if (score >= 50) return 'warn'
  if (score > 0) return 'bad'
  return 'neutral'
}

function toneText(tone: ScoreTone): string {
  if (tone === 'good') return 'text-emerald-700'
  if (tone === 'warn') return 'text-amber-700'
  if (tone === 'bad') return 'text-red-700'
  return 'text-[var(--dynasty-black)]/60'
}

function strategyLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function csvCell(value: string | number | null | undefined): string {
  const normalized = String(value ?? '')
  return `"${normalized.replace(/"/g, '""')}"`
}

function MetricTile(props: { label: string; value: string; helper?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const toneClass = props.tone === 'good' ? 'text-emerald-300' : props.tone === 'bad' ? 'text-red-300' : props.tone === 'warn' ? 'text-[var(--dynasty-gold)]' : 'text-[#F8F7F2]'
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <p className={`font-display text-2xl font-black ${toneClass}`}>{props.value}</p>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F8F7F2]/55">{props.label}</p>
      {props.helper && <p className="mt-1 text-xs text-[#F8F7F2]/55">{props.helper}</p>}
    </div>
  )
}

function ScorePill(props: { label: string; value: number; detail?: string }) {
  const tone = scoreTone(props.value)
  return (
    <div className="rounded-lg bg-white/75 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dynasty-black)]/45">{props.label}</p>
        <p className={`text-sm font-black ${toneText(tone)}`}>{Math.round(props.value)}</p>
      </div>
      <Progress value={props.value} className="mt-2 h-1.5 bg-[var(--dynasty-navy)]/10 [&>div]:bg-[var(--dynasty-gold)]" />
      {props.detail && <p className="mt-1 text-xs text-[var(--dynasty-black)]/50">{props.detail}</p>}
    </div>
  )
}

function PipelineStep(props: { label: string; value: number; total: number }) {
  const percent = props.total > 0 ? Math.max(4, Math.round((props.value / props.total) * 100)) : 0
  return (
    <div className="min-w-[130px] flex-1 rounded-lg bg-[#F8F7F2] p-3">
      <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">{fmt(props.value, 'integer')}</p>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dynasty-black)]/45">{props.label}</p>
      <div className="mt-2 h-1.5 rounded-full bg-[var(--dynasty-navy)]/10">
        <div className="h-full rounded-full bg-[var(--dynasty-gold)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export function IntakeAnalysisClient(props: { initialSummary: IntakeSummary; initialCandidates: IntakeCandidate[] }) {
  const [summary, setSummary] = useState(props.initialSummary)
  const [candidates, setCandidates] = useState(props.initialCandidates)
  const [filter, setFilter] = useState<DecisionFilter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [bulkSyncing, setBulkSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const visible = useMemo(() => {
    return candidates.filter((candidate) => filter === 'all' || candidate.decision === filter).slice(0, 120)
  }, [candidates, filter])

  const selectedCandidates = useMemo(() => {
    return candidates.filter((candidate) => selected.has(candidate.propertyId))
  }, [candidates, selected])

  const topVisibleIds = visible.slice(0, 50).map((candidate) => candidate.propertyId)

  function toggleSelected(propertyId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(propertyId)
      else next.delete(propertyId)
      return next
    })
  }

  function selectTop50() {
    setSelected(new Set(topVisibleIds))
    toast.success(`Selected ${topVisibleIds.length} intake deals.`)
  }

  function queueAction(label: string) {
    if (selectedCandidates.length === 0) {
      toast.error('Select deals first.')
      return
    }
    toast.success(`${label} queued for ${selectedCandidates.length} deals.`)
  }

  function exportOffers() {
    const rows = selectedCandidates.length > 0 ? selectedCandidates : visible.slice(0, 50)
    if (rows.length === 0) {
      toast.error('No deals available to export.')
      return
    }

    const header = [
      'Address',
      'City',
      'State',
      'ATLAS Recommendation',
      'Confidence',
      'Dynasty Fit',
      'Recommended Exit',
      'ARV',
      'Suggested Offer',
      'Projected Profit',
      'Projected ROI',
      'Rehab Level',
      'Risk',
      'Capital Need',
    ]
    const lines = rows.map((candidate) => [
      candidate.address,
      candidate.city,
      candidate.state,
      candidate.atlasRecommendation.action,
      `${candidate.atlasRecommendation.confidence}%`,
      candidate.dynastyFitScore,
      candidate.atlasRecommendation.recommendedExit,
      candidate.estimatedArv,
      candidate.suggestedOffer,
      candidate.projectedProfit,
      `${(candidate.projectedRoi * 100).toFixed(1)}%`,
      candidate.rehabLevel,
      candidate.atlasRecommendation.risk,
      candidate.atlasRecommendation.capitalNeed,
    ].map(csvCell).join(','))

    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dynasty-atlas-offers.csv'
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} offer rows.`)
  }

  async function refreshAnalysis(showToast = true) {
    setRefreshing(true)
    try {
      const response = await fetch('/api/intake-analysis')
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to refresh intake analysis.')
      setSummary(payload.summary)
      setCandidates(payload.candidates)
      if (showToast) toast.success('Intake analysis refreshed.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to refresh intake analysis.')
    } finally {
      setRefreshing(false)
    }
  }

  async function syncDeal(candidate: IntakeCandidate) {
    setSyncingId(candidate.propertyId)
    try {
      const response = await fetch('/api/intake-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: candidate.propertyId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to sync deal.')
      const nextCandidate = payload.candidate as IntakeCandidate
      setCandidates((prev) => prev.map((item) => item.propertyId === candidate.propertyId ? nextCandidate : item))
      await refreshAnalysis(false)
      toast.success(candidate.existingDeal ? 'Deal Engine record updated.' : 'Synced to Deal Engine.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sync deal.')
    } finally {
      setSyncingId(null)
    }
  }

  async function syncSelectedDeals() {
    if (selectedCandidates.length === 0) {
      toast.error('Select deals first.')
      return
    }

    setBulkSyncing(true)
    try {
      let synced = 0
      for (const candidate of selectedCandidates.slice(0, 50)) {
        const response = await fetch('/api/intake-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId: candidate.propertyId }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || `Unable to sync ${candidate.address}.`)
        synced += 1
      }
      await refreshAnalysis(false)
      toast.success(`Synced ${synced} deals to the Deal Engine.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sync selected deals.')
    } finally {
      setBulkSyncing(false)
    }
  }

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1360px] py-8">
      <FadeIn>
        <div className="mb-6 rounded-xl bg-[var(--dynasty-navy)] p-7 text-[#F8F7F2] shadow-xl">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
            <ClipboardCheck className="h-3.5 w-3.5" /> Dynasty OS - Intake Analyst
          </div>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Acquisitions command center</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#F8F7F2]/70">
                ATLAS pulls live property data, scores Dynasty fit, compares exits, and moves qualified opportunities into the Deal Engine at portfolio scale.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => refreshAnalysis()} loading={refreshing} className="bg-white/10 text-[#F8F7F2] hover:bg-white/18">
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
              <Button asChild className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
                <Link href="/engines/deals">Deal Engine <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricTile label="Leads scanned" value={fmt(summary.totalProperties, 'integer')} helper={`${fmt(summary.analyzedProperties, 'integer')} analyzable`} />
            <MetricTile label="Qualified" value={fmt(summary.pipeline.qualified, 'integer')} tone="good" helper="Dynasty Fit 55+" />
            <MetricTile label="ATLAS buy" value={fmt(summary.pipeline.offersSent, 'integer')} tone="good" helper="Offer-ready candidates" />
            <MetricTile label="Avg intake" value={`${summary.averageScore}/100`} tone="warn" helper={`${fmt(summary.syncedDeals, 'integer')} synced deals`} />
            <MetricTile label="Potential profit" value={fmt(summary.totalPotentialProfit)} tone="good" helper="Positive candidates only" />
          </div>
        </div>
      </FadeIn>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-0 bg-[#F8F7F2] shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              {flowStages.map((stage, index) => (
                <div key={stage} className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${index === 1 ? 'bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)]' : 'bg-white text-[var(--dynasty-black)]/60'}`}>
                    {stage}
                  </span>
                  {index < flowStages.length - 1 && <ArrowRight className="h-4 w-4 text-[var(--dynasty-black)]/35" />}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-[var(--dynasty-black)]/60">
              Intake is now separated into lead qualification, underwriting, strategy selection, and Deal Engine sync so this screen can become the acquisitions director view.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-[#F8F7F2] shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--dynasty-gold)]" />
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--dynasty-navy)]">Predictive acquisition model</p>
            </div>
            <p className="text-sm leading-6 text-[var(--dynasty-black)]/62">
              Dynasty Fit prioritizes Shylow-style buys: ARV over $180K, profit over $25K, ROI over 25%, Missouri markets, and medium rehab opportunities.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-0 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--dynasty-gold)]" />
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--dynasty-navy)]">Pipeline visualization</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PipelineStep label="Leads" value={summary.pipeline.leads} total={summary.pipeline.leads} />
            <PipelineStep label="Qualified" value={summary.pipeline.qualified} total={summary.pipeline.leads} />
            <PipelineStep label="Offers Sent" value={summary.pipeline.offersSent} total={summary.pipeline.leads} />
            <PipelineStep label="Negotiating" value={summary.pipeline.negotiating} total={summary.pipeline.leads} />
            <PipelineStep label="Contracted" value={summary.pipeline.contracted} total={summary.pipeline.leads} />
            <PipelineStep label="Closed" value={summary.pipeline.closed} total={summary.pipeline.leads} />
            <PipelineStep label="Rejected" value={summary.pipeline.rejected} total={summary.pipeline.leads} />
          </div>
        </CardContent>
      </Card>

      <Card className="sticky top-3 z-20 mb-6 border-0 bg-[var(--dynasty-navy)] text-[#F8F7F2] shadow-lg">
        <CardContent className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--dynasty-gold)]">Mass actions</p>
            <p className="text-sm text-[#F8F7F2]/65">{selectedCandidates.length} selected from {visible.length} visible intake deals.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={selectTop50} className="bg-white/10 text-[#F8F7F2] hover:bg-white/18">
              <CheckCircle2 className="h-4 w-4" /> Select 50 Deals
            </Button>
            <Button type="button" size="sm" loading={bulkSyncing} onClick={syncSelectedDeals} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
              <Target className="h-4 w-4" /> Sync to Deal Engine
            </Button>
            <Button type="button" size="sm" onClick={exportOffers} className="bg-white/10 text-[#F8F7F2] hover:bg-white/18">
              <Download className="h-4 w-4" /> Export Offers
            </Button>
            <Button type="button" size="sm" onClick={() => queueAction('Buyer assignment')} className="bg-white/10 text-[#F8F7F2] hover:bg-white/18">
              <Users className="h-4 w-4" /> Assign Buyer
            </Button>
            <Button type="button" size="sm" onClick={() => queueAction('Disposition handoff')} className="bg-white/10 text-[#F8F7F2] hover:bg-white/18">
              <Send className="h-4 w-4" /> Send to Disposition
            </Button>
            <Button type="button" size="sm" onClick={() => queueAction('LOI generation')} className="bg-white/10 text-[#F8F7F2] hover:bg-white/18">
              <FileSignature className="h-4 w-4" /> Generate LOIs
            </Button>
            <Button type="button" size="sm" onClick={() => queueAction('Seller mailers')} className="bg-white/10 text-[#F8F7F2] hover:bg-white/18">
              <Mail className="h-4 w-4" /> Seller Mailers
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {(['all', 'go', 'go_conditions', 'renegotiate', 'hold', 'kill', 'pending'] as DecisionFilter[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${filter === item ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2]' : 'bg-[#F8F7F2] text-[var(--dynasty-black)]/65 hover:bg-white'}`}
          >
            {item === 'all' ? 'All candidates' : decisionLabels[item]}
          </button>
        ))}
      </div>

      <Stagger className="grid gap-4">
        {visible.map((candidate) => (
          <StaggerItem key={candidate.propertyId}>
            <Card className="border-0 bg-[#F8F7F2] shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Checkbox
                        aria-label={`Select ${candidate.address}`}
                        checked={selected.has(candidate.propertyId)}
                        onCheckedChange={(value) => toggleSelected(candidate.propertyId, value === true)}
                        className="border-[var(--dynasty-navy)]/35 data-[state=checked]:bg-[var(--dynasty-navy)]"
                      />
                      <Badge className={`border-0 ${decisionClass(candidate.decision)}`}>{decisionLabels[candidate.decision]}</Badge>
                      <Badge className="border-0 bg-[var(--dynasty-navy)]/8 text-[var(--dynasty-navy)]">Fit {candidate.dynastyFitScore}/100</Badge>
                      <Badge className="border-0 bg-white text-[var(--dynasty-black)]/65">Risk {candidate.riskScore}/100</Badge>
                      {candidate.existingDeal && <Badge className="border-0 bg-emerald-100 text-emerald-800">Synced</Badge>}
                    </div>
                    <h2 className="mt-3 font-display text-xl font-black text-[var(--dynasty-navy)]">
                      {candidate.address}, {candidate.city}, {candidate.state}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--dynasty-black)]/58">
                      {candidate.propertyType} - {candidate.propertyStatus} - Recommended: {strategyLabel(candidate.recommendedStrategy)}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                      <div className="rounded-lg bg-white/70 p-3"><p className="text-xs text-[var(--dynasty-black)]/45">ARV</p><p className="font-bold text-[var(--dynasty-navy)]">{fmt(candidate.estimatedArv)}</p></div>
                      <div className="rounded-lg bg-white/70 p-3"><p className="text-xs text-[var(--dynasty-black)]/45">Offer</p><p className="font-bold text-[var(--dynasty-navy)]">{fmt(candidate.suggestedOffer)}</p></div>
                      <div className="rounded-lg bg-white/70 p-3"><p className="text-xs text-[var(--dynasty-black)]/45">Profit</p><p className={`font-bold ${candidate.projectedProfit > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(candidate.projectedProfit)}</p></div>
                      <div className="rounded-lg bg-white/70 p-3"><p className="text-xs text-[var(--dynasty-black)]/45">ROI</p><p className={`font-bold ${candidate.projectedRoi >= 0.18 ? 'text-emerald-700' : 'text-amber-700'}`}>{fmt(candidate.projectedRoi, 'percent')}</p></div>
                    </div>

                    <ul className="mt-3 grid gap-1 text-xs leading-5 text-[var(--dynasty-black)]/62 sm:grid-cols-2">
                      {candidate.reasons.map((reason) => (
                        <li key={reason} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--dynasty-gold)]" /> {reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--dynasty-black)]/45">ATLAS Recommendation</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge className={`border-0 ${atlasClass(candidate.atlasRecommendation.action)}`}>{candidate.atlasRecommendation.action}</Badge>
                          <p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{candidate.atlasRecommendation.confidence}%</p>
                        </div>
                      </div>
                      <Zap className="h-7 w-7 text-[var(--dynasty-gold)]" />
                    </div>
                    <div className="grid gap-2 text-sm">
                      {candidate.atlasRecommendation.reason.map((reason) => (
                        <div key={reason} className="flex items-center gap-2 rounded-md bg-[#F8F7F2] px-3 py-2 text-[var(--dynasty-black)]/68">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--dynasty-gold)]" /> {reason}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md bg-[#F8F7F2] p-2"><p className="text-[var(--dynasty-black)]/45">Exit</p><p className="font-bold text-[var(--dynasty-navy)]">{candidate.atlasRecommendation.recommendedExit}</p></div>
                      <div className="rounded-md bg-[#F8F7F2] p-2"><p className="text-[var(--dynasty-black)]/45">Risk</p><p className="font-bold text-[var(--dynasty-navy)]">{candidate.atlasRecommendation.risk}</p></div>
                      <div className="rounded-md bg-[#F8F7F2] p-2"><p className="text-[var(--dynasty-black)]/45">Capital</p><p className="font-bold text-[var(--dynasty-navy)]">{candidate.atlasRecommendation.capitalNeed}</p></div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <ScorePill label="Seller Motivation" value={candidate.sellerMotivationScore} detail="Vacant, inherited, tax, code, foreclosure, absentee" />
                      <ScorePill label="Deal Velocity" value={candidate.dealVelocityScore} detail="DOM, competition, liquidity, absorption" />
                      <ScorePill label="Capital" value={candidate.capitalScore} detail="Cash required, lender fit, funding difficulty" />
                      <ScorePill label="Rehab" value={candidate.rehabScore} detail={candidate.rehabLevel.toUpperCase()} />
                    </div>

                    <div className="rounded-lg bg-white/75 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dynasty-black)]/45">Disposition Score</p>
                        <p className="text-sm font-black text-[var(--dynasty-navy)]">{candidate.dispositionScore}</p>
                      </div>
                      <div className="grid gap-1.5">
                        {(Object.entries(candidate.dispositionScores) as [keyof IntakeCandidate['dispositionScores'], number][]).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-[96px_1fr_32px] items-center gap-2 text-xs">
                            <span className="truncate text-[var(--dynasty-black)]/55">{dispositionLabels[key]}</span>
                            <div className="h-1.5 rounded-full bg-[var(--dynasty-navy)]/10">
                              <div className="h-full rounded-full bg-[var(--dynasty-gold)]" style={{ width: `${value}%` }} />
                            </div>
                            <span className="text-right font-bold text-[var(--dynasty-navy)]">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" className="border-[var(--dynasty-navy)]/18 text-[var(--dynasty-navy)]">
                        <Link href={`/properties/${encodeURIComponent(candidate.propertyId)}`}>Open property</Link>
                      </Button>
                      <Button
                        type="button"
                        loading={syncingId === candidate.propertyId}
                        onClick={() => syncDeal(candidate)}
                        className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]"
                      >
                        <Target className="h-4 w-4" /> {candidate.existingDeal ? 'Update deal' : 'Sync deal'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      {visible.length === 0 && (
        <Card className="border-0 bg-[#F8F7F2] shadow-sm">
          <CardContent className="py-16 text-center">
            <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-[var(--dynasty-gold)]" />
            <p className="font-display text-xl font-bold text-[var(--dynasty-navy)]">No candidates match this intake filter.</p>
            <p className="mt-2 text-sm text-[var(--dynasty-black)]/55">Try another decision filter or refresh the analysis after importing more properties.</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 rounded-lg bg-[var(--dynasty-navy)]/8 p-4 text-sm leading-6 text-[var(--dynasty-black)]/65">
        <div className="flex items-start gap-3">
          <BriefcaseBusiness className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dynasty-gold)]" />
          <p>
            Ultimate flow: {ultimateFlow.join(' -> ')}. Intake assumptions are estimated from existing property values, year built, size, status, notes, and deal math. Sync writes a real Deal Engine record for downstream Capital, Operations, and Disposition workflows.
          </p>
        </div>
      </div>
    </div>
  )
}
