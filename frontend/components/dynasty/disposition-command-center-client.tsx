'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Building2, CheckCircle2, ClipboardList, FileText, Loader2, Package, RefreshCcw, ShoppingBag, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/property-utils'

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

// ── Types ─────────────────────────────────────────────────────────────────

type BuyerProfilesPayload = {
  totalProfiles: number
  activeCount: number
  verifiedCount: number
  types: { buyerType: string; count: number }[]
  items: {
    id: string
    name: string
    entity: string | null
    buyerType: string
    fundingVerified: boolean
    fundingCapacity: number
    closeSpeedDays: number | null
    rating: number
    status: string
    criteria: { propertyTypes: string[]; exitStrategies: string[]; markets: string[]; minPrice: number; maxPrice: number; maxCapital: number }[]
  }[]
}

type BuyerMatchesPayload = {
  totalMatches: number
  highScore: number
  statuses: { status: string; count: number }[]
  items: {
    id: string
    dealId: string
    propertyId: string
    buyerProfileId: string
    matchScore: number
    matchReasons: string[]
    status: string
    property: { address: string; city: string; state: string; zip: string | null } | null
    buyerProfile: { name: string; buyerType: string } | null
  }[]
}

type DealSummary = {
  id: string
  propertyId: string | null
  address: string
  city: string
  state: string
  decision: string
  status: string
  purchasePrice: string | number | null
}

type PackagesPayload = {
  totalPackages: number
  readyCount: number
  distributedCount: number
  statuses: { status: string; count: number }[]
  items: {
    id: string
    dealId: string
    propertyId: string
    packageType: string
    askingPrice: number
    assignmentFee: number
    status: string
    property: { address: string; city: string; state: string; zip: string | null } | null
  }[]
}

type PipelinePayload = {
  totalPipeline: number
  stages: { stage: string; count: number }[]
  items: {
    id: string
    dealId: string
    packageId: string
    buyerProfileId: string
    stage: string
    assignmentFee: number
    contractDate: string | null
    emdReceived: boolean
    propertyId: string | null
    buyerProfile: { name: string; buyerType: string } | null
  }[]
}

type ClosingsPayload = {
  totalClosings: number
  closedCount: number
  fellThroughCount: number
  totalClosedVolume: number
  statuses: { status: string; count: number }[]
  items: {
    id: string
    dealId: string
    assignmentPipelineId: string
    closingDate: string | null
    titleCompany: string | null
    status: string
    finalAmount: number
    notes: string | null
  }[]
}

const BUYER_TYPE_OPTIONS = ['CASH', 'HARD_MONEY', 'CONVENTIONAL', 'PRIVATE', 'INSTITUTIONAL']
const PROPERTY_TYPE_OPTIONS = ['single-family', 'multi-family', 'land', 'commercial', 'condo']
const EXIT_STRATEGY_OPTIONS = ['wholesale', 'flip', 'hold', 'land_flip', 'renegotiate']
const PACKAGE_TYPE_OPTIONS = ['WHOLESALE_ASSIGNMENT', 'LISTING', 'NOVATION', 'DOUBLE_CLOSE']
const STAGE_SEQUENCE = ['CONTRACT_SENT', 'CONTRACT_SIGNED', 'EMD_RECEIVED', 'TITLE_OPENED', 'CLEARED_TO_CLOSE']

type BuyerForm = {
  name: string; entity: string; email: string; phone: string; buyerType: string
  fundingVerified: boolean; fundingCapacity: string; closeSpeedDays: string
  propertyTypes: string[]; exitStrategies: string[]; markets: string; minPrice: string; maxPrice: string; maxCapital: string
}
function emptyBuyerForm(): BuyerForm {
  return {
    name: '', entity: '', email: '', phone: '', buyerType: 'CASH',
    fundingVerified: false, fundingCapacity: '', closeSpeedDays: '',
    propertyTypes: [], exitStrategies: [], markets: '', minPrice: '', maxPrice: '', maxCapital: '',
  }
}

type PackageForm = { packageType: string; askingPrice: string; assignmentFee: string; description: string }
function emptyPackageForm(): PackageForm {
  return { packageType: 'WHOLESALE_ASSIGNMENT', askingPrice: '', assignmentFee: '', description: '' }
}

type ClosingForm = { closingDate: string; titleCompany: string; finalAmount: string }
function emptyClosingForm(): ClosingForm {
  return { closingDate: new Date().toISOString().slice(0, 10), titleCompany: '', finalAmount: '' }
}

function toneForStage(stage: string) {
  if (stage === 'CLEARED_TO_CLOSE') return 'bg-emerald-100 text-emerald-800'
  if (stage === 'CONTRACT_SENT') return 'bg-sky-100 text-sky-800'
  return 'bg-amber-100 text-amber-800'
}

function toneForClosingStatus(status: string) {
  if (status === 'CLOSED') return 'bg-emerald-100 text-emerald-800'
  if (status === 'FELL_THROUGH') return 'bg-red-100 text-red-800'
  return 'bg-sky-100 text-sky-800'
}

export function DispositionCommandCenterClient() {
  const [error, setError] = useState<string | null>(null)

  const [profiles, setProfiles] = useState<BuyerProfilesPayload | null>(null)
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [addBuyerOpen, setAddBuyerOpen] = useState(false)
  const [buyerForm, setBuyerForm] = useState<BuyerForm>(emptyBuyerForm())
  const [buyerSubmitting, setBuyerSubmitting] = useState(false)

  const [matches, setMatches] = useState<BuyerMatchesPayload | null>(null)
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [matchesGenerating, setMatchesGenerating] = useState(false)

  const [deals, setDeals] = useState<DealSummary[]>([])
  const [dealsLoading, setDealsLoading] = useState(true)
  const [packageFormDealId, setPackageFormDealId] = useState<string | null>(null)
  const [packageForm, setPackageForm] = useState<PackageForm>(emptyPackageForm())
  const [packageSubmitting, setPackageSubmitting] = useState(false)

  const [packages, setPackages] = useState<PackagesPayload | null>(null)
  const [packagesLoading, setPackagesLoading] = useState(true)
  const [assigningPackageId, setAssigningPackageId] = useState<string | null>(null)

  const [pipeline, setPipeline] = useState<PipelinePayload | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(true)
  const [closingFormAssignmentId, setClosingFormAssignmentId] = useState<string | null>(null)
  const [closingForm, setClosingForm] = useState<ClosingForm>(emptyClosingForm())
  const [closingSubmitting, setClosingSubmitting] = useState(false)

  const [closings, setClosings] = useState<ClosingsPayload | null>(null)
  const [closingsLoading, setClosingsLoading] = useState(true)

  async function loadProfiles() {
    setProfilesLoading(true)
    const response = await fetch('/api/buyer-profiles?limit=20', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) setProfiles(payload as unknown as BuyerProfilesPayload)
    else if (!error) setError(String(payload.error ?? 'Unable to load buyer profiles.'))
    setProfilesLoading(false)
  }

  async function loadMatches() {
    setMatchesLoading(true)
    const response = await fetch('/api/buyer-matches?limit=20', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) setMatches(payload as unknown as BuyerMatchesPayload)
    else if (!error) setError(String(payload.error ?? 'Unable to load buyer matches.'))
    setMatchesLoading(false)
  }

  async function loadDeals() {
    setDealsLoading(true)
    const response = await fetch('/api/deals', { cache: 'no-store' })
    const payload = await response.json().catch(() => [])
    if (response.ok && Array.isArray(payload)) setDeals(payload as DealSummary[])
    setDealsLoading(false)
  }

  async function loadPackages() {
    setPackagesLoading(true)
    const response = await fetch('/api/disposition-packages?limit=20', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) setPackages(payload as unknown as PackagesPayload)
    else if (!error) setError(String(payload.error ?? 'Unable to load disposition packages.'))
    setPackagesLoading(false)
  }

  async function loadPipeline() {
    setPipelineLoading(true)
    const response = await fetch('/api/assignment-pipeline?limit=20', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) setPipeline(payload as unknown as PipelinePayload)
    else if (!error) setError(String(payload.error ?? 'Unable to load assignment pipeline.'))
    setPipelineLoading(false)
  }

  async function loadClosings() {
    setClosingsLoading(true)
    const response = await fetch('/api/closing-tracker?limit=20', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) setClosings(payload as unknown as ClosingsPayload)
    else if (!error) setError(String(payload.error ?? 'Unable to load closing tracker.'))
    setClosingsLoading(false)
  }

  useEffect(() => {
    void loadProfiles()
    void loadMatches()
    void loadDeals()
    void loadPackages()
    void loadPipeline()
    void loadClosings()
  }, [])

  async function generateMatches() {
    setMatchesGenerating(true)
    const response = await fetch('/api/buyer-matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 'all' }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success(`Generated ${payload.generated ?? 0} buyer matches.`)
      await loadMatches()
    } else {
      toast.error(String(payload.error ?? 'Unable to generate matches.'))
    }
    setMatchesGenerating(false)
  }

  function togglePropertyType(type: string) {
    setBuyerForm((prev) => ({ ...prev, propertyTypes: prev.propertyTypes.includes(type) ? prev.propertyTypes.filter((t) => t !== type) : [...prev.propertyTypes, type] }))
  }

  function toggleExitStrategy(strategy: string) {
    setBuyerForm((prev) => ({ ...prev, exitStrategies: prev.exitStrategies.includes(strategy) ? prev.exitStrategies.filter((s) => s !== strategy) : [...prev.exitStrategies, strategy] }))
  }

  async function submitBuyer() {
    if (!buyerForm.name.trim()) {
      toast.error('Enter the buyer name.')
      return
    }
    setBuyerSubmitting(true)
    const response = await fetch('/api/buyer-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: buyerForm.name.trim(),
        entity: buyerForm.entity.trim() || null,
        email: buyerForm.email.trim() || null,
        phone: buyerForm.phone.trim() || null,
        buyerType: buyerForm.buyerType,
        fundingVerified: buyerForm.fundingVerified,
        fundingCapacity: buyerForm.fundingCapacity ? Number(buyerForm.fundingCapacity) : null,
        closeSpeedDays: buyerForm.closeSpeedDays ? Number(buyerForm.closeSpeedDays) : null,
        criteria: {
          propertyTypes: buyerForm.propertyTypes,
          exitStrategies: buyerForm.exitStrategies,
          markets: buyerForm.markets.split(',').map((item) => item.trim()).filter(Boolean),
          minPrice: buyerForm.minPrice ? Number(buyerForm.minPrice) : null,
          maxPrice: buyerForm.maxPrice ? Number(buyerForm.maxPrice) : null,
          maxCapital: buyerForm.maxCapital ? Number(buyerForm.maxCapital) : null,
        },
      }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success('Buyer profile added.')
      setAddBuyerOpen(false)
      setBuyerForm(emptyBuyerForm())
      await loadProfiles()
    } else {
      toast.error(String(payload.error ?? 'Unable to save buyer profile.'))
    }
    setBuyerSubmitting(false)
  }

  async function submitPackage(dealId: string) {
    setPackageSubmitting(true)
    const response = await fetch('/api/disposition-packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId,
        packageType: packageForm.packageType,
        askingPrice: packageForm.askingPrice ? Number(packageForm.askingPrice) : null,
        assignmentFee: packageForm.assignmentFee ? Number(packageForm.assignmentFee) : null,
        description: packageForm.description.trim() || null,
      }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success('Disposition package created.')
      setPackageFormDealId(null)
      setPackageForm(emptyPackageForm())
      await loadPackages()
    } else {
      toast.error(String(payload.error ?? 'Unable to create package.'))
    }
    setPackageSubmitting(false)
  }

  async function assignBuyer(packageId: string, buyerProfileId: string, buyerMatchId: string | null, assignmentFee: number) {
    const response = await fetch('/api/assignment-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId, buyerProfileId, buyerMatchId, assignmentFee }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success('Assignment created - Deal Pipeline updated.')
      setAssigningPackageId(null)
      await loadPackages()
      await loadMatches()
      await loadPipeline()
    } else {
      toast.error(String(payload.error ?? 'Unable to create assignment.'))
    }
  }

  async function advanceStage(id: string, currentStage: string) {
    const index = STAGE_SEQUENCE.indexOf(currentStage)
    const next = STAGE_SEQUENCE[Math.min(STAGE_SEQUENCE.length - 1, index + 1)]
    const response = await fetch(`/api/assignment-pipeline/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: next }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success(`Advanced to ${next.replace(/_/g, ' ')}.`)
      await loadPipeline()
    } else {
      toast.error(String(payload.error ?? 'Unable to advance stage.'))
    }
  }

  async function submitClosing(assignmentPipelineId: string) {
    setClosingSubmitting(true)
    const response = await fetch('/api/closing-tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentPipelineId,
        closingDate: closingForm.closingDate || null,
        titleCompany: closingForm.titleCompany.trim() || null,
        finalAmount: closingForm.finalAmount ? Number(closingForm.finalAmount) : null,
        status: 'SCHEDULED',
      }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success('Closing scheduled.')
      setClosingFormAssignmentId(null)
      setClosingForm(emptyClosingForm())
      await loadClosings()
    } else {
      toast.error(String(payload.error ?? 'Unable to schedule closing.'))
    }
    setClosingSubmitting(false)
  }

  async function resolveClosing(id: string, status: 'CLOSED' | 'FELL_THROUGH') {
    const response = await fetch(`/api/closing-tracker/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success(status === 'CLOSED' ? 'Deal closed - Deal Pipeline updated.' : 'Closing marked as fell through.')
      await loadClosings()
    } else {
      toast.error(String(payload.error ?? 'Unable to update closing.'))
    }
  }

  const dealsById = new Map(deals.map((deal) => [deal.id, deal]))
  const dispositionableDeals = deals.filter((deal) => deal.decision !== 'KILL' && deal.status !== 'dead' && deal.status !== 'closed')
  const packagedDealIds = new Set((packages?.items ?? []).map((item) => item.dealId))
  const matchesByDeal = new Map<string, BuyerMatchesPayload['items']>()
  for (const match of matches?.items ?? []) {
    const list = matchesByDeal.get(match.dealId) ?? []
    list.push(match)
    matchesByDeal.set(match.dealId, list)
  }

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
      <div className="mb-6 rounded-lg bg-[var(--dynasty-navy)] p-6 text-[#F8F7F2] shadow-lg">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
          <ShoppingBag className="h-3.5 w-3.5" /> Disposition Command Center
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Move every deal to a buyer, exit, or closing.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F8F7F2]/76">
              Match deals to buyers, package them for assignment, track the contract-to-close pipeline, and log final closings.
            </p>
          </div>
          <Button type="button" onClick={generateMatches} loading={matchesGenerating} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
            {matchesGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Generate Matches
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Buyer Profiles</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{profiles?.totalProfiles ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Buyer Matches</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{matches?.totalMatches ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Packages</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{packages?.totalPackages ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Assignments</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{pipeline?.totalPipeline ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-emerald-50 shadow-sm"><CardContent className="p-4"><p className="text-xs text-emerald-700/70">Closed</p><p className="font-display text-2xl font-black text-emerald-800">{closings?.closedCount ?? 0}</p></CardContent></Card>
        <Card className="border-0 bg-[#F8F7F2] shadow-sm"><CardContent className="p-4"><p className="text-xs text-[var(--dynasty-black)]/55">Closed Volume</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{formatCurrency(closings?.totalClosedVolume ?? 0)}</p></CardContent></Card>
      </div>

      {error && <div className="mb-5 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><AlertTriangle className="h-4 w-4" /> {error}</div>}

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <Users className="h-5 w-5 text-[var(--dynasty-gold)]" /> Buyer Profiles
          </CardTitle>
          <Button type="button" variant="ghost" className="h-8 text-xs" onClick={() => setAddBuyerOpen((prev) => !prev)}>{addBuyerOpen ? 'Cancel' : 'Add Buyer'}</Button>
        </CardHeader>
        <CardContent>
          {addBuyerOpen && (
            <div className="mb-4 space-y-2 rounded-lg bg-white/75 p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Input value={buyerForm.name} onChange={(event) => setBuyerForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Buyer name" />
                <Input value={buyerForm.entity} onChange={(event) => setBuyerForm((prev) => ({ ...prev, entity: event.target.value }))} placeholder="Entity (LLC, fund, etc.)" />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input value={buyerForm.email} onChange={(event) => setBuyerForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" />
                <Input value={buyerForm.phone} onChange={(event) => setBuyerForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone" />
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <Select value={buyerForm.buyerType} onValueChange={(value) => setBuyerForm((prev) => ({ ...prev, buyerType: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BUYER_TYPE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" value={buyerForm.fundingCapacity} onChange={(event) => setBuyerForm((prev) => ({ ...prev, fundingCapacity: event.target.value }))} placeholder="Funding capacity" />
                <Input type="number" value={buyerForm.closeSpeedDays} onChange={(event) => setBuyerForm((prev) => ({ ...prev, closeSpeedDays: event.target.value }))} placeholder="Close speed (days)" />
              </div>
              <div>
                <p className="mb-1 text-xs font-bold text-[var(--dynasty-black)]/55">Property types</p>
                <div className="flex flex-wrap gap-1">
                  {PROPERTY_TYPE_OPTIONS.map((type) => (
                    <button key={type} type="button" onClick={() => togglePropertyType(type)} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${buyerForm.propertyTypes.includes(type) ? 'border-[var(--dynasty-gold)] bg-[var(--dynasty-gold)]/20 text-[var(--dynasty-navy)]' : 'border-[var(--dynasty-tan)]/30 text-[var(--dynasty-black)]/50'}`}>{type}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold text-[var(--dynasty-black)]/55">Exit strategies</p>
                <div className="flex flex-wrap gap-1">
                  {EXIT_STRATEGY_OPTIONS.map((strategy) => (
                    <button key={strategy} type="button" onClick={() => toggleExitStrategy(strategy)} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${buyerForm.exitStrategies.includes(strategy) ? 'border-[var(--dynasty-gold)] bg-[var(--dynasty-gold)]/20 text-[var(--dynasty-navy)]' : 'border-[var(--dynasty-tan)]/30 text-[var(--dynasty-black)]/50'}`}>{strategy.replace(/_/g, ' ')}</button>
                  ))}
                </div>
              </div>
              <Input value={buyerForm.markets} onChange={(event) => setBuyerForm((prev) => ({ ...prev, markets: event.target.value }))} placeholder="Markets (cities/states, comma separated)" />
              <div className="grid gap-2 md:grid-cols-3">
                <Input type="number" value={buyerForm.minPrice} onChange={(event) => setBuyerForm((prev) => ({ ...prev, minPrice: event.target.value }))} placeholder="Min price" />
                <Input type="number" value={buyerForm.maxPrice} onChange={(event) => setBuyerForm((prev) => ({ ...prev, maxPrice: event.target.value }))} placeholder="Max price" />
                <Input type="number" value={buyerForm.maxCapital} onChange={(event) => setBuyerForm((prev) => ({ ...prev, maxCapital: event.target.value }))} placeholder="Max deal capital" />
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={submitBuyer} loading={buyerSubmitting} className="h-8 bg-[var(--dynasty-navy)] text-xs text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">Save Buyer</Button>
              </div>
            </div>
          )}

          {profilesLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading buyer profiles...</div>
          ) : (profiles?.items ?? []).length === 0 ? (
            <div className="rounded-lg bg-white/75 p-6 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
              <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No buyer profiles yet.</p>
              <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Add a buyer to start matching deals to exits.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {profiles?.items.map((item) => (
                <div key={item.id} className="rounded-lg bg-white/75 p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{item.buyerType.replace(/_/g, ' ')}</Badge>
                    {item.fundingVerified && <Badge className="border-0 bg-emerald-100 text-emerald-800">Funding Verified</Badge>}
                  </div>
                  <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{item.name}{item.entity ? ` (${item.entity})` : ''}</p>
                  <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{formatCurrency(item.fundingCapacity)} capacity{item.closeSpeedDays ? ` - ${item.closeSpeedDays}d close` : ''}</p>
                  {item.criteria[0] && (
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--dynasty-black)]/50">
                      {item.criteria[0].markets.join(', ') || 'Any market'} - {item.criteria[0].propertyTypes.join(', ') || 'Any type'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <ClipboardList className="h-5 w-5 text-[var(--dynasty-gold)]" /> Buyer Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matchesLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading matches...</div>
          ) : (matches?.items ?? []).length === 0 ? (
            <div className="rounded-lg bg-white/75 p-6 text-center">
              <ClipboardList className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
              <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No matches yet.</p>
              <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Click Generate Matches to score every active deal against every active buyer's criteria.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {matches?.items.map((item) => (
                <div key={item.id} className="rounded-lg bg-white/75 p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge className={`border-0 ${item.matchScore >= 70 ? 'bg-emerald-100 text-emerald-800' : item.matchScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>Score {item.matchScore}</Badge>
                    <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{item.status}</Badge>
                  </div>
                  <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{item.buyerProfile?.name ?? 'Unknown buyer'}</p>
                  <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{item.property?.address}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--dynasty-black)]/50">{item.matchReasons.slice(0, 3).join(' - ')}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <Package className="h-5 w-5 text-[var(--dynasty-gold)]" /> Disposition Packages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dealsLoading || packagesLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading deals and packages...</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--dynasty-black)]/50">Deals ready for a package</p>
                <div className="grid gap-2">
                  {dispositionableDeals.filter((deal) => !packagedDealIds.has(deal.id)).length === 0 ? (
                    <p className="rounded-lg bg-white/75 p-3 text-xs text-[var(--dynasty-black)]/50">No deals waiting on a package.</p>
                  ) : dispositionableDeals.filter((deal) => !packagedDealIds.has(deal.id)).map((deal) => (
                    <div key={deal.id} className="rounded-lg bg-white/75 p-3 shadow-sm">
                      <p className="text-sm font-bold text-[var(--dynasty-navy)]">{deal.address}</p>
                      <p className="text-xs text-[var(--dynasty-black)]/50">{deal.city}, {deal.state} - {deal.status}</p>
                      {packageFormDealId === deal.id ? (
                        <div className="mt-2 space-y-1.5">
                          <Select value={packageForm.packageType} onValueChange={(value) => setPackageForm((prev) => ({ ...prev, packageType: value }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{PACKAGE_TYPE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                          </Select>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Input className="h-8 text-xs" type="number" value={packageForm.askingPrice} onChange={(event) => setPackageForm((prev) => ({ ...prev, askingPrice: event.target.value }))} placeholder="Asking price" />
                            <Input className="h-8 text-xs" type="number" value={packageForm.assignmentFee} onChange={(event) => setPackageForm((prev) => ({ ...prev, assignmentFee: event.target.value }))} placeholder="Assignment fee" />
                          </div>
                          <Textarea className="text-xs" rows={2} value={packageForm.description} onChange={(event) => setPackageForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Marketing description" />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPackageFormDealId(null)} disabled={packageSubmitting}>Cancel</Button>
                            <Button type="button" className="h-7 bg-[var(--dynasty-navy)] px-2 text-xs text-[#F8F7F2] hover:bg-[var(--dynasty-black)]" onClick={() => submitPackage(deal.id)} loading={packageSubmitting}>Create Package</Button>
                          </div>
                        </div>
                      ) : (
                        <Button type="button" variant="ghost" className="mt-2 h-7 w-full px-2 text-xs" onClick={() => { setPackageFormDealId(deal.id); setPackageForm(emptyPackageForm()) }}>Create Package</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--dynasty-black)]/50">Packages ready to assign</p>
                <div className="grid gap-2">
                  {(packages?.items ?? []).length === 0 ? (
                    <p className="rounded-lg bg-white/75 p-3 text-xs text-[var(--dynasty-black)]/50">No packages created yet.</p>
                  ) : packages?.items.map((item) => {
                    const candidateMatches = (matchesByDeal.get(item.dealId) ?? []).slice(0, 3)
                    return (
                      <div key={item.id} className="rounded-lg bg-white/75 p-3 shadow-sm">
                        <div className="mb-1 flex flex-wrap gap-2">
                          <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{item.packageType.replace(/_/g, ' ')}</Badge>
                          <Badge className={`border-0 ${item.status === 'DISTRIBUTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>{item.status}</Badge>
                        </div>
                        <p className="text-sm font-bold text-[var(--dynasty-navy)]">{item.property?.address}</p>
                        <p className="text-xs text-[var(--dynasty-black)]/50">{formatCurrency(item.askingPrice)} asking - {formatCurrency(item.assignmentFee)} fee</p>
                        {item.status !== 'DISTRIBUTED' && (
                          assigningPackageId === item.id ? (
                            <div className="mt-2 space-y-1">
                              {candidateMatches.length === 0 ? (
                                <p className="text-xs text-[var(--dynasty-black)]/50">No buyer matches for this deal yet.</p>
                              ) : candidateMatches.map((match) => (
                                <Button
                                  key={match.id}
                                  type="button"
                                  variant="ghost"
                                  className="h-7 w-full justify-start px-2 text-xs"
                                  onClick={() => assignBuyer(item.id, match.buyerProfileId, match.id, item.assignmentFee)}
                                >
                                  {match.buyerProfile?.name} ({match.matchScore})
                                </Button>
                              ))}
                              <Button type="button" variant="ghost" className="h-7 w-full px-2 text-xs" onClick={() => setAssigningPackageId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button type="button" variant="ghost" className="mt-2 h-7 w-full px-2 text-xs" onClick={() => setAssigningPackageId(item.id)}>Assign to Buyer</Button>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <FileText className="h-5 w-5 text-[var(--dynasty-gold)]" /> Assignment Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading assignment pipeline...</div>
          ) : (pipeline?.items ?? []).length === 0 ? (
            <div className="rounded-lg bg-white/75 p-6 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
              <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No assignments yet.</p>
              <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Assign a package to a buyer above to start the contract-to-close pipeline.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pipeline?.items.map((item) => (
                <div key={item.id} className="rounded-lg bg-white/75 p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge className={`border-0 ${toneForStage(item.stage)}`}>{item.stage.replace(/_/g, ' ')}</Badge>
                    {item.emdReceived && <Badge className="border-0 bg-emerald-100 text-emerald-800">EMD Received</Badge>}
                  </div>
                  <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{item.buyerProfile?.name ?? 'Unknown buyer'}</p>
                  <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{formatCurrency(item.assignmentFee)} fee{item.contractDate ? ` - ${new Date(item.contractDate).toLocaleDateString()}` : ''}</p>

                  {closingFormAssignmentId === item.id ? (
                    <div className="mt-3 space-y-1.5 rounded-md bg-[#F8F7F2] p-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input className="h-8 text-xs" type="date" value={closingForm.closingDate} onChange={(event) => setClosingForm((prev) => ({ ...prev, closingDate: event.target.value }))} />
                        <Input className="h-8 text-xs" type="number" value={closingForm.finalAmount} onChange={(event) => setClosingForm((prev) => ({ ...prev, finalAmount: event.target.value }))} placeholder="Final amount" />
                      </div>
                      <Input className="h-8 text-xs" value={closingForm.titleCompany} onChange={(event) => setClosingForm((prev) => ({ ...prev, titleCompany: event.target.value }))} placeholder="Title company" />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setClosingFormAssignmentId(null)} disabled={closingSubmitting}>Cancel</Button>
                        <Button type="button" className="h-7 bg-[var(--dynasty-navy)] px-2 text-xs text-[#F8F7F2] hover:bg-[var(--dynasty-black)]" onClick={() => submitClosing(item.id)} loading={closingSubmitting}>Schedule Closing</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      {item.stage !== STAGE_SEQUENCE[STAGE_SEQUENCE.length - 1] && (
                        <Button type="button" variant="ghost" className="h-7 flex-1 px-2 text-xs" onClick={() => advanceStage(item.id, item.stage)}>Advance Stage</Button>
                      )}
                      <Button type="button" variant="ghost" className="h-7 flex-1 px-2 text-xs" onClick={() => { setClosingFormAssignmentId(item.id); setClosingForm(emptyClosingForm()) }}>Schedule Closing</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <Wallet className="h-5 w-5 text-[var(--dynasty-gold)]" /> Closing Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          {closingsLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading closings...</div>
          ) : (closings?.items ?? []).length === 0 ? (
            <div className="rounded-lg bg-white/75 p-6 text-center">
              <Wallet className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
              <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No closings scheduled yet.</p>
              <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Schedule a closing from the Assignment Pipeline above.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {closings?.items.map((item) => {
                const deal = dealsById.get(item.dealId)
                return (
                  <div key={item.id} className="rounded-lg bg-white/75 p-4 shadow-sm">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge className={`border-0 ${toneForClosingStatus(item.status)}`}>{item.status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{deal?.address ?? 'Deal'}</p>
                    <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{item.closingDate ? new Date(item.closingDate).toLocaleDateString() : 'No date set'}{item.titleCompany ? ` - ${item.titleCompany}` : ''}</p>
                    <p className="mt-1 text-xs text-[var(--dynasty-black)]/50">{formatCurrency(item.finalAmount)}</p>
                    {item.status === 'SCHEDULED' && (
                      <div className="mt-3 flex gap-2">
                        <Button type="button" variant="ghost" className="h-7 flex-1 px-2 text-xs text-emerald-700" onClick={() => resolveClosing(item.id, 'CLOSED')}><CheckCircle2 className="h-3 w-3" /> Mark Closed</Button>
                        <Button type="button" variant="ghost" className="h-7 flex-1 px-2 text-xs text-red-700" onClick={() => resolveClosing(item.id, 'FELL_THROUGH')}>Fell Through</Button>
                      </div>
                    )}
                    {deal?.propertyId && (
                      <Link href={`/properties/${deal.propertyId}`} className="mt-2 inline-block text-xs font-bold text-[var(--dynasty-navy)] underline-offset-2 hover:underline">
                        <Building2 className="mr-1 inline h-3 w-3" /> View property
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
