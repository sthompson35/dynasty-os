'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Target, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Brain, DollarSign, ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FadeIn } from '@/components/ui/animate'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { fmt } from '@/lib/format'
import {
  type DealRecord, type IntelligenceResult, type InvestorMatch,
  runDealAnalysis, fetchInvestorMatches, approveDeal,
} from '@/lib/api'
import { AIDealAssistantCard } from '@/components/deals/ai-deal-assistant-card'

// Uppercase outcome keys, sibling to the lowercase DECISION_CONFIG used by the
// Prisma-backed deal list — kept separate so that file needs no changes.
const OUTCOME_CONFIG: Record<string, { label: string; color: string; hero: string; icon: typeof CheckCircle2 }> = {
  GO:                 { label: 'GO',                 color: 'bg-emerald-100 text-emerald-800', hero: 'bg-emerald-600', icon: CheckCircle2 },
  GO_WITH_CONDITIONS: { label: 'GO w/ Conditions',   color: 'bg-amber-100 text-amber-800',     hero: 'bg-amber-600',   icon: AlertTriangle },
  RENEGOTIATE:        { label: 'Renegotiate',        color: 'bg-blue-100 text-blue-800',       hero: 'bg-blue-600',    icon: TrendingUp },
  HOLD:               { label: 'Hold',               color: 'bg-purple-100 text-purple-800',   hero: 'bg-purple-600',  icon: AlertTriangle },
  KILL:               { label: 'KILL',               color: 'bg-red-100 text-red-800',         hero: 'bg-red-600',     icon: XCircle },
  PENDING:            { label: 'Pending',            color: 'bg-gray-100 text-gray-600',       hero: 'bg-gray-500',    icon: AlertTriangle },
}

const RISK_CATEGORY_LABELS: Record<string, string> = {
  market_risk: 'Market', property_risk: 'Property', contractor_risk: 'Contractor',
  legal_risk: 'Legal', title_risk: 'Title', capital_risk: 'Capital',
  execution_risk: 'Execution', tenant_risk: 'Tenant', economic_risk: 'Economic',
}

function StatTile({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-lg bg-white/60 px-3 py-2">
      <p className="text-xs text-[var(--dynasty-black)]/50">{label}</p>
      <p className={`font-bold ${good === true ? 'text-emerald-700' : good === false ? 'text-red-700' : 'text-[var(--dynasty-navy)]'}`}>{value}</p>
    </div>
  )
}

// Exit ranking: renders Charlie's numbers directly (analysis.exit / analysis.strategy),
// not a recompute from raw inputs — deliberately not DispositionMatrix, whose
// contract is "raw inputs in, compute here."
function ExitRankingTable({ exit, strategy }: { exit: Record<string, unknown>; strategy?: Record<string, unknown> }) {
  const ranked = (strategy?.ranked_strategies as Array<{ strategy: string; profit: number; timeline_months: number; risk: string; capital_required: number }> | undefined) ?? []
  if (ranked.length === 0) return null
  const recommended = exit?.recommended_exit as string | undefined

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardHeader>
        <CardTitle className="font-display text-base text-[var(--dynasty-navy)]">Exit Strategy Ranking</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--dynasty-black)]/10">
              <th className="pb-2 pr-3 text-left text-xs font-semibold text-[var(--dynasty-black)]/55">Strategy</th>
              <th className="pb-2 pr-3 text-right text-xs font-semibold text-[var(--dynasty-black)]/55">Profit</th>
              <th className="pb-2 pr-3 text-left text-xs font-semibold text-[var(--dynasty-black)]/55">Timeline</th>
              <th className="pb-2 pr-3 text-left text-xs font-semibold text-[var(--dynasty-black)]/55">Risk</th>
              <th className="pb-2 text-right text-xs font-semibold text-[var(--dynasty-black)]/55">Capital Req.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--dynasty-black)]/5">
            {ranked.map(row => (
              <tr key={row.strategy} className={row.strategy === recommended ? 'bg-emerald-50' : ''}>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--dynasty-navy)]">{row.strategy}</span>
                    {row.strategy === recommended && <Badge className="border-0 bg-emerald-100 text-[9px] text-emerald-800">Best Fit</Badge>}
                  </div>
                </td>
                <td className={`py-2 pr-3 text-right font-bold ${row.profit > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(row.profit)}</td>
                <td className="py-2 pr-3 text-xs text-[var(--dynasty-black)]/65">{row.timeline_months} mo</td>
                <td className="py-2 pr-3">
                  <Badge className={`border-0 text-[9px] ${row.risk === 'LOW' ? 'bg-emerald-100 text-emerald-700' : row.risk === 'MODERATE' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{row.risk}</Badge>
                </td>
                <td className="py-2 text-right text-xs text-[var(--dynasty-black)]/65">{fmt(row.capital_required)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function RiskChart({ risk }: { risk: Record<string, unknown> }) {
  const categoryScores = (risk?.category_scores as Record<string, number> | undefined) ?? {}
  const data = Object.entries(RISK_CATEGORY_LABELS).map(([key, label]) => ({
    label, score: categoryScores[key] ?? 0,
  }))
  const level = (risk?.risk_level as string | undefined) ?? 'LOW'
  const levelColor = level === 'LOW' ? 'text-emerald-700' : level === 'MODERATE' ? 'text-amber-700' : 'text-red-700'

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-base text-[var(--dynasty-navy)]">Risk Score</CardTitle>
        <div className="text-right">
          <p className={`font-display text-2xl font-black ${levelColor}`}>{String(risk?.total_score ?? 0)}</p>
          <p className={`text-xs font-semibold ${levelColor}`}>{level}</p>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={80} />
            <Tooltip />
            <Bar dataKey="score" fill="var(--dynasty-navy)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function DealIntelligencePanel({
  dealId, approvedBy, initialDeal, initialIntelligence, dealFetchError,
}: {
  dealId: string
  approvedBy: string
  initialDeal: DealRecord | null
  initialIntelligence: IntelligenceResult | null
  dealFetchError: string | null
}) {
  const [intelligence, setIntelligence] = useState<IntelligenceResult | null>(initialIntelligence)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const [investors, setInvestors] = useState<InvestorMatch[] | null>(null)
  const [selectedInvestor, setSelectedInvestor] = useState('')
  const [loadingInvestors, setLoadingInvestors] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [syncErrors, setSyncErrors] = useState<string[]>([])
  const [approved, setApproved] = useState(false)

  async function handleRunAnalysis() {
    setAnalyzing(true)
    setAnalyzeError(null)
    const result = await runDealAnalysis(dealId)
    if (result.ok) {
      setIntelligence(result.data)
    } else {
      setAnalyzeError(result.error)
    }
    setAnalyzing(false)
  }

  async function handleOpenApprove() {
    setLoadingInvestors(true)
    const result = await fetchInvestorMatches(dealId)
    if (result.ok) {
      const pool = result.data.matched_investors.length > 0 ? result.data.matched_investors : result.data.all_investors
      setInvestors(pool)
    } else {
      setApproveError(result.error)
      setInvestors([])
    }
    setLoadingInvestors(false)
  }

  async function handleApprove(decision: string) {
    if ((decision === 'GO' || decision === 'GO_WITH_CONDITIONS') && !selectedInvestor) {
      setApproveError('Select an investor before approving this deal.')
      return
    }
    setApproving(true)
    setApproveError(null)
    const result = await approveDeal({
      deal_id: dealId,
      decision,
      approved_by: approvedBy,
      investor_id: selectedInvestor || undefined,
    })
    if (result.ok) {
      setSyncErrors(result.data.sync_errors)
      setApproved(true)
    } else {
      setApproveError(result.error)
    }
    setApproving(false)
  }

  if (dealFetchError) {
    return (
      <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
        <Card className="border-0 bg-red-50 shadow-sm">
          <CardContent className="py-10 text-center">
            <XCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
            <p className="font-semibold text-red-700">Could not load this deal: {dealFetchError}</p>
            <Link href="/engines/deals" className="mt-3 inline-block text-sm text-[var(--dynasty-navy)] underline">Back to Deal Engine</Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const outcome = intelligence?.outcome ?? initialDeal?.status ?? 'PENDING'
  const outcomeCfg = OUTCOME_CONFIG[outcome] ?? OUTCOME_CONFIG.PENDING
  const OutcomeIcon = outcomeCfg.icon
  const analysis = intelligence?.analysis
  const acq = analysis?.acquisition ?? {}

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
      <AIDealAssistantCard dealId={dealId} />

      <FadeIn>
        {/* 1 + 3. Live Deal Score / Verdict hero */}
        <div className={`mb-6 rounded-xl p-7 text-white shadow-xl ${outcomeCfg.hero}`}>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
            <Brain className="h-3.5 w-3.5" /> Charlie — Deal Commander
          </div>
          <div className="mt-3 flex items-center gap-3">
            <OutcomeIcon className="h-8 w-8" />
            <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">{outcomeCfg.label}</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
            {intelligence?.outcome_label ?? 'No analysis run yet — click "Run Analysis" to have Charlie evaluate this deal.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 border-t border-white/20 pt-5">
            <Button onClick={handleRunAnalysis} disabled={analyzing} className="bg-white text-[var(--dynasty-navy)] hover:bg-white/90">
              {analyzing ? 'Running Charlie…' : intelligence ? 'Re-run Analysis' : 'Run Analysis'}
            </Button>
            {analyzeError && <p className="self-center text-sm text-red-100">{analyzeError}</p>}
          </div>
        </div>
      </FadeIn>

      {!intelligence ? (
        <Card className="border-0 bg-[#F8F7F2] shadow-sm">
          <CardContent className="py-16 text-center">
            <Target className="mx-auto mb-4 h-10 w-10 text-[var(--dynasty-gold)]" />
            <p className="font-display text-xl font-bold text-[var(--dynasty-navy)]">Charlie hasn&apos;t analyzed this deal yet.</p>
            <p className="mt-2 text-sm text-[var(--dynasty-black)]/55">Run analysis to get a MAO check, risk score, exit ranking, and verdict.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* 2. MAO calculator */}
            <Card className="border-0 bg-[#F8F7F2] shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2 font-display text-base text-[var(--dynasty-navy)]"><DollarSign className="h-4 w-4 text-[var(--dynasty-gold)]" /> MAO Check</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <StatTile label="Maximum Allowable Offer" value={fmt(Number(acq.mao ?? 0))} />
                <StatTile label="Asking Price" value={fmt(Number(acq.asking_price ?? 0))} />
                <StatTile label="Meets MAO?" value={acq.meets_mao ? 'Yes' : 'No'} good={Boolean(acq.meets_mao)} />
              </CardContent>
            </Card>

            {/* 6. Profit/ROI/spread */}
            <Card className="border-0 bg-[#F8F7F2] shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2 font-display text-base text-[var(--dynasty-navy)]"><TrendingUp className="h-4 w-4 text-[var(--dynasty-gold)]" /> Profit / ROI</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <StatTile label="Base Profit" value={fmt(Number(analysis?.stress_test?.base_profit ?? 0))} />
                <StatTile label="Cash Needed" value={fmt(Number(analysis?.financing?.cash_needed ?? 0))} />
                <StatTile
                  label="Worst-Case ROI"
                  value={fmt(Number(analysis?.stress_test?.worst_case_roi ?? 0), 'percent')}
                  good={Boolean(analysis?.stress_test?.passes_stress_test)}
                />
              </CardContent>
            </Card>

            {/* 3. Verdict + Approve */}
            <Card className="border-0 bg-[#F8F7F2] shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2 font-display text-base text-[var(--dynasty-navy)]"><ShieldAlert className="h-4 w-4 text-[var(--dynasty-gold)]" /> Verdict</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Badge className={`border-0 ${outcomeCfg.color}`}>{outcomeCfg.label}</Badge>
                {!approved ? (
                  <>
                    {investors === null ? (
                      <Button size="sm" variant="outline" onClick={handleOpenApprove} disabled={loadingInvestors}>
                        {loadingInvestors ? 'Loading investors…' : 'Approve Deal'}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={selectedInvestor}
                          onChange={e => setSelectedInvestor(e.target.value)}
                        >
                          <option value="">Select investor…</option>
                          {investors.map(inv => (
                            <option key={inv.investor_id} value={inv.investor_id}>
                              {inv.investor_name ?? inv.investor_id} {inv.available_capital != null ? `(${fmt(Number(inv.available_capital))} available)` : ''}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(outcome)} disabled={approving || !selectedInvestor} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
                            {approving ? 'Approving…' : `Confirm ${outcomeCfg.label}`}
                          </Button>
                        </div>
                      </div>
                    )}
                    {approveError && <p className="text-xs text-red-600">{approveError}</p>}
                  </>
                ) : (
                  <p className="text-sm font-semibold text-emerald-700">Approved — synced below.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 4. Exit strategy ranking */}
          {analysis && <ExitRankingTable exit={analysis.exit} strategy={analysis.strategy} />}

          {/* 5. Risk score */}
          {analysis && <RiskChart risk={analysis.risk} />}

          {/* 7. Why Charlie says this */}
          <Card className="border-0 bg-[#F8F7F2] shadow-md">
            <CardHeader><CardTitle className="font-display text-base text-[var(--dynasty-navy)]">Why Charlie Says This</CardTitle></CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--dynasty-black)]/80">
                {intelligence.reasoning.map((line, i) => <li key={i}>{line}</li>)}
              </ol>
            </CardContent>
          </Card>

          {/* 8. Sync status */}
          {approved && (
            <Card className="border-0 bg-[#F8F7F2] shadow-md">
              <CardHeader><CardTitle className="font-display text-base text-[var(--dynasty-navy)]">Sync Status</CardTitle></CardHeader>
              <CardContent>
                {syncErrors.length > 0 && (
                  <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    Deal approved, but some syncs failed — retry from the relevant engine page:
                    <ul className="mt-1 list-disc pl-5">{syncErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                  <Link href="/engines/capital" className="rounded-lg bg-white/60 p-3 text-center hover:bg-white">
                    <p className="text-xs text-[var(--dynasty-black)]/50">Capital</p>
                    <p className="font-bold text-[var(--dynasty-navy)]">View Commitments →</p>
                  </Link>
                  <Link href="/engines/operations" className="rounded-lg bg-white/60 p-3 text-center hover:bg-white">
                    <p className="text-xs text-[var(--dynasty-black)]/50">Operations + Rehab</p>
                    <p className="font-bold text-[var(--dynasty-navy)]">View Project →</p>
                  </Link>
                  <Link href="/engines/disposition" className="rounded-lg bg-white/60 p-3 text-center hover:bg-white">
                    <p className="text-xs text-[var(--dynasty-black)]/50">Disposition</p>
                    <p className="font-bold text-[var(--dynasty-navy)]">View Marketing →</p>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
