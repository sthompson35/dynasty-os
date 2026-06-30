'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, PlusCircle, Zap, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'

function fmt(n: number, t: 'currency' | 'integer' = 'currency'): string {
  if (t === 'integer') return `${Math.round(n)}`
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`
  return `$${Math.round(abs).toLocaleString()}`
}

type Lead = {
  id: string
  leadType: string
  source: string
  score: number
  status: string
  stage: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  motivation: string | null
  equity: number | null
  askingPrice: number | null
  notes: string | null
  nextAction: string | null
  nextActionDate: string | null
  createdAt: string
  updatedAt: string
}

const LEAD_TYPE_LABELS: Record<string, string> = {
  seller: 'Seller', buyer: 'Buyer', investor: 'Investor',
  agent: 'Agent', wholesaler: 'Wholesaler', vendor: 'Vendor',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-purple-100 text-purple-800',
  qualified: 'bg-amber-100 text-amber-800',
  appointment: 'bg-orange-100 text-orange-800',
  offer: 'bg-emerald-100 text-emerald-800',
  contract: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
  dead: 'bg-red-100 text-red-600',
}

const PIPELINE_STAGES = ['intake', 'qualified', 'appointment', 'offer', 'contract', 'closed']

const SOURCE_OPTIONS = [
  'Direct Mail', 'Cold Call', 'SMS', 'Referral', 'Agent',
  'Wholesaler', 'Google SEO', 'Facebook', 'YouTube', 'Probate',
  'Tax Delinquent', 'Absentee Owner', 'Vacant Property', 'Event',
]

type FormData = {
  leadType: string; source: string; firstName: string; lastName: string
  email: string; phone: string; address: string; city: string; state: string
  motivation: string; askingPrice: string; equity: string; notes: string
}

const EMPTY: FormData = {
  leadType: 'seller', source: 'Direct Mail', firstName: '', lastName: '',
  email: '', phone: '', address: '', city: '', state: '',
  motivation: '', askingPrice: '', equity: '', notes: '',
}

export function LeadEngineClient({ leads: initialLeads }: { leads: Lead[] }) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)

  const filtered = leads.filter(l => {
    const matchType = filterType === 'all' || l.leadType === filterType
    const name = `${l.firstName ?? ''} ${l.lastName ?? ''} ${l.address ?? ''} ${l.city ?? ''}`.toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const byStage = PIPELINE_STAGES.reduce<Record<string, Lead[]>>((acc, s) => {
    acc[s] = filtered.filter(l => l.stage === s)
    return acc
  }, {})

  const totalsByType = ['seller', 'buyer', 'investor', 'agent', 'wholesaler'].map(t => ({
    type: t,
    count: leads.filter(l => l.leadType === t).length,
    qualified: leads.filter(l => l.leadType === t && ['qualified', 'appointment', 'offer', 'contract'].includes(l.status)).length,
  }))

  async function saveLead() {
    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          askingPrice: form.askingPrice ? parseFloat(form.askingPrice) : null,
          equity: form.equity ? parseFloat(form.equity) : null,
          score: 50,
          status: 'new',
          stage: 'intake',
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setLeads(prev => [created, ...prev])
        setShowForm(false)
        setForm(EMPTY)
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
            <Zap className="h-3.5 w-3.5" /> Dynasty OS · Lead Engine
          </div>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight md:text-4xl">Lead Engine</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#F8F7F2]/70">
            Manufacture opportunity at scale. Every seller, buyer, and investor lead enters here — scored, qualified, and routed to the right engine.
          </p>
          <div className="mt-5 flex flex-wrap gap-6 border-t border-white/10 pt-5">
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{leads.length}</p><p className="text-xs text-[#F8F7F2]/60">Total Leads</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{leads.filter(l => ['qualified','appointment','offer','contract'].includes(l.status)).length}</p><p className="text-xs text-[#F8F7F2]/60">Qualified</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{leads.filter(l => l.stage === 'contract').length}</p><p className="text-xs text-[#F8F7F2]/60">Under Contract</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{leads.filter(l => l.leadType === 'seller').length}</p><p className="text-xs text-[#F8F7F2]/60">Seller Leads</p></div>
          </div>
        </div>
      </FadeIn>

      {/* Lead type breakdown */}
      <Stagger className="mb-6 grid gap-3 md:grid-cols-5">
        {totalsByType.map(t => (
          <StaggerItem key={t.type}>
            <button
              onClick={() => setFilterType(prev => prev === t.type ? 'all' : t.type)}
              className={`w-full rounded-lg p-4 text-left shadow-sm transition-all hover:shadow-md ${filterType === t.type ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2]' : 'bg-[#F8F7F2]'}`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${filterType === t.type ? 'text-[var(--dynasty-gold)]' : 'text-[var(--dynasty-black)]/55'}`}>
                {LEAD_TYPE_LABELS[t.type]}
              </p>
              <p className={`font-display text-2xl font-black ${filterType === t.type ? 'text-[#F8F7F2]' : 'text-[var(--dynasty-navy)]'}`}>{t.count}</p>
              <p className={`text-xs ${filterType === t.type ? 'text-[#F8F7F2]/60' : 'text-[var(--dynasty-black)]/45'}`}>{t.qualified} qualified</p>
            </button>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Search + Add */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dynasty-black)]/40" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
          <PlusCircle className="h-4 w-4" /> Add Lead
        </Button>
      </div>

      {/* Add lead form */}
      {showForm && (
        <FadeIn>
          <Card className="mb-6 border-0 bg-[#F8F7F2] shadow-md">
            <CardHeader><CardTitle className="font-display text-lg text-[var(--dynasty-navy)]">New Lead</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Lead Type</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.leadType} onChange={e => setForm(f => ({ ...f, leadType: e.target.value }))}>
                    {Object.entries(LEAD_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Source</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">First Name</label>
                  <Input placeholder="First" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Last Name</label>
                  <Input placeholder="Last" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Phone</label>
                  <Input placeholder="(555) 555-5555" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Email</label>
                  <Input placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Property Address</label>
                  <Input placeholder="123 Main St" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">City, State</label>
                  <Input placeholder="Atlanta, GA" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Asking Price</label>
                  <Input type="number" placeholder="150000" value={form.askingPrice} onChange={e => setForm(f => ({ ...f, askingPrice: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Estimated Equity</label>
                  <Input type="number" placeholder="60000" value={form.equity} onChange={e => setForm(f => ({ ...f, equity: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Motivation</label>
                  <Input placeholder="Divorce, probate, relocating..." value={form.motivation} onChange={e => setForm(f => ({ ...f, motivation: e.target.value }))} />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Notes</label>
                  <Input placeholder="Initial conversation notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveLead} disabled={saving} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
                  {saving ? 'Saving...' : 'Save Lead'}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Pipeline view */}
      <div className="overflow-x-auto">
        <div className="flex gap-3 min-w-[700px] pb-4">
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = byStage[stage] ?? []
            return (
              <div key={stage} className="flex-1 min-w-[160px]">
                <div className="mb-2 flex items-center justify-between rounded-t-lg bg-[var(--dynasty-navy)] px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--dynasty-gold)]">{stage}</span>
                  <Badge className="border-0 bg-white/15 text-[#F8F7F2] text-[10px]">{stageLeads.length}</Badge>
                </div>
                <div className="space-y-2 rounded-b-lg bg-[#F8F7F2] p-2 shadow-sm min-h-[120px]">
                  {stageLeads.length === 0 && (
                    <p className="py-4 text-center text-[10px] text-[var(--dynasty-black)]/35">No leads</p>
                  )}
                  {stageLeads.map(lead => (
                    <div key={lead.id} className="rounded-lg bg-white p-3 shadow-sm">
                      <p className="text-xs font-bold text-[var(--dynasty-navy)] truncate">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.address || 'Unknown'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--dynasty-black)]/50">{lead.source} · {LEAD_TYPE_LABELS[lead.leadType] ?? lead.leadType}</p>
                      {lead.askingPrice && <p className="mt-1 text-[10px] font-semibold text-[var(--dynasty-navy)]">{fmt(lead.askingPrice)}</p>}
                      <Badge className={`mt-1 border-0 text-[9px] ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {lead.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Full lead table */}
      {filtered.length > 0 && (
        <FadeIn>
          <Card className="mt-6 border-0 bg-[#F8F7F2] shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg text-[var(--dynasty-navy)]">
                <Filter className="h-4 w-4 text-[var(--dynasty-gold)]" /> All Leads ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--dynasty-black)]/10 text-left">
                    <th className="pb-2 pr-4 text-xs font-semibold text-[var(--dynasty-black)]/55">Name / Address</th>
                    <th className="pb-2 pr-4 text-xs font-semibold text-[var(--dynasty-black)]/55">Type</th>
                    <th className="pb-2 pr-4 text-xs font-semibold text-[var(--dynasty-black)]/55">Source</th>
                    <th className="pb-2 pr-4 text-xs font-semibold text-[var(--dynasty-black)]/55">Ask Price</th>
                    <th className="pb-2 pr-4 text-xs font-semibold text-[var(--dynasty-black)]/55">Equity</th>
                    <th className="pb-2 text-xs font-semibold text-[var(--dynasty-black)]/55">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--dynasty-black)]/5">
                  {filtered.map(lead => (
                    <tr key={lead.id} className="hover:bg-white/60">
                      <td className="py-2 pr-4">
                        <p className="font-semibold text-[var(--dynasty-navy)]">
                          {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || '—'}
                        </p>
                        <p className="text-xs text-[var(--dynasty-black)]/50">{lead.address ? `${lead.address}, ${lead.city}` : lead.city ?? '—'}</p>
                      </td>
                      <td className="py-2 pr-4 text-[var(--dynasty-black)]/70">{LEAD_TYPE_LABELS[lead.leadType] ?? lead.leadType}</td>
                      <td className="py-2 pr-4 text-[var(--dynasty-black)]/70">{lead.source}</td>
                      <td className="py-2 pr-4 font-medium text-[var(--dynasty-navy)]">{lead.askingPrice ? fmt(lead.askingPrice) : '—'}</td>
                      <td className="py-2 pr-4 font-medium text-emerald-700">{lead.equity ? fmt(lead.equity) : '—'}</td>
                      <td className="py-2">
                        <Badge className={`border-0 text-xs ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>{lead.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {leads.length === 0 && (
        <Card className="border-0 bg-[#F8F7F2] shadow-sm">
          <CardContent className="py-16 text-center">
            <Zap className="mx-auto mb-4 h-10 w-10 text-[var(--dynasty-gold)]" />
            <p className="font-display text-xl font-bold text-[var(--dynasty-navy)]">Lead Engine is ready.</p>
            <p className="mt-2 text-sm text-[var(--dynasty-black)]/55">No leads = no deals. Start manufacturing opportunity. Add your first lead.</p>
            <Button onClick={() => setShowForm(true)} className="mt-4 bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
              <PlusCircle className="h-4 w-4" /> Add First Lead
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
