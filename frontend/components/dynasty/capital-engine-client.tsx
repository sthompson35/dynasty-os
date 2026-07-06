'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, PlusCircle, Users, TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, PhoneCall } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { computeInvestorQualification } from '@/lib/investor-qualification'

function fmt(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${Math.round(abs).toLocaleString()}`
}

type Investor = {
  id: string; name: string; entity: string | null; email: string | null; phone: string | null
  status: string; availableCapital: number | null; committedCapital: number | null
  investedCapital: number | null; preferredReturn: number | null; investmentType: string
  markets: string | null; notes: string | null; evidenceSource: string | null
  createdAt: string; updatedAt: string
}

type Transaction = {
  id: string; investorId: string | null; dealId: string | null; type: string
  amount: number; date: string; status: string; notes: string | null
}

const STATUS_CONFIG: Record<string, string> = {
  prospect: 'bg-gray-100 text-gray-600',
  warm: 'bg-blue-100 text-blue-700',
  committed: 'bg-amber-100 text-amber-700',
  funded: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-red-100 text-red-600',
}

const INVEST_TYPES: Record<string, string> = {
  private_loan: 'Private Loan', equity: 'Equity', jv: 'Joint Venture', fund: 'Fund',
}

function qualificationTone(score: number): string {
  if (score >= 70) return 'bg-emerald-100 text-emerald-800'
  if (score >= 45) return 'bg-amber-100 text-amber-800'
  return 'bg-gray-100 text-gray-600'
}

type InvForm = { name: string; entity: string; email: string; phone: string; status: string; availableCapital: string; preferredReturn: string; investmentType: string; markets: string; notes: string; evidenceSource: string }
const EMPTY_INV: InvForm = { name: '', entity: '', email: '', phone: '', status: 'prospect', availableCapital: '', preferredReturn: '8', investmentType: 'private_loan', markets: '', notes: '', evidenceSource: '' }

const EVIDENCE_SOURCES = ['REIA', 'LinkedIn', 'BiggerPockets', 'Referral', 'Website', 'Event/Meetup', 'Other']

type TxForm = { investorId: string; type: string; amount: string; notes: string }
const EMPTY_TX: TxForm = { investorId: '', type: 'investment', amount: '', notes: '' }

export function CapitalEngineClient({ investors: initialInvestors, transactions: initialTx }: { investors: Investor[]; transactions: Transaction[] }) {
  const router = useRouter()
  const [investors, setInvestors] = useState(initialInvestors)
  const [transactions, setTransactions] = useState(initialTx)
  const [showInvForm, setShowInvForm] = useState(false)
  const [showTxForm, setShowTxForm] = useState(false)
  const [invForm, setInvForm] = useState<InvForm>(EMPTY_INV)
  const [txForm, setTxForm] = useState<TxForm>(EMPTY_TX)
  const [saving, setSaving] = useState(false)

  const totalAvailable = investors.reduce((s, i) => s + (i.availableCapital ?? 0), 0)
  const totalCommitted = investors.reduce((s, i) => s + (i.committedCapital ?? 0), 0)
  const dryPowder = totalAvailable - totalCommitted
  const deployed = transactions.filter(t => t.type === 'investment' && t.status === 'completed').reduce((s, t) => s + t.amount, 0)
  const returned = transactions.filter(t => t.type === 'return' && t.status === 'completed').reduce((s, t) => s + t.amount, 0)

  // Investor Intelligence Slice 2: "who should we contact first, and why?"
  // Presentation-layer only - reuses the qualification score, excludes only
  // "inactive" (already-resolved, same reasoning as excluding KILL-decision
  // properties from the property Top 20), no new contacted/status machinery.
  const contactPriority = investors
    .filter(inv => inv.status !== 'inactive')
    .map(inv => ({
      investor: inv,
      qualification: computeInvestorQualification({
        status: inv.status,
        availableCapital: inv.availableCapital,
        preferredReturn: inv.preferredReturn,
        markets: inv.markets,
        email: inv.email,
        phone: inv.phone,
        evidenceSource: inv.evidenceSource,
        hasPriorCapitalActivity: transactions.some(t => t.investorId === inv.id),
      }),
    }))
    .sort((a, b) => b.qualification.score - a.qualification.score)
    .slice(0, 5)

  async function saveInvestor() {
    setSaving(true)
    try {
      const res = await fetch('/api/investors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...invForm,
          availableCapital: invForm.availableCapital ? parseFloat(invForm.availableCapital) : null,
          preferredReturn: invForm.preferredReturn ? parseFloat(invForm.preferredReturn) / 100 : null,
          committedCapital: null,
          investedCapital: null,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setInvestors(prev => [created, ...prev])
        setShowInvForm(false)
        setInvForm(EMPTY_INV)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function saveTransaction() {
    setSaving(true)
    try {
      const res = await fetch('/api/capital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investorId: txForm.investorId || null,
          type: txForm.type,
          amount: parseFloat(txForm.amount),
          status: 'completed',
          notes: txForm.notes || null,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setTransactions(prev => [created, ...prev])
        setShowTxForm(false)
        setTxForm(EMPTY_TX)
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
            <DollarSign className="h-3.5 w-3.5" /> Dynasty OS · Capital Engine
          </div>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight md:text-4xl">Capital Engine</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#F8F7F2]/70">
            Acquire, organize, deploy, protect, and recycle capital across the Dynasty ecosystem. The bridge between real estate investor and investment enterprise.
          </p>
          <div className="mt-5 flex flex-wrap gap-6 border-t border-white/10 pt-5">
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{fmt(totalAvailable)}</p><p className="text-xs text-[#F8F7F2]/60">Available Capital</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{fmt(dryPowder)}</p><p className="text-xs text-[#F8F7F2]/60">Dry Powder</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{fmt(deployed)}</p><p className="text-xs text-[#F8F7F2]/60">Deployed</p></div>
            <div><p className="font-display text-2xl font-black text-emerald-400">{fmt(returned)}</p><p className="text-xs text-[#F8F7F2]/60">Capital Returned</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{investors.length}</p><p className="text-xs text-[#F8F7F2]/60">Investors</p></div>
          </div>
        </div>
      </FadeIn>

      {/* Capital Intelligence metrics */}
      <Stagger className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          { label: 'Available Capital', value: fmt(totalAvailable), helper: 'Total investor capacity', color: 'text-emerald-700' },
          { label: 'Committed Capital', value: fmt(totalCommitted), helper: 'Verbally committed', color: 'text-amber-700' },
          { label: 'Dry Powder', value: fmt(dryPowder), helper: 'Deployable tomorrow', color: 'text-[var(--dynasty-navy)]' },
          { label: 'Capital Recycled', value: fmt(returned), helper: 'Returned to flywheel', color: 'text-emerald-700' },
        ].map(m => (
          <StaggerItem key={m.label}>
            <Card className="border-0 bg-[#F8F7F2] shadow-md">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-[var(--dynasty-black)]/55">{m.label}</p>
                <p className={`mt-1 font-display text-2xl font-black ${m.color}`}>{m.value}</p>
                <p className="mt-1 text-xs text-[var(--dynasty-black)]/45">{m.helper}</p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Action buttons */}
      <div className="mb-6 flex gap-2">
        <Button onClick={() => setShowInvForm(!showInvForm)} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
          <PlusCircle className="h-4 w-4" /> Add Investor
        </Button>
        <Button onClick={() => setShowTxForm(!showTxForm)} variant="outline" className="border-[var(--dynasty-navy)] text-[var(--dynasty-navy)]">
          <RefreshCw className="h-4 w-4" /> Log Transaction
        </Button>
      </div>

      {/* Investor form */}
      {showInvForm && (
        <FadeIn>
          <Card className="mb-6 border-0 bg-[#F8F7F2] shadow-md">
            <CardHeader><CardTitle className="font-display text-lg text-[var(--dynasty-navy)]">New Investor</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Full Name *</label><Input placeholder="Jane Smith" value={invForm.name} onChange={e => setInvForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Entity</label><Input placeholder="Smith Capital LLC" value={invForm.entity} onChange={e => setInvForm(f => ({ ...f, entity: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Status</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={invForm.status} onChange={e => setInvForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Email</label><Input placeholder="jane@example.com" value={invForm.email} onChange={e => setInvForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Phone</label><Input placeholder="(555) 555-5555" value={invForm.phone} onChange={e => setInvForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Investment Type</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={invForm.investmentType} onChange={e => setInvForm(f => ({ ...f, investmentType: e.target.value }))}>
                    {Object.entries(INVEST_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Available Capital ($)</label><Input type="number" placeholder="250000" value={invForm.availableCapital} onChange={e => setInvForm(f => ({ ...f, availableCapital: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Preferred Return (%)</label><Input type="number" placeholder="8" value={invForm.preferredReturn} onChange={e => setInvForm(f => ({ ...f, preferredReturn: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Markets</label><Input placeholder="Atlanta, GA · Charlotte, NC" value={invForm.markets} onChange={e => setInvForm(f => ({ ...f, markets: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Evidence Source</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={invForm.evidenceSource} onChange={e => setInvForm(f => ({ ...f, evidenceSource: e.target.value }))}>
                    <option value="">— Where did this lead come from? —</option>
                    {EVIDENCE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3"><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Notes</label><Input placeholder="Prefers short-term deals, 6-12 month hold max..." value={invForm.notes} onChange={e => setInvForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveInvestor} disabled={saving || !invForm.name} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">{saving ? 'Saving...' : 'Add Investor'}</Button>
                <Button variant="ghost" onClick={() => setShowInvForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Transaction form */}
      {showTxForm && (
        <FadeIn>
          <Card className="mb-6 border-0 bg-[#F8F7F2] shadow-md">
            <CardHeader><CardTitle className="font-display text-lg text-[var(--dynasty-navy)]">Log Capital Transaction</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Investor</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={txForm.investorId} onChange={e => setTxForm(f => ({ ...f, investorId: e.target.value }))}>
                    <option value="">— Select Investor —</option>
                    {investors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Transaction Type</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={txForm.type} onChange={e => setTxForm(f => ({ ...f, type: e.target.value }))}>
                    {['investment', 'distribution', 'return', 'draw', 'repayment'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Amount ($)</label><Input type="number" placeholder="50000" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div className="md:col-span-3"><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Notes</label><Input placeholder="Investment for 502 Buckley project..." value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveTransaction} disabled={saving || !txForm.amount} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">{saving ? 'Saving...' : 'Log Transaction'}</Button>
                <Button variant="ghost" onClick={() => setShowTxForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Contact priority */}
      <Card className="mb-6 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg text-[var(--dynasty-navy)]">
            <PhoneCall className="h-5 w-5 text-[var(--dynasty-gold)]" /> Who to contact first today
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contactPriority.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--dynasty-black)]/50">No active investors to prioritize yet.</p>
          ) : (
            <div className="space-y-2">
              {contactPriority.map(({ investor: inv, qualification }, index) => (
                <div key={inv.id} className="flex items-start gap-3 rounded-lg bg-white/70 p-3 shadow-sm">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--dynasty-navy)] font-display text-xs font-black text-[var(--dynasty-gold)]">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[var(--dynasty-navy)]">{inv.name}</p>
                      <Badge className={`border-0 text-xs ${qualificationTone(qualification.score)}`}>Qualification {qualification.score}</Badge>
                      <Badge className={`border-0 text-xs ${STATUS_CONFIG[inv.status] ?? 'bg-gray-100'}`}>{inv.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--dynasty-black)]/50">{qualification.reasons.join(' · ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investor roster */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-0 bg-[#F8F7F2] shadow-md">
          <CardHeader><CardTitle className="flex items-center gap-2 font-display text-lg text-[var(--dynasty-navy)]"><Users className="h-5 w-5 text-[var(--dynasty-gold)]" /> Investor Roster</CardTitle></CardHeader>
          <CardContent>
            {investors.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--dynasty-black)]/50">
                <Users className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]/40" />
                No investors yet. Capital acquisition is the mission.
              </div>
            ) : (
              <div className="space-y-3">
                {investors.map(inv => {
                  const qualification = computeInvestorQualification({
                    status: inv.status,
                    availableCapital: inv.availableCapital,
                    preferredReturn: inv.preferredReturn,
                    markets: inv.markets,
                    email: inv.email,
                    phone: inv.phone,
                    evidenceSource: inv.evidenceSource,
                    hasPriorCapitalActivity: transactions.some(t => t.investorId === inv.id),
                  })
                  return (
                  <div key={inv.id} className="rounded-lg bg-white/70 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[var(--dynasty-navy)]">{inv.name}</p>
                        <p className="text-xs text-[var(--dynasty-black)]/55">{inv.entity ?? ''}{inv.entity && inv.markets ? ' · ' : ''}{inv.markets ?? ''}</p>
                        <p className="text-xs text-[var(--dynasty-black)]/45">{INVEST_TYPES[inv.investmentType] ?? inv.investmentType}{inv.preferredReturn ? ` · ${(inv.preferredReturn * 100).toFixed(0)}% preferred` : ''}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="font-bold text-[var(--dynasty-navy)]">{inv.availableCapital ? fmt(inv.availableCapital) : '—'}</p>
                        <div className="flex items-center gap-1.5">
                          <Badge className={`border-0 text-xs ${qualificationTone(qualification.score)}`}>Qualification {qualification.score}</Badge>
                          <Badge className={`border-0 text-xs ${STATUS_CONFIG[inv.status] ?? 'bg-gray-100'}`}>{inv.status}</Badge>
                        </div>
                      </div>
                    </div>
                    {qualification.reasons.length > 0 && (
                      <p className="mt-2 text-[11px] leading-relaxed text-[var(--dynasty-black)]/45">{qualification.reasons.join(' · ')}</p>
                    )}
                  </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card className="border-0 bg-[var(--dynasty-navy)] text-[#F8F7F2] shadow-md">
          <CardHeader><CardTitle className="flex items-center gap-2 font-display text-lg text-[#F8F7F2]"><TrendingUp className="h-5 w-5 text-[var(--dynasty-gold)]" /> Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#F8F7F2]/50">No transactions logged.</p>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 10).map(tx => {
                  const investor = investors.find(i => i.id === tx.investorId)
                  const isIn = ['investment', 'draw'].includes(tx.type)
                  return (
                    <div key={tx.id} className="flex items-center justify-between rounded-lg bg-white/8 px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-[#F8F7F2]">{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</p>
                        <p className="text-[10px] text-[#F8F7F2]/50">{investor?.name ?? 'General'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isIn ? <ArrowUpRight className="h-3 w-3 text-emerald-400" /> : <ArrowDownRight className="h-3 w-3 text-[var(--dynasty-gold)]" />}
                        <span className={`text-sm font-bold ${isIn ? 'text-emerald-400' : 'text-[var(--dynasty-gold)]'}`}>{fmt(tx.amount)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
