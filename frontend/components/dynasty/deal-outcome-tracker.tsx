'use client'

import { Fragment, useState } from 'react'
import { CheckCircle2, TrendingUp, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type DealOutcomeDTO = {
  id: string
  status: string
  closeDate: string | null
  predictedDecision: string | null
  predictedScore: number | null
  predictedStrategy: string | null
  projectedPurchase: number | null
  projectedRehab: number | null
  projectedExit: number | null
  actualStrategy: string | null
  actualPurchase: number | null
  actualRehab: number | null
  actualExit: number | null
  holdMonths: number | null
  netProfit: number | null
  roi: number | null
  decisionSource: string | null
  postMortemNote: string | null
}

function fmt(n: number | null): string {
  if (n === null) return '—'
  const abs = Math.abs(n), sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${Math.round(abs).toLocaleString()}`
}

function decisionTone(decision: string | null): string {
  if (decision === 'GO' || decision === 'go') return 'bg-emerald-100 text-emerald-800'
  if (decision === 'KILL' || decision === 'kill') return 'bg-red-100 text-red-800'
  return 'bg-amber-100 text-amber-800'
}

type FormState = {
  status: 'closed' | 'fell_through'
  closeDate: string
  actualStrategy: string
  actualPurchase: string
  actualRehab: string
  actualExit: string
  holdMonths: string
  decisionSource: string
  postMortemNote: string
}

function emptyForm(outcome: DealOutcomeDTO | null): FormState {
  return {
    status: (outcome?.status as 'closed' | 'fell_through') ?? 'closed',
    closeDate: outcome?.closeDate ? outcome.closeDate.slice(0, 10) : '',
    actualStrategy: outcome?.actualStrategy ?? '',
    actualPurchase: outcome?.actualPurchase !== null && outcome?.actualPurchase !== undefined ? String(outcome.actualPurchase) : '',
    actualRehab: outcome?.actualRehab !== null && outcome?.actualRehab !== undefined ? String(outcome.actualRehab) : '',
    actualExit: outcome?.actualExit !== null && outcome?.actualExit !== undefined ? String(outcome.actualExit) : '',
    holdMonths: outcome?.holdMonths !== null && outcome?.holdMonths !== undefined ? String(outcome.holdMonths) : '',
    decisionSource: outcome?.decisionSource ?? 'Portfolio Scoring',
    postMortemNote: outcome?.postMortemNote ?? '',
  }
}

export function DealOutcomeTracker(props: {
  propertyId: string
  dealScore: { decision: string; dealScore: number; strategy: string } | null
  dealOutcome: DealOutcomeDTO | null
}) {
  const [outcome, setOutcome] = useState(props.dealOutcome)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(() => emptyForm(props.dealOutcome))
  const [saving, setSaving] = useState(false)

  function openForm() {
    setForm(emptyForm(outcome))
    setShowForm(true)
  }

  async function saveOutcome() {
    setSaving(true)
    try {
      const res = await fetch(`/api/properties/${props.propertyId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: form.status,
          closeDate: form.closeDate || null,
          actualStrategy: form.actualStrategy || null,
          actualPurchase: form.actualPurchase || null,
          actualRehab: form.actualRehab || null,
          actualExit: form.actualExit || null,
          holdMonths: form.holdMonths || null,
          decisionSource: form.decisionSource || null,
          postMortemNote: form.postMortemNote || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setOutcome(data.outcome)
        setShowForm(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-0 bg-[#F8F7F2] shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 font-display text-lg text-[var(--dynasty-navy)]">
          <TrendingUp className="h-5 w-5 text-[var(--dynasty-gold)]" /> Deal Outcome
        </CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={() => (showForm ? setShowForm(false) : openForm())}>
          {showForm ? 'Cancel' : outcome ? 'Edit Outcome' : 'Record Outcome'}
        </Button>
      </CardHeader>
      <CardContent>
        {!outcome && !showForm && (
          <div className="flex items-center justify-between rounded-lg bg-white/70 p-4">
            <div>
              <p className="text-sm text-[var(--dynasty-black)]/60">No outcome recorded yet.</p>
              {props.dealScore && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--dynasty-black)]/45">
                  Current prediction: <Badge className={`border-0 text-[10px] ${decisionTone(props.dealScore.decision)}`}>{props.dealScore.decision}</Badge> ({props.dealScore.strategy})
                </div>
              )}
            </div>
          </div>
        )}

        {outcome && !showForm && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {outcome.status === 'closed' ? (
                <Badge className="border-0 bg-emerald-100 text-xs text-emerald-800"><CheckCircle2 className="mr-1 h-3 w-3" />Closed</Badge>
              ) : (
                <Badge className="border-0 bg-red-100 text-xs text-red-800"><XCircle className="mr-1 h-3 w-3" />Fell Through</Badge>
              )}
              {outcome.predictedDecision && (
                <Badge className={`border-0 text-xs ${decisionTone(outcome.predictedDecision)}`}>Predicted {outcome.predictedDecision}</Badge>
              )}
              {outcome.closeDate && <span className="text-xs text-[var(--dynasty-black)]/45">{outcome.closeDate.slice(0, 10)}</span>}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div />
              <p className="font-bold uppercase tracking-wide text-[var(--dynasty-black)]/45">Predicted</p>
              <p className="font-bold uppercase tracking-wide text-[var(--dynasty-black)]/45">Actual</p>
              {([
                ['Purchase', outcome.projectedPurchase, outcome.actualPurchase],
                ['Rehab', outcome.projectedRehab, outcome.actualRehab],
                ['Exit', outcome.projectedExit, outcome.actualExit],
              ] as const).map(([label, predicted, actual]) => (
                <Fragment key={label}>
                  <p className="text-left font-semibold text-[var(--dynasty-navy)]">{label}</p>
                  <p className="text-[var(--dynasty-black)]/60">{fmt(predicted)}</p>
                  <p className="font-bold text-[var(--dynasty-navy)]">{fmt(actual)}</p>
                </Fragment>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-white/70 p-3">
              <div>
                <p className="text-xs text-[var(--dynasty-black)]/45">Net Profit</p>
                <p className={`font-display text-lg font-black ${(outcome.netProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(outcome.netProfit)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--dynasty-black)]/45">ROI</p>
                <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{outcome.roi !== null ? `${(outcome.roi * 100).toFixed(1)}%` : '—'}</p>
              </div>
              {outcome.holdMonths !== null && (
                <div>
                  <p className="text-xs text-[var(--dynasty-black)]/45">Hold Time</p>
                  <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{outcome.holdMonths}mo</p>
                </div>
              )}
            </div>

            {outcome.postMortemNote && (
              <p className="rounded-lg bg-white/70 p-3 text-xs leading-relaxed text-[var(--dynasty-black)]/60">{outcome.postMortemNote}</p>
            )}
          </div>
        )}

        {showForm && (
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={form.status === 'closed' ? 'default' : 'outline'} className={form.status === 'closed' ? 'bg-emerald-600 hover:bg-emerald-700' : ''} onClick={() => setForm((f) => ({ ...f, status: 'closed' }))}>Closed</Button>
                <Button type="button" size="sm" variant={form.status === 'fell_through' ? 'default' : 'outline'} className={form.status === 'fell_through' ? 'bg-red-600 hover:bg-red-700' : ''} onClick={() => setForm((f) => ({ ...f, status: 'fell_through' }))}>Fell Through</Button>
              </div>
              <Input type="date" value={form.closeDate} onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))} />
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input type="number" placeholder="Actual purchase" value={form.actualPurchase} onChange={(e) => setForm((f) => ({ ...f, actualPurchase: e.target.value }))} />
              <Input type="number" placeholder="Actual rehab" value={form.actualRehab} onChange={(e) => setForm((f) => ({ ...f, actualRehab: e.target.value }))} />
              <Input type="number" placeholder="Actual exit price" value={form.actualExit} onChange={(e) => setForm((f) => ({ ...f, actualExit: e.target.value }))} />
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Actual exit strategy" value={form.actualStrategy} onChange={(e) => setForm((f) => ({ ...f, actualStrategy: e.target.value }))} />
              <Input type="number" placeholder="Hold months" value={form.holdMonths} onChange={(e) => setForm((f) => ({ ...f, holdMonths: e.target.value }))} />
              <Input placeholder="Decision source" value={form.decisionSource} onChange={(e) => setForm((f) => ({ ...f, decisionSource: e.target.value }))} />
            </div>
            <Textarea placeholder="Post-mortem note (what went right/wrong vs. the prediction)" rows={2} value={form.postMortemNote} onChange={(e) => setForm((f) => ({ ...f, postMortemNote: e.target.value }))} />
            <div className="flex justify-end">
              <Button type="button" onClick={saveOutcome} loading={saving} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">Save Outcome</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
