'use client'

// Deprecated: superseded by disposition-command-center-client.tsx (BuyerProfile /
// DispositionPackage / AssignmentPipeline / ClosingTracker). Kept live and unlinked
// from nav as a read/write fallback for the legacy Buyer/Disposition rows this
// component still owns — do not build new features against it.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, PlusCircle, Users, TrendingUp, ArrowRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'

function fmt(n: number): string {
  const abs = Math.abs(n), sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${Math.round(abs).toLocaleString()}`
}

type Buyer = {
  id: string; name: string; entity: string | null; email: string | null; phone: string | null
  markets: string | null; criteria: string | null; buyerType: string
  fundingCapacity: number | null; closeSpeed: number | null; score: number; active: boolean
  notes: string | null; createdAt: string; updatedAt: string
}

type Disposition = {
  id: string; dealId: string | null; buyerId: string | null; exitStrategy: string; status: string
  listPrice: number | null; salePrice: number | null; netProfit: number | null
  daysToExit: number | null; closeDate: string | null; notes: string | null
  buyer: Buyer | null; createdAt: string; updatedAt: string
}

const BUYER_TYPES: Record<string, string> = {
  cash: 'Cash Buyer', flipper: 'Flipper', landlord: 'Landlord', developer: 'Developer',
  institutional: 'Institutional', owner_occupant: 'Owner Occupant', builder: 'Builder',
}

const DISPOSITION_STATUSES: Record<string, string> = {
  marketing: 'bg-blue-100 text-blue-700',
  offers: 'bg-amber-100 text-amber-700',
  under_contract: 'bg-purple-100 text-purple-700',
  closing: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
}

const EXIT_LABELS: Record<string, string> = {
  wholesale: 'Wholesale', flip: 'Fix & Flip', brrrr: 'BRRRR',
  hold: 'Hold / Rental', development: 'Development', land_flip: 'Land Flip',
}

type BuyerForm = { name: string; entity: string; email: string; phone: string; buyerType: string; markets: string; criteria: string; fundingCapacity: string; closeSpeed: string; notes: string }
const EMPTY_BUYER: BuyerForm = { name: '', entity: '', email: '', phone: '', buyerType: 'cash', markets: '', criteria: '', fundingCapacity: '', closeSpeed: '', notes: '' }

type DispForm = { buyerId: string; exitStrategy: string; status: string; listPrice: string; notes: string }
const EMPTY_DISP: DispForm = { buyerId: '', exitStrategy: 'wholesale', status: 'marketing', listPrice: '', notes: '' }

export function DispositionEngineClient({ buyers: initialBuyers, dispositions: initialDispositions }: { buyers: Buyer[]; dispositions: Disposition[] }) {
  const router = useRouter()
  const [buyers, setBuyers] = useState(initialBuyers)
  const [dispositions, setDispositions] = useState(initialDispositions)
  const [showBuyerForm, setShowBuyerForm] = useState(false)
  const [showDispForm, setShowDispForm] = useState(false)
  const [buyerForm, setBuyerForm] = useState<BuyerForm>(EMPTY_BUYER)
  const [dispForm, setDispForm] = useState<DispForm>(EMPTY_DISP)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'pipeline' | 'buyers'>('pipeline')

  const totalProfit = dispositions.filter(d => d.status === 'closed').reduce((s, d) => s + (d.netProfit ?? 0), 0)
  const capitalRecovered = dispositions.filter(d => d.status === 'closed').reduce((s, d) => s + (d.salePrice ?? 0), 0)
  const forSale = dispositions.filter(d => ['marketing', 'offers'].includes(d.status)).length
  const pendingClosings = dispositions.filter(d => d.status === 'under_contract').length
  const avgDaysToExit = dispositions.filter(d => d.daysToExit).length > 0
    ? Math.round(dispositions.filter(d => d.daysToExit).reduce((s, d) => s + (d.daysToExit ?? 0), 0) / dispositions.filter(d => d.daysToExit).length)
    : 0

  async function saveBuyer() {
    setSaving(true)
    try {
      const res = await fetch('/api/buyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buyerForm,
          fundingCapacity: buyerForm.fundingCapacity ? parseFloat(buyerForm.fundingCapacity) : null,
          closeSpeed: buyerForm.closeSpeed ? parseInt(buyerForm.closeSpeed) : null,
          score: 50,
          active: true,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setBuyers(prev => [created, ...prev])
        setShowBuyerForm(false)
        setBuyerForm(EMPTY_BUYER)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function saveDisposition() {
    setSaving(true)
    try {
      const res = await fetch('/api/dispositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: dispForm.buyerId || null,
          exitStrategy: dispForm.exitStrategy,
          status: dispForm.status,
          listPrice: dispForm.listPrice ? parseFloat(dispForm.listPrice) : null,
          notes: dispForm.notes || null,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setDispositions(prev => [{ ...created, buyer: null }, ...prev])
        setShowDispForm(false)
        setDispForm(EMPTY_DISP)
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
            <ShoppingBag className="h-3.5 w-3.5" /> Dynasty OS · Disposition Engine
          </div>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight md:text-4xl">Disposition Engine</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#F8F7F2]/70">
            Convert assets into cash, cash flow, equity, or strategic value through the optimal exit strategy. This is where profit is realized.
          </p>
          <div className="mt-5 flex flex-wrap gap-6 border-t border-white/10 pt-5">
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{buyers.length}</p><p className="text-xs text-[#F8F7F2]/60">Active Buyers</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{forSale}</p><p className="text-xs text-[#F8F7F2]/60">For Sale</p></div>
            <div><p className="font-display text-2xl font-black text-amber-400">{pendingClosings}</p><p className="text-xs text-[#F8F7F2]/60">Pending Closings</p></div>
            <div><p className="font-display text-2xl font-black text-emerald-400">{fmt(totalProfit)}</p><p className="text-xs text-[#F8F7F2]/60">Total Profit</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{fmt(capitalRecovered)}</p><p className="text-xs text-[#F8F7F2]/60">Capital Recovered</p></div>
          </div>
        </div>
      </FadeIn>

      {/* Disposition mission panel */}
      <FadeIn>
        <Card className="mb-6 border-0 bg-[#F8F7F2] shadow-sm">
          <CardContent className="p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--dynasty-black)]/55">Disposition Workflow</p>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              {['Contract Acquired', 'Buyer List', 'Property Package', 'Marketing Blast', 'Offer Collection', 'Assignment Contract', 'Closing', 'Fee Collected'].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-1">
                  <span className="rounded bg-[var(--dynasty-navy)]/8 px-2 py-0.5 text-xs font-medium text-[var(--dynasty-navy)]">{step}</span>
                  {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-[var(--dynasty-black)]/30" />}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-[var(--dynasty-black)]/10 pb-0">
        {(['pipeline', 'buyers'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab ? 'border-b-2 border-[var(--dynasty-navy)] text-[var(--dynasty-navy)]' : 'text-[var(--dynasty-black)]/55 hover:text-[var(--dynasty-navy)]'}`}
          >
            {tab === 'pipeline' ? `Disposition Pipeline (${dispositions.length})` : `Buyers List (${buyers.length})`}
          </button>
        ))}
        <div className="ml-auto flex gap-2 pb-1">
          <Button size="sm" onClick={() => { setShowBuyerForm(!showBuyerForm); setShowDispForm(false) }} variant="outline" className="border-[var(--dynasty-navy)] text-[var(--dynasty-navy)]">
            <PlusCircle className="h-3.5 w-3.5" /> Add Buyer
          </Button>
          <Button size="sm" onClick={() => { setShowDispForm(!showDispForm); setShowBuyerForm(false) }} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
            <PlusCircle className="h-3.5 w-3.5" /> New Disposition
          </Button>
        </div>
      </div>

      {/* Buyer form */}
      {showBuyerForm && (
        <FadeIn>
          <Card className="mb-6 border-0 bg-[#F8F7F2] shadow-md">
            <CardHeader><CardTitle className="font-display text-lg text-[var(--dynasty-navy)]">Add Buyer to List</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Full Name *</label><Input placeholder="John Smith" value={buyerForm.name} onChange={e => setBuyerForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Entity</label><Input placeholder="Smith Investments LLC" value={buyerForm.entity} onChange={e => setBuyerForm(f => ({ ...f, entity: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Buyer Type</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={buyerForm.buyerType} onChange={e => setBuyerForm(f => ({ ...f, buyerType: e.target.value }))}>
                    {Object.entries(BUYER_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Email</label><Input placeholder="john@example.com" value={buyerForm.email} onChange={e => setBuyerForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Phone</label><Input placeholder="(555) 555-5555" value={buyerForm.phone} onChange={e => setBuyerForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Funding Capacity ($)</label><Input type="number" placeholder="500000" value={buyerForm.fundingCapacity} onChange={e => setBuyerForm(f => ({ ...f, fundingCapacity: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Close Speed (days)</label><Input type="number" placeholder="14" value={buyerForm.closeSpeed} onChange={e => setBuyerForm(f => ({ ...f, closeSpeed: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Markets</label><Input placeholder="Atlanta, GA · Birmingham, AL" value={buyerForm.markets} onChange={e => setBuyerForm(f => ({ ...f, markets: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Price Range / Criteria</label><Input placeholder="$80k–$200k, 3/2+, ARV 150k+" value={buyerForm.criteria} onChange={e => setBuyerForm(f => ({ ...f, criteria: e.target.value }))} /></div>
                <div className="md:col-span-3"><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Notes</label><Input placeholder="Prefers distressed, cash, quick close..." value={buyerForm.notes} onChange={e => setBuyerForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveBuyer} disabled={saving || !buyerForm.name} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">{saving ? 'Saving...' : 'Add Buyer'}</Button>
                <Button variant="ghost" onClick={() => setShowBuyerForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Disposition form */}
      {showDispForm && (
        <FadeIn>
          <Card className="mb-6 border-0 bg-[#F8F7F2] shadow-md">
            <CardHeader><CardTitle className="font-display text-lg text-[var(--dynasty-navy)]">New Disposition</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Exit Strategy</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={dispForm.exitStrategy} onChange={e => setDispForm(f => ({ ...f, exitStrategy: e.target.value }))}>
                    {Object.entries(EXIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Status</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={dispForm.status} onChange={e => setDispForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.keys(DISPOSITION_STATUSES).map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">List Price ($)</label><Input type="number" placeholder="235000" value={dispForm.listPrice} onChange={e => setDispForm(f => ({ ...f, listPrice: e.target.value }))} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Assign Buyer</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={dispForm.buyerId} onChange={e => setDispForm(f => ({ ...f, buyerId: e.target.value }))}>
                    <option value="">— Select Buyer —</option>
                    {buyers.filter(b => b.active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-4"><label className="mb-1 block text-xs font-semibold text-[var(--dynasty-black)]/60">Notes</label><Input placeholder="Ready for marketing, MLS, email blast..." value={dispForm.notes} onChange={e => setDispForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveDisposition} disabled={saving} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">{saving ? 'Saving...' : 'Create Disposition'}</Button>
                <Button variant="ghost" onClick={() => setShowDispForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Tab content */}
      {activeTab === 'pipeline' && (
        dispositions.length === 0 ? (
          <Card className="border-0 bg-[#F8F7F2] shadow-sm">
            <CardContent className="py-16 text-center">
              <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-[var(--dynasty-gold)]" />
              <p className="font-display text-xl font-bold text-[var(--dynasty-navy)]">Disposition pipeline is empty.</p>
              <p className="mt-2 text-sm text-[var(--dynasty-black)]/55">This is where profit is realized. Create a disposition to begin tracking exit progress.</p>
              <Button onClick={() => setShowDispForm(true)} className="mt-4 bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]"><PlusCircle className="h-4 w-4" /> Create First Disposition</Button>
            </CardContent>
          </Card>
        ) : (
          <Stagger className="space-y-3">
            {dispositions.map(d => (
              <StaggerItem key={d.id}>
                <Card className="border-0 bg-[#F8F7F2] shadow-sm transition-all hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[var(--dynasty-navy)]">{EXIT_LABELS[d.exitStrategy] ?? d.exitStrategy}</p>
                          <Badge className={`border-0 text-xs ${DISPOSITION_STATUSES[d.status] ?? 'bg-gray-100'}`}>{d.status.replace('_', ' ')}</Badge>
                        </div>
                        {d.buyer && <p className="mt-0.5 text-xs text-[var(--dynasty-black)]/55">Buyer: {d.buyer.name} · {BUYER_TYPES[d.buyer.buyerType] ?? d.buyer.buyerType}</p>}
                        {d.notes && <p className="mt-1 text-xs text-[var(--dynasty-black)]/45 italic">{d.notes}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        {d.listPrice && <div className="text-right"><p className="text-xs text-[var(--dynasty-black)]/50">List Price</p><p className="font-bold text-[var(--dynasty-navy)]">{fmt(d.listPrice)}</p></div>}
                        {d.salePrice && <div className="text-right"><p className="text-xs text-[var(--dynasty-black)]/50">Sale Price</p><p className="font-bold text-emerald-700">{fmt(d.salePrice)}</p></div>}
                        {d.netProfit != null && <div className="text-right"><p className="text-xs text-[var(--dynasty-black)]/50">Net Profit</p><p className={`font-bold ${d.netProfit > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(d.netProfit)}</p></div>}
                        {d.daysToExit && <div className="text-right"><p className="text-xs text-[var(--dynasty-black)]/50">Days to Exit</p><p className="font-bold text-[var(--dynasty-navy)]">{d.daysToExit}d</p></div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )
      )}

      {activeTab === 'buyers' && (
        buyers.length === 0 ? (
          <Card className="border-0 bg-[#F8F7F2] shadow-sm">
            <CardContent className="py-16 text-center">
              <Users className="mx-auto mb-4 h-10 w-10 text-[var(--dynasty-gold)]" />
              <p className="font-display text-xl font-bold text-[var(--dynasty-navy)]">Buyers list is empty.</p>
              <p className="mt-2 text-sm text-[var(--dynasty-black)]/55">The larger the buyer network, the more valuable Dynasty becomes. Add your first buyer.</p>
              <Button onClick={() => setShowBuyerForm(true)} className="mt-4 bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]"><PlusCircle className="h-4 w-4" /> Add First Buyer</Button>
            </CardContent>
          </Card>
        ) : (
          <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {buyers.map(buyer => (
              <StaggerItem key={buyer.id}>
                <Card className="border-0 bg-[#F8F7F2] shadow-sm transition-all hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--dynasty-navy)] text-sm font-black text-[var(--dynasty-gold)] shadow-md">
                          {buyer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--dynasty-navy)]">{buyer.name}</p>
                          <p className="text-xs text-[var(--dynasty-black)]/55">{buyer.entity ?? ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-[var(--dynasty-gold)]" />
                        <span className="text-xs font-bold text-[var(--dynasty-navy)]">{buyer.score}</span>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--dynasty-black)]/55">Type</span>
                        <Badge className="border-0 bg-[var(--dynasty-navy)]/8 text-xs text-[var(--dynasty-navy)]">{BUYER_TYPES[buyer.buyerType] ?? buyer.buyerType}</Badge>
                      </div>
                      {buyer.fundingCapacity && <div className="flex items-center justify-between"><span className="text-xs text-[var(--dynasty-black)]/55">Capacity</span><span className="text-xs font-bold text-[var(--dynasty-navy)]">{fmt(buyer.fundingCapacity)}</span></div>}
                      {buyer.closeSpeed && <div className="flex items-center justify-between"><span className="text-xs text-[var(--dynasty-black)]/55">Close Speed</span><span className="text-xs font-bold text-[var(--dynasty-navy)]">{buyer.closeSpeed} days</span></div>}
                      {buyer.markets && <p className="text-xs text-[var(--dynasty-black)]/50">{buyer.markets}</p>}
                      {buyer.criteria && <p className="text-xs text-[var(--dynasty-black)]/45 italic">{buyer.criteria}</p>}
                    </div>
                    {(buyer.email || buyer.phone) && (
                      <div className="mt-3 flex gap-3 border-t border-[var(--dynasty-black)]/8 pt-3">
                        {buyer.email && <a href={`mailto:${buyer.email}`} className="text-xs text-[var(--dynasty-navy)] hover:underline">{buyer.email}</a>}
                        {buyer.phone && <a href={`tel:${buyer.phone}`} className="text-xs text-[var(--dynasty-navy)] hover:underline">{buyer.phone}</a>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )
      )}
    </div>
  )
}
