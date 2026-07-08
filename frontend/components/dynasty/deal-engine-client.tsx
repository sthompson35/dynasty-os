'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, PlusCircle, CheckCircle2, XCircle, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { GlossaryHint } from '@/components/dynasty/glossary-hint'
import { fmt } from '@/lib/format'

type Deal = {
  id: string
  address: string; city: string; state: string; zip: string | null
  exitStrategy: string; status: string; decision: string
  purchasePrice: number | null; arv: number | null; repairCosts: number | null
  holdingCosts: number | null; closingCosts: number | null; mao: number | null
  wholesaleFee: number | null; flipProfit: number | null; rentalEquity: number | null
  monthlyCashFlow: number | null; roi: number | null; riskScore: number
  capitalRequired: number | null; capitalAllocated: number | null
  notes: string | null; createdAt: string; updatedAt: string
}

const DECISION_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  go:             { label: 'GO', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  go_conditions:  { label: 'GO w/ Conditions', color: 'bg-amber-100 text-amber-800', icon: AlertTriangle },
  renegotiate:    { label: 'Renegotiate', color: 'bg-blue-100 text-blue-800', icon: TrendingUp },
  hold:           { label: 'Hold', color: 'bg-purple-100 text-purple-800', icon: AlertTriangle },
  kill:           { label: 'KILL', color: 'bg-red-100 text-red-800', icon: XCircle },
  pending:        { label: 'Pending', color: 'bg-gray-100 text-gray-600', icon: AlertTriangle },
}

const EXIT_STRATEGIES = ['wholesale', 'flip', 'brrrr', 'hold', 'development', 'land_flip']
const EXIT_LABELS: Record<string, string> = {
  wholesale: 'Wholesale', flip: 'Fix & Flip', brrrr: 'BRRRR',
  hold: 'Hold / Rental', development: 'Development', land_flip: 'Land Flip',
}

type FormData = {
  address: string; city: string; state: string; zip: string
  exitStrategy: string; purchasePrice: string; arv: string; repairCosts: string
  holdingCosts: string; closingCosts: string; notes: string
}
const EMPTY: FormData = {
  address: '', city: '', state: '', zip: '',
  exitStrategy: 'wholesale', purchasePrice: '', arv: '', repairCosts: '',
  holdingCosts: '', closingCosts: '', notes: '',
}

function calcDeal(form: FormData) {
  const pp = parseFloat(form.purchasePrice) || 0
  const arv = parseFloat(form.arv) || 0
  const repair = parseFloat(form.repairCosts) || 0
  const holding = parseFloat(form.holdingCosts) || 0
  const closing = parseFloat(form.closingCosts) || 0
  const totalCost = pp + repair + holding + closing
  const mao70 = arv * 0.70 - repair
  const flipProfit = arv - totalCost
  const roi = totalCost > 0 ? flipProfit / totalCost : 0
  const wholesaleFee = mao70 - pp
  let riskScore = 0
  if (roi < 0.20) riskScore += 30
  if (roi < 0.10) riskScore += 20
  if (pp > mao70) riskScore += 25
  if (arv === 0) riskScore += 25
  let decision = 'pending'
  if (arv > 0 && pp > 0) {
    if (roi >= 0.25 && pp <= mao70) decision = 'go'
    else if (roi >= 0.20) decision = 'go_conditions'
    else if (roi >= 0.10) decision = 'renegotiate'
    else if (roi > 0) decision = 'hold'
    else decision = 'kill'
  }
  return { mao: Math.round(mao70), flipProfit: Math.round(flipProfit), roi, wholesaleFee: Math.max(0, Math.round(wholesaleFee)), riskScore, decision, capitalRequired: totalCost }
}

// Disposition Matrix component
function DispositionMatrix({ pp, arv, repair }: { pp: number; arv: number; repair: number }) {
  if (!pp || !arv) return null
  const totalCost = pp + repair + (pp * 0.04) + (pp * 0.06)
  const rows = [
    { strategy: 'Wholesale', profit: Math.max(0, arv * 0.7 - repair - pp), timeline: 'Fast (1-4 wks)', risk: 'Low', capital: 'Immediate', highlight: true },
    { strategy: 'Fix & Flip', profit: Math.max(0, arv - totalCost), timeline: 'Medium (3-6 mo)', risk: 'Moderate', capital: 'At Sale', highlight: false },
    { strategy: 'BRRRR', profit: Math.max(0, arv * 0.75 - pp - repair), timeline: 'Slow (6-12 mo)', risk: 'Moderate', capital: 'Refinance', highlight: false },
    { strategy: 'Hold / Rental', profit: Math.round((arv * 0.008 - (pp + repair) * 0.01 / 12) * 12), timeline: 'Long (1+ yr)', risk: 'Low', capital: 'Limited', highlight: false },
    { strategy: 'Development', profit: Math.round(arv * 1.5 - pp - repair * 2), timeline: 'Longest', risk: 'Highest', capital: 'At Completion', highlight: false },
  ]
  const best = rows.reduce((max, r) => r.profit > max.profit ? r : max, rows[0])
  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardHeader>
        <CardTitle className="font-display text-base text-[var(--dynasty-navy)]">Disposition Matrix — Exit Strategy Ranking</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--dynasty-black)]/10">
              <th className="pb-2 pr-3 text-left text-xs font-semibold text-[var(--dynasty-black)]/55">Exit Strategy</th>
              <th className="pb-2 pr-3 text-right text-xs font-semibold text-[var(--dynasty-black)]/55">Est. Profit</th>
              <th className="pb-2 pr-3 text-left text-xs font-semibold text-[var(--dynasty-black)]/55">Timeline</th>
              <th className="pb-2 pr-3 text-left text-xs font-semibold text-[var(--dynasty-black)]/55">Risk</th>
              <th className="pb-2 text-left text-xs font-semibold text-[var(--dynasty-black)]/55">Capital Recovery</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--dynasty-black)]/5">
            {rows.map(row => (
              <tr key={row.strategy} className={row.strategy === best.strategy ? 'bg-emerald-50' : ''}>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--dynasty-navy)]">{row.strategy}</span>
                    {row.strategy === best.strategy && <Badge className="border-0 bg-emerald-100 text-[9px] text-emerald-800">Best Fit</Badge>}
                  </div>
                </td>
                <td className={`py-2 pr-3 text-right font-bold ${row.profit > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(row.profit)}</td>
                <td className="py-2 pr-3 text-xs text-[var(--dynasty-black)]/65">{row.timeline}</td>
                <td className="py-2 pr-3"><Badge className={`border-0 text-[9px] ${row.risk === 'Low' ? 'bg-emerald-100 text-emerald-700' : row.risk === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{row.risk}</Badge></td>
                <td className="py-2 text-xs text-[var(--dynasty-black)]/65">{row.capital}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

export function DealEngineClient({ deals: initialDeals }: { deals: Deal[] }) {
  const router = useRouter()
  const [deals, setDeals] = useState(initialDeals)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filterDecision, setFilterDecision] = useState('all')
  const [liveCalc, setLiveCalc] = useState<ReturnType<typeof calcDeal> | null>(null)

  const calc = liveCalc ?? (form.arv && form.purchasePrice ? calcDeal(form) : null)

  function handleFormChange(updates: Partial<FormData>) {
    const next = { ...form, ...updates }
    setForm(next)
    if (next.purchasePrice && next.arv) setLiveCalc(calcDeal(next))
    else setLiveCalc(null)
  }

  const filtered = deals.filter(d => filterDecision === 'all' || d.decision === filterDecision)
  const pipelineValue = deals.reduce((s, d) => s + (d.arv ?? 0), 0)
  const approvedDeals = deals.filter(d => d.decision === 'go').length
  const killDeals = deals.filter(d => d.decision === 'kill').length

  async function saveDeal() {
    setSaving(true)
    try {
      const computed = calcDeal(form)
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip || null,
          exitStrategy: form.exitStrategy,
          status: 'intake',
          purchasePrice: parseFloat(form.purchasePrice) || null,
          arv: parseFloat(form.arv) || null,
          repairCosts: parseFloat(form.repairCosts) || null,
          holdingCosts: parseFloat(form.holdingCosts) || null,
          closingCosts: parseFloat(form.closingCosts) || null,
          mao: computed.mao,
          wholesaleFee: computed.wholesaleFee,
          flipProfit: computed.flipProfit,
          roi: computed.roi,
          riskScore: computed.riskScore,
          decision: computed.decision,
          capitalRequired: computed.capitalRequired,
          notes: form.notes || null,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setDeals(prev => [created, ...prev])
        setShowForm(false)
        setForm(EMPTY)
        setLiveCalc(null)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
      <FadeIn>
        <div className="mb-8 rounded-xl bg-[var(--dynasty-navy)] p-7 text-[#F8F7F2] shadow-xl">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
            <Target className="h-3.5 w-3.5" /> Dynasty OS · Deal Engine
          </div>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight md:text-4xl">Deal Engine</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#F8F7F2]/70">
            Transform uncertainty into measurable investment decisions. Every deal is scored, stress-tested, and assigned a decision: GO, RENEGOTIATE, or KILL.
          </p>
          <div className="mt-5 flex flex-wrap gap-6 border-t border-white/10 pt-5">
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{deals.length}</p><p className="text-xs text-[#F8F7F2]/60">Total Deals</p></div>
            <div><p className="font-display text-2xl font-black text-emerald-400">{approvedDeals}</p><p className="text-xs text-[#F8F7F2]/60">GO Decisions</p></div>
            <div><p className="font-display text-2xl font-black text-red-400">{killDeals}</p><p className="text-xs text-[#F8F7F2]/60">Killed Deals</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{fmt(pipelineValue)}</p><p className="flex items-center gap-1.5 text-xs text-[#F8F7F2]/60">Pipeline ARV <GlossaryHint term="ARV" className="text-[#F8F7F2]/50 hover:text-[var(--dynasty-gold)]" /></p></div>
          </div>
        </div>
      </FadeIn>

      {/* Decision filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {['all', 'go', 'go_conditions', 'renegotiate', 'hold', 'kill', 'pending'].map(d => (
          <button
            key={d}
            onClick={() => setFilterDecision(d)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${filterDecision === d ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2]' : 'bg-[#F8F7F2] text-[var(--dynasty-black)]/65 hover:bg-white'}`}
          >
            {d === 'all' ? 'All Deals' : (DECISION_CONFIG[d]?.label ?? d)}
          </button>
        ))}
        <Button onClick={() => setShowForm(!showForm)} className="ml-auto bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
          <PlusCircle className="h-4 w-4" /> Add Deal
        </Button>
      </div>

      {/* Add deal form with live calculator */}
      {showForm && (
        <FadeIn>
          <div className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card className="border-0 bg-[#F8F7F2] shadow-md">
              <CardHeader><CardTitle className="font-display text-lg text-[var(--dynasty-navy)]">New Deal — Intake</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Property Address</label>
                    <Input placeholder="123 Oak Ave" value={form.address} onChange={e => handleFormChange({ address: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">City</label>
                    <Input placeholder="Atlanta" value={form.city} onChange={e => handleFormChange({ city: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">State</label>
                    <Input placeholder="GA" value={form.state} onChange={e => handleFormChange({ state: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Exit Strategy</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.exitStrategy} onChange={e => handleFormChange({ exitStrategy: e.target.value })}>
                      {EXIT_STRATEGIES.map(s => <option key={s} value={s}>{EXIT_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Purchase Price</label>
                    <Input type="number" placeholder="150000" value={form.purchasePrice} onChange={e => handleFormChange({ purchasePrice: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--dynasty-black)]/60">ARV (After Repair Value) <GlossaryHint term="ARV" /></label>
                    <Input type="number" placeholder="250000" value={form.arv} onChange={e => handleFormChange({ arv: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--dynasty-black)]/60">Repair Costs <GlossaryHint term="Rehab Budget" /></label>
                    <Input type="number" placeholder="45000" value={form.repairCosts} onChange={e => handleFormChange({ repairCosts: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--dynasty-black)]/60">Holding Costs <GlossaryHint term="Holding Costs" /></label>
                    <Input type="number" placeholder="8000" value={form.holdingCosts} onChange={e => handleFormChange({ holdingCosts: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Closing Costs</label>
                    <Input type="number" placeholder="6000" value={form.closingCosts} onChange={e => handleFormChange({ closingCosts: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Notes</label>
                    <Input placeholder="Motivated seller, probate, needs full rehab..." value={form.notes} onChange={e => handleFormChange({ notes: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveDeal} disabled={saving || !form.address || !form.city || !form.state} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
                    {saving ? 'Saving...' : 'Save Deal'}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowForm(false); setLiveCalc(null) }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>

            {/* Live calculator */}
            {calc ? (
              <Card className={`border-0 shadow-md ${calc.decision === 'go' ? 'bg-emerald-50' : calc.decision === 'kill' ? 'bg-red-50' : 'bg-amber-50'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-lg text-[var(--dynasty-navy)]">
                    <BarChart3 className="h-5 w-5 text-[var(--dynasty-gold)]" /> Live Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={`rounded-xl p-4 text-center ${calc.decision === 'go' ? 'bg-emerald-600' : calc.decision === 'kill' ? 'bg-red-600' : 'bg-amber-600'} text-white`}>
                    <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-80">Decision <GlossaryHint term="GO / KILL / WATCH Decision" className="text-white/70 hover:text-white" /></p>
                    <p className="font-display text-3xl font-black">{DECISION_CONFIG[calc.decision]?.label ?? calc.decision}</p>
                  </div>
                  {[
                    { label: 'MAO (70% Rule)', value: fmt(calc.mao), term: 'MAO' },
                    { label: 'Flip Profit', value: fmt(calc.flipProfit), good: calc.flipProfit > 0 },
                    { label: 'Wholesale Fee', value: fmt(calc.wholesaleFee), term: 'Assignment Fee' },
                    { label: 'ROI', value: fmt(calc.roi, 'percent'), good: calc.roi >= 0.25 },
                    { label: 'Risk Score', value: `${calc.riskScore}/100`, good: calc.riskScore < 30 },
                    { label: 'Capital Required', value: fmt(calc.capitalRequired) },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-xs text-[var(--dynasty-black)]/60">{row.label} {row.term && <GlossaryHint term={row.term} />}</span>
                      <span className={`text-sm font-bold ${row.good === true ? 'text-emerald-700' : row.good === false ? 'text-red-700' : 'text-[var(--dynasty-navy)]'}`}>{row.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 bg-[#F8F7F2] shadow-sm">
                <CardContent className="flex h-full items-center justify-center py-12 text-center">
                  <div>
                    <BarChart3 className="mx-auto mb-3 h-10 w-10 text-[var(--dynasty-gold)]/50" />
                    <p className="text-sm text-[var(--dynasty-black)]/45">Enter Purchase Price + ARV to see live deal analysis</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Disposition matrix on form */}
          {form.purchasePrice && form.arv && (
            <div className="mb-6">
              <DispositionMatrix
                pp={parseFloat(form.purchasePrice) || 0}
                arv={parseFloat(form.arv) || 0}
                repair={parseFloat(form.repairCosts) || 0}
              />
            </div>
          )}
        </FadeIn>
      )}

      {/* Deal list */}
      {filtered.length > 0 ? (
        <Stagger className="space-y-3">
          {filtered.map(deal => {
            const cfg = DECISION_CONFIG[deal.decision] ?? DECISION_CONFIG.pending
            const Icon = cfg.icon
            return (
              <StaggerItem key={deal.id}>
                <Card className="border-0 bg-[#F8F7F2] shadow-sm transition-all hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${deal.decision === 'go' ? 'bg-emerald-100' : deal.decision === 'kill' ? 'bg-red-100' : 'bg-amber-100'}`}>
                          <Icon className={`h-5 w-5 ${deal.decision === 'go' ? 'text-emerald-700' : deal.decision === 'kill' ? 'text-red-700' : 'text-amber-700'}`} />
                        </div>
                        <div>
                          <p className="font-bold text-[var(--dynasty-navy)]">{deal.address}, {deal.city}, {deal.state}</p>
                          <p className="text-xs text-[var(--dynasty-black)]/55">{EXIT_LABELS[deal.exitStrategy] ?? deal.exitStrategy} · Risk Score: {deal.riskScore}/100</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {deal.arv && <div className="text-right"><p className="text-xs text-[var(--dynasty-black)]/50">ARV</p><p className="font-bold text-[var(--dynasty-navy)]">{fmt(deal.arv)}</p></div>}
                        {deal.flipProfit != null && <div className="text-right"><p className="text-xs text-[var(--dynasty-black)]/50">Flip Profit</p><p className={`font-bold ${deal.flipProfit > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(deal.flipProfit)}</p></div>}
                        {deal.roi != null && <div className="text-right"><p className="text-xs text-[var(--dynasty-black)]/50">ROI</p><p className={`font-bold ${deal.roi >= 0.25 ? 'text-emerald-700' : deal.roi >= 0.10 ? 'text-amber-700' : 'text-red-700'}`}>{fmt(deal.roi, 'percent')}</p></div>}
                        <Badge className={`border-0 ${cfg.color}`}>{cfg.label}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )
          })}
        </Stagger>
      ) : (
        <Card className="border-0 bg-[#F8F7F2] shadow-sm">
          <CardContent className="py-16 text-center">
            <Target className="mx-auto mb-4 h-10 w-10 text-[var(--dynasty-gold)]" />
            <p className="font-display text-xl font-bold text-[var(--dynasty-navy)]">Deal Engine is standing by.</p>
            <p className="mt-2 text-sm text-[var(--dynasty-black)]/55">Add a deal to run the MAO calculator, risk scoring, stress test, and disposition matrix.</p>
            <Button onClick={() => setShowForm(true)} className="mt-4 bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
              <PlusCircle className="h-4 w-4" /> Analyze First Deal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
