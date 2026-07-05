'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, BarChart3, ClipboardList, Download, FileText, Filter, HandCoins, History, Home, Loader2, Mail, MessageSquare, Phone, Radar, RefreshCcw, Search, Send, SkipForward, Target, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, getTypeLabel } from '@/lib/property-utils'
import { getNextBestAction } from '@/lib/portfolio-scoring/next-best-action'

type BiggestAssumptionPayload = {
  kind: 'threshold' | 'price-needed-for-go'
  leverLabel: string | null
  summary: string
} | null

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
  biggestAssumption: BiggestAssumptionPayload
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
    floodZone: string | null
    gisEnrichedAt: string | null
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

type ActivityItemPayload = {
  id: string
  propertyId: string
  eventType: string
  summary: string
  createdAt: string
  address: string | null
  count: number
}

type ActivityPayload = {
  items: ActivityItemPayload[]
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
    recoveredOwnerName: string | null
    confidence: number | null
    sourceUrl: string | null
    researchNotes: string | null
    completedAt: string | null
  }[]
}

type ResearchCompletionForm = {
  ownerName: string
  confidence: string
  sourceUrl: string
  notes: string
}

const emptyCompletionForm: ResearchCompletionForm = { ownerName: '', confidence: '70', sourceUrl: '', notes: '' }

type LeadIntakePayload = {
  totalArtifacts: number
  hotLeads: number
  syncedToDeal: number
  averageMotivation: number
  statuses: { status: string; count: number }[]
  sources: { leadSource: string; count: number }[]
  items: {
    id: string
    propertyId: string
    dealId: string | null
    ownerName: string | null
    contactName: string | null
    phone: string | null
    email: string | null
    contactDate: string | null
    leadSource: string
    motivationScore: number
    askingPrice: number
    occupancyStatus: string | null
    timeline: string | null
    painPoints: string[]
    notes: string | null
    status: string
    property: { address: string; city: string; state: string; zip: string | null } | null
    deal: { decision: string; status: string } | null
  }[]
}

type IntakeForm = {
  ownerName: string
  contactName: string
  phone: string
  email: string
  contactDate: string
  leadSource: string
  askingPrice: string
  occupancyStatus: string
  timeline: string
  painPoints: string[]
  notes: string
}

function emptyIntakeForm(): IntakeForm {
  return {
    ownerName: '',
    contactName: '',
    phone: '',
    email: '',
    contactDate: new Date().toISOString().slice(0, 10),
    leadSource: 'CALL_CAMPAIGN',
    askingPrice: '',
    occupancyStatus: '',
    timeline: '',
    painPoints: [],
    notes: '',
  }
}

const TIMELINE_OPTIONS = ['ASAP', 'WITHIN_30_DAYS', '1_3_MONTHS', '3_6_MONTHS', '6_12_MONTHS', 'NO_RUSH']
const OCCUPANCY_OPTIONS = ['OWNER_OCCUPIED', 'TENANT_OCCUPIED', 'VACANT', 'UNKNOWN']
const PAIN_POINT_OPTIONS = ['FORECLOSURE', 'TAX_LIEN', 'FINANCIAL_HARDSHIP', 'DIVORCE', 'CODE_VIOLATION', 'TIRED_LANDLORD', 'INHERITANCE', 'RELOCATION', 'VACANT_PROPERTY', 'REPAIRS_NEEDED']

type SellerConversationsPayload = {
  totalConversations: number
  types: { conversationType: string; count: number }[]
  items: {
    id: string
    leadIntakeId: string
    propertyId: string
    conversationType: string
    summary: string
    objections: string[]
    motivationChanges: string | null
    nextStep: string | null
    recordedAt: string
    property: { address: string; city: string; state: string; zip: string | null } | null
    leadIntake: { contactName: string | null; motivationScore: number; dealId: string | null } | null
  }[]
}

type SellerFollowupsPayload = {
  totalFollowups: number
  openCount: number
  overdueCount: number
  statuses: { status: string; count: number }[]
  items: {
    id: string
    conversationId: string
    propertyId: string
    followupDate: string
    followupType: string
    assignedTo: string | null
    status: string
    notes: string | null
    property: { address: string; city: string; state: string; zip: string | null } | null
    conversation: { summary: string; conversationType: string } | null
  }[]
}

type SellerOffersPayload = {
  totalOffers: number
  sentCount: number
  acceptedCount: number
  rejectedCount: number
  averageOfferAmount: number
  statuses: { status: string; count: number }[]
  items: {
    id: string
    propertyId: string
    dealId: string
    offerAmount: number
    offerType: string
    sentDate: string | null
    expirationDate: string | null
    status: string
    property: { address: string; city: string; state: string; zip: string | null } | null
    deal: { decision: string; status: string } | null
  }[]
}

type SellerNegotiationsPayload = {
  totalNegotiations: number
  stages: { negotiationStage: string; count: number }[]
  resolutions: { resolution: string | null; count: number }[]
  items: {
    id: string
    offerId: string
    propertyId: string
    counterAmount: number
    sellerResponse: string | null
    negotiationStage: string
    resolution: string | null
    property: { address: string; city: string; state: string; zip: string | null } | null
    offer: { offerAmount: number; status: string } | null
  }[]
}

type ConversationForm = { conversationType: string; summary: string; objections: string; newMotivationScore: string; nextStep: string }
function emptyConversationForm(): ConversationForm {
  return { conversationType: 'CALL', summary: '', objections: '', newMotivationScore: '', nextStep: '' }
}

type OfferForm = { offerAmount: string; offerType: string; sentDate: string; expirationDate: string }
function emptyOfferForm(): OfferForm {
  return { offerAmount: '', offerType: 'CASH', sentDate: new Date().toISOString().slice(0, 10), expirationDate: '' }
}

type FollowupForm = { followupDate: string; followupType: string; assignedTo: string; notes: string }
function emptyFollowupForm(): FollowupForm {
  return { followupDate: new Date().toISOString().slice(0, 10), followupType: 'CALL', assignedTo: '', notes: '' }
}

type NegotiationForm = { counterAmount: string; sellerResponse: string; negotiationStage: string; resolution: string }
function emptyNegotiationForm(): NegotiationForm {
  return { counterAmount: '', sellerResponse: '', negotiationStage: 'OPEN', resolution: '' }
}

const CONVERSATION_TYPE_OPTIONS = ['CALL', 'TEXT', 'EMAIL', 'IN_PERSON']
const OFFER_TYPE_OPTIONS = ['CASH', 'SELLER_FINANCE', 'NOVATION', 'SUBJECT_TO']
const FOLLOWUP_TYPE_OPTIONS = ['CALL', 'TEXT', 'EMAIL', 'VISIT']
const NEGOTIATION_STAGE_OPTIONS = ['OPEN', 'COUNTERED', 'FINAL']
const RESOLUTION_OPTIONS = ['ACCEPTED', 'REJECTED', 'COUNTERED', 'WALKED_AWAY']

function toneForOfferStatus(status: string) {
  if (status === 'ACCEPTED') return 'bg-emerald-100 text-emerald-800'
  if (status === 'REJECTED' || status === 'WITHDRAWN' || status === 'EXPIRED') return 'bg-red-100 text-red-800'
  if (status === 'COUNTERED') return 'bg-amber-100 text-amber-800'
  return 'bg-sky-100 text-sky-800'
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

// Only ever called client-side, after the activity feed loads via useEffect -
// never during the initial (server-rendered) paint, so there's no risk of the
// SSR/CSR clock-skew hydration mismatch a relative-time computation would
// otherwise create.
function relativeTime(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
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
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [completionForm, setCompletionForm] = useState<ResearchCompletionForm>(emptyCompletionForm)
  const [completionSubmitting, setCompletionSubmitting] = useState(false)
  const [leadIntake, setLeadIntake] = useState<LeadIntakePayload | null>(null)
  const [leadIntakeLoading, setLeadIntakeLoading] = useState(true)
  const [intakeFormPropertyId, setIntakeFormPropertyId] = useState<string | null>(null)
  const [intakeForm, setIntakeForm] = useState<IntakeForm>(emptyIntakeForm())
  const [intakeSubmitting, setIntakeSubmitting] = useState(false)

  const [conversations, setConversations] = useState<SellerConversationsPayload | null>(null)
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [conversationFormLeadId, setConversationFormLeadId] = useState<string | null>(null)
  const [conversationForm, setConversationForm] = useState<ConversationForm>(emptyConversationForm())
  const [conversationSubmitting, setConversationSubmitting] = useState(false)

  const [followups, setFollowups] = useState<SellerFollowupsPayload | null>(null)
  const [followupsLoading, setFollowupsLoading] = useState(true)
  const [followupFormConversationId, setFollowupFormConversationId] = useState<string | null>(null)
  const [followupForm, setFollowupForm] = useState<FollowupForm>(emptyFollowupForm())
  const [followupSubmitting, setFollowupSubmitting] = useState(false)

  const [offers, setOffers] = useState<SellerOffersPayload | null>(null)
  const [offersLoading, setOffersLoading] = useState(true)
  const [offerFormDealId, setOfferFormDealId] = useState<string | null>(null)
  const [offerForm, setOfferForm] = useState<OfferForm>(emptyOfferForm())
  const [offerSubmitting, setOfferSubmitting] = useState(false)

  const [negotiations, setNegotiations] = useState<SellerNegotiationsPayload | null>(null)
  const [negotiationsLoading, setNegotiationsLoading] = useState(true)

  const [activity, setActivity] = useState<ActivityPayload | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [negotiationFormOfferId, setNegotiationFormOfferId] = useState<string | null>(null)
  const [negotiationForm, setNegotiationForm] = useState<NegotiationForm>(emptyNegotiationForm())
  const [negotiationSubmitting, setNegotiationSubmitting] = useState(false)

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

  const loadScores = useCallback(async () => {
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
  }, [queryString])

  const loadQueue = useCallback(async () => {
    setQueueLoading(true)
    const response = await fetch('/api/lead-action-queue?limit=180', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setQueue(payload as unknown as QueuePayload)
    } else {
      setError(prev => prev ?? String(payload.error ?? 'Unable to load lead action queue.'))
    }
    setQueueLoading(false)
  }, [])

  const loadCampaigns = useCallback(async () => {
    setCampaignLoading(true)
    const response = await fetch('/api/campaign-batches?limit=10', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setCampaigns(payload as unknown as CampaignPayload)
    } else {
      setError(prev => prev ?? String(payload.error ?? 'Unable to load campaign batches.'))
    }
    setCampaignLoading(false)
  }, [])

  const loadActivity = useCallback(async () => {
    setActivityLoading(true)
    const response = await fetch('/api/property-activity', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setActivity(payload as unknown as ActivityPayload)
    } else {
      setError(prev => prev ?? String(payload.error ?? 'Unable to load recent activity.'))
    }
    setActivityLoading(false)
  }, [])

  const loadOwners = useCallback(async () => {
    setOwnerLoading(true)
    const response = await fetch('/api/owner-intelligence?limit=8', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setOwners(payload as unknown as OwnerIntelligencePayload)
    } else {
      setError(prev => prev ?? String(payload.error ?? 'Unable to load owner intelligence.'))
    }
    setOwnerLoading(false)
  }, [])

  const loadSkipTrace = useCallback(async () => {
    setSkipTraceLoading(true)
    const response = await fetch('/api/skip-trace-export-queue?limit=8', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setSkipTrace(payload as unknown as SkipTracePayload)
    } else {
      setError(prev => prev ?? String(payload.error ?? 'Unable to load skip trace export queue.'))
    }
    setSkipTraceLoading(false)
  }, [])

  const loadOwnershipResearch = useCallback(async () => {
    setOwnershipResearchLoading(true)
    const response = await fetch('/api/ownership-research-tasks?limit=8', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setOwnershipResearch(payload as unknown as OwnershipResearchPayload)
    } else {
      setError(prev => prev ?? String(payload.error ?? 'Unable to load ownership research tasks.'))
    }
    setOwnershipResearchLoading(false)
  }, [])

  const loadLeadIntake = useCallback(async () => {
    setLeadIntakeLoading(true)
    const response = await fetch('/api/lead-intake-artifacts?limit=8', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setLeadIntake(payload as unknown as LeadIntakePayload)
    } else {
      setError(prev => prev ?? String(payload.error ?? 'Unable to load lead intake artifacts.'))
    }
    setLeadIntakeLoading(false)
  }, [])

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true)
    const response = await fetch('/api/seller-conversations?limit=8', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setConversations(payload as unknown as SellerConversationsPayload)
    } else {
      setError(prev => prev ?? String(payload.error ?? 'Unable to load seller conversations.'))
    }
    setConversationsLoading(false)
  }, [])

  const loadFollowups = useCallback(async () => {
    setFollowupsLoading(true)
    const response = await fetch('/api/seller-followups?limit=8', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setFollowups(payload as unknown as SellerFollowupsPayload)
    } else {
      setError(prev => prev ?? String(payload.error ?? 'Unable to load seller follow-ups.'))
    }
    setFollowupsLoading(false)
  }, [])

  const loadOffers = useCallback(async () => {
    setOffersLoading(true)
    const response = await fetch('/api/seller-offers?limit=8', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setOffers(payload as unknown as SellerOffersPayload)
    } else {
      setError(prev => prev ?? String(payload.error ?? 'Unable to load seller offers.'))
    }
    setOffersLoading(false)
  }, [])

  const loadNegotiations = useCallback(async () => {
    setNegotiationsLoading(true)
    const response = await fetch('/api/seller-negotiations?limit=8', { cache: 'no-store' })
    const payload = await safeJson(response)
    if (response.ok) {
      setNegotiations(payload as unknown as SellerNegotiationsPayload)
    } else {
      setError(prev => prev ?? String(payload.error ?? 'Unable to load seller negotiations.'))
    }
    setNegotiationsLoading(false)
  }, [])

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

  function openCompletion(taskId: string) {
    setCompletingTaskId(taskId)
    setCompletionForm(emptyCompletionForm)
  }

  function closeCompletion() {
    setCompletingTaskId(null)
    setCompletionForm(emptyCompletionForm)
  }

  async function submitCompletion(taskId: string) {
    if (!completionForm.ownerName.trim()) {
      toast.error('Enter the recovered owner name or entity.')
      return
    }
    setCompletionSubmitting(true)
    const response = await fetch(`/api/ownership-research-tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerName: completionForm.ownerName.trim(),
        confidence: Number(completionForm.confidence) || 0,
        sourceUrl: completionForm.sourceUrl.trim() || null,
        notes: completionForm.notes.trim() || null,
      }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success('Owner promoted to Owner Intelligence and Skip Trace Queue.')
      closeCompletion()
      await loadOwnershipResearch()
      await loadOwners()
      await loadSkipTrace()
    } else {
      toast.error(String(payload.error ?? 'Unable to save research completion.'))
    }
    setCompletionSubmitting(false)
  }

  function openIntakeForm(propertyId: string) {
    setIntakeFormPropertyId(propertyId)
    setIntakeForm(emptyIntakeForm())
  }

  function closeIntakeForm() {
    setIntakeFormPropertyId(null)
    setIntakeForm(emptyIntakeForm())
  }

  function togglePainPoint(point: string) {
    setIntakeForm((prev) => ({
      ...prev,
      painPoints: prev.painPoints.includes(point)
        ? prev.painPoints.filter((item) => item !== point)
        : [...prev.painPoints, point],
    }))
  }

  async function submitIntake(propertyId: string) {
    if (!intakeForm.contactName.trim()) {
      toast.error('Enter who you spoke with.')
      return
    }
    setIntakeSubmitting(true)
    const response = await fetch('/api/lead-intake-artifacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId,
        ownerName: intakeForm.ownerName.trim() || null,
        contactName: intakeForm.contactName.trim(),
        phone: intakeForm.phone.trim() || null,
        email: intakeForm.email.trim() || null,
        contactDate: intakeForm.contactDate || null,
        leadSource: intakeForm.leadSource,
        askingPrice: intakeForm.askingPrice ? Number(intakeForm.askingPrice) : null,
        occupancyStatus: intakeForm.occupancyStatus || null,
        timeline: intakeForm.timeline || null,
        painPoints: intakeForm.painPoints,
        notes: intakeForm.notes.trim() || null,
      }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success(`Motivation scored ${payload.decision ?? ''} - synced to Deal Pipeline.`)
      closeIntakeForm()
      await loadLeadIntake()
      await loadScores()
    } else {
      toast.error(String(payload.error ?? 'Unable to save lead intake.'))
    }
    setIntakeSubmitting(false)
  }

  function openConversationForm(leadIntakeId: string) {
    setConversationFormLeadId(leadIntakeId)
    setConversationForm(emptyConversationForm())
  }

  function closeConversationForm() {
    setConversationFormLeadId(null)
    setConversationForm(emptyConversationForm())
  }

  async function submitConversation(leadIntakeId: string) {
    if (!conversationForm.summary.trim()) {
      toast.error('Summarize what the seller said.')
      return
    }
    setConversationSubmitting(true)
    const response = await fetch('/api/seller-conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadIntakeId,
        conversationType: conversationForm.conversationType,
        summary: conversationForm.summary.trim(),
        objections: conversationForm.objections.split(',').map((item) => item.trim()).filter(Boolean),
        newMotivationScore: conversationForm.newMotivationScore ? Number(conversationForm.newMotivationScore) : null,
        nextStep: conversationForm.nextStep.trim() || null,
      }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success('Conversation logged to seller CRM history.')
      closeConversationForm()
      await loadConversations()
      await loadLeadIntake()
    } else {
      toast.error(String(payload.error ?? 'Unable to save conversation.'))
    }
    setConversationSubmitting(false)
  }

  function openFollowupForm(conversationId: string) {
    setFollowupFormConversationId(conversationId)
    setFollowupForm(emptyFollowupForm())
  }

  function closeFollowupForm() {
    setFollowupFormConversationId(null)
    setFollowupForm(emptyFollowupForm())
  }

  async function submitFollowup(conversationId: string) {
    setFollowupSubmitting(true)
    const response = await fetch('/api/seller-followups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        followupDate: followupForm.followupDate,
        followupType: followupForm.followupType,
        assignedTo: followupForm.assignedTo.trim() || null,
        notes: followupForm.notes.trim() || null,
      }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success('Follow-up scheduled.')
      closeFollowupForm()
      await loadFollowups()
    } else {
      toast.error(String(payload.error ?? 'Unable to schedule follow-up.'))
    }
    setFollowupSubmitting(false)
  }

  async function markFollowupDone(id: string) {
    const response = await fetch(`/api/seller-followups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success('Follow-up marked done.')
      await loadFollowups()
    } else {
      toast.error(String(payload.error ?? 'Unable to update follow-up.'))
    }
  }

  function openOfferForm(dealId: string) {
    setOfferFormDealId(dealId)
    setOfferForm(emptyOfferForm())
  }

  function closeOfferForm() {
    setOfferFormDealId(null)
    setOfferForm(emptyOfferForm())
  }

  async function submitOffer(propertyId: string, dealId: string) {
    const amount = Number(offerForm.offerAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid offer amount.')
      return
    }
    setOfferSubmitting(true)
    const response = await fetch('/api/seller-offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId,
        dealId,
        offerAmount: amount,
        offerType: offerForm.offerType,
        sentDate: offerForm.sentDate || null,
        expirationDate: offerForm.expirationDate || null,
        status: 'SENT',
      }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success('Offer sent - Deal Pipeline updated.')
      closeOfferForm()
      await loadOffers()
      await loadLeadIntake()
    } else {
      toast.error(String(payload.error ?? 'Unable to save offer.'))
    }
    setOfferSubmitting(false)
  }

  function openNegotiationForm(offerId: string) {
    setNegotiationFormOfferId(offerId)
    setNegotiationForm(emptyNegotiationForm())
  }

  function closeNegotiationForm() {
    setNegotiationFormOfferId(null)
    setNegotiationForm(emptyNegotiationForm())
  }

  async function submitNegotiation(offerId: string) {
    setNegotiationSubmitting(true)
    const response = await fetch('/api/seller-negotiations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId,
        counterAmount: negotiationForm.counterAmount ? Number(negotiationForm.counterAmount) : null,
        sellerResponse: negotiationForm.sellerResponse.trim() || null,
        negotiationStage: negotiationForm.negotiationStage,
        resolution: negotiationForm.resolution || null,
      }),
    })
    const payload = await safeJson(response)
    if (response.ok) {
      toast.success('Negotiation logged - Deal Pipeline updated.')
      closeNegotiationForm()
      await loadNegotiations()
      await loadOffers()
    } else {
      toast.error(String(payload.error ?? 'Unable to save negotiation.'))
    }
    setNegotiationSubmitting(false)
  }

  useEffect(() => {
    void loadScores()
  }, [loadScores])

  useEffect(() => {
    void loadQueue()
    void loadCampaigns()
    void loadOwners()
    void loadSkipTrace()
    void loadOwnershipResearch()
    void loadLeadIntake()
    void loadConversations()
    void loadFollowups()
    void loadOffers()
    void loadNegotiations()
    void loadActivity()
  }, [loadQueue, loadCampaigns, loadOwners, loadSkipTrace, loadOwnershipResearch, loadLeadIntake, loadConversations, loadFollowups, loadOffers, loadNegotiations, loadActivity])

  const buckets = summary?.buckets ?? []
  const decisions = summary?.decisions ?? []
  const scores = summary?.scores ?? []
  // Already ordered by dealScore desc from the API - a KILL decision means
  // ATLAS has already resolved the question, so it doesn't belong in a
  // "what should I look at first" queue even if its dealScore is high enough
  // to otherwise rank near the top.
  const topPriorityScores = scores.filter((score) => score.decision !== 'KILL').slice(0, 20)
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
            <Target className="h-5 w-5 text-[var(--dynasty-gold)]" /> Top {topPriorityScores.length} to review today
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading priority queue...</div>
          ) : topPriorityScores.length === 0 ? (
            <div className="rounded-lg bg-white/75 p-6 text-center">
              <Target className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
              <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">Nothing to review yet.</p>
              <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Run scoring to generate a ranked review queue.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topPriorityScores.map((score, index) => {
                const nextAction = getNextBestAction({
                  decision: score.decision,
                  hasVerifiedPurchasePrice: (score.property?.purchasePrice ?? 0) > 0,
                  floodZone: score.property?.floodZone ?? null,
                  gisEnrichedAt: score.property?.gisEnrichedAt ?? null,
                })
                return (
                <Link key={score.id} href={`/properties/${score.propertyId}`} className="block rounded-lg bg-white/75 p-3 shadow-sm transition hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--dynasty-navy)] font-display text-sm font-black text-[var(--dynasty-gold)]">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-[var(--dynasty-navy)]">{score.property?.address ?? 'Unknown property'}</p>
                        <Badge className={`border-0 text-[10px] ${toneForDecision(score.decision)}`}>{score.decision}</Badge>
                        <Badge className="border-0 bg-[var(--dynasty-tan)]/22 text-[10px] text-[var(--dynasty-navy)]">{score.strategy}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--dynasty-black)]/55">{score.property?.city}, {score.property?.state} - Deal score {score.dealScore}</p>
                      {score.reasons.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {score.reasons.map((reason, reasonIndex) => (
                            <li key={reasonIndex} className="text-xs leading-relaxed text-[var(--dynasty-black)]/60">- {reason}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2 rounded-md bg-[var(--dynasty-gold)]/12 px-2.5 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--dynasty-gold)]">Next best action</p>
                        <p className="mt-0.5 text-xs font-bold text-[var(--dynasty-navy)]">{nextAction.action}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--dynasty-black)]/60">{nextAction.rationale}</p>
                      </div>
                      {score.biggestAssumption && (
                        <div className="mt-2 rounded-md bg-sky-50 px-2.5 py-2 ring-1 ring-sky-100">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-700">
                            {score.biggestAssumption.kind === 'threshold' ? 'Biggest assumption' : 'Price needed for GO'}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-[var(--dynasty-black)]/65">{score.biggestAssumption.summary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <History className="h-5 w-5 text-[var(--dynasty-gold)]" /> Recent changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading recent changes...</div>
          ) : (activity?.items.length ?? 0) === 0 ? (
            <p className="rounded-lg bg-white/75 px-3 py-3 text-sm text-[var(--dynasty-black)]/60">Nothing has changed since the portfolio was last scored or enriched.</p>
          ) : (
            <div className="divide-y divide-[var(--dynasty-tan)]/20">
              {activity!.items.map((item) => {
                const body = (
                  <div className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      {item.address && <p className="truncate text-xs font-bold text-[var(--dynasty-navy)]">{item.address}</p>}
                      <p className="mt-0.5 text-sm text-[var(--dynasty-black)]/70">{item.summary}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-[var(--dynasty-black)]/40">{relativeTime(item.createdAt)}</span>
                  </div>
                )
                return item.propertyId ? (
                  <Link key={item.id} href={`/properties/${item.propertyId}`} className="block px-1 transition hover:bg-white/60">{body}</Link>
                ) : (
                  <div key={item.id} className="px-1">{body}</div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
                        <div key={item.id} className="rounded-md border border-[var(--dynasty-tan)]/20 bg-[#F8F7F2] p-2 transition hover:border-[var(--dynasty-gold)]/70">
                          <Link href={`/properties/${item.propertyId}`} className="block">
                            <p className="truncate text-sm font-bold text-[var(--dynasty-navy)]">{item.property?.address ?? 'Unknown property'}</p>
                            <p className="mt-1 text-xs text-[var(--dynasty-black)]/55">{item.property?.city}, {item.property?.state} - Score {item.dealScore?.dealScore ?? 0}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-[var(--dynasty-black)]/50">{item.reason}</p>
                          </Link>
                          {section.type === 'CALL_NOW' && (
                            intakeFormPropertyId === item.propertyId ? (
                              <div className="mt-2 space-y-1.5 rounded-md bg-white/80 p-2">
                                <Input className="h-8 text-xs" value={intakeForm.ownerName} onChange={(event) => setIntakeForm((prev) => ({ ...prev, ownerName: event.target.value }))} placeholder="Owner name / entity" />
                                <Input className="h-8 text-xs" value={intakeForm.contactName} onChange={(event) => setIntakeForm((prev) => ({ ...prev, contactName: event.target.value }))} placeholder="Who you spoke with" />
                                <div className="grid grid-cols-2 gap-1.5">
                                  <Input className="h-8 text-xs" value={intakeForm.phone} onChange={(event) => setIntakeForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone" />
                                  <Input className="h-8 text-xs" value={intakeForm.email} onChange={(event) => setIntakeForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" />
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <Input className="h-8 text-xs" type="date" value={intakeForm.contactDate} onChange={(event) => setIntakeForm((prev) => ({ ...prev, contactDate: event.target.value }))} />
                                  <Input className="h-8 text-xs" type="number" value={intakeForm.askingPrice} onChange={(event) => setIntakeForm((prev) => ({ ...prev, askingPrice: event.target.value }))} placeholder="Asking price" />
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <Select value={intakeForm.timeline} onValueChange={(value) => setIntakeForm((prev) => ({ ...prev, timeline: value }))}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Timeline" /></SelectTrigger>
                                    <SelectContent>
                                      {TIMELINE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option.replace(/_/g, ' ')}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <Select value={intakeForm.occupancyStatus} onValueChange={(value) => setIntakeForm((prev) => ({ ...prev, occupancyStatus: value }))}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Occupancy" /></SelectTrigger>
                                    <SelectContent>
                                      {OCCUPANCY_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option.replace(/_/g, ' ')}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {PAIN_POINT_OPTIONS.map((point) => (
                                    <button
                                      key={point}
                                      type="button"
                                      onClick={() => togglePainPoint(point)}
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${intakeForm.painPoints.includes(point) ? 'border-[var(--dynasty-gold)] bg-[var(--dynasty-gold)]/20 text-[var(--dynasty-navy)]' : 'border-[var(--dynasty-tan)]/30 text-[var(--dynasty-black)]/50'}`}
                                    >
                                      {point.replace(/_/g, ' ')}
                                    </button>
                                  ))}
                                </div>
                                <Textarea className="text-xs" rows={2} value={intakeForm.notes} onChange={(event) => setIntakeForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Call notes" />
                                <div className="flex justify-end gap-2">
                                  <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={closeIntakeForm} disabled={intakeSubmitting}>Cancel</Button>
                                  <Button type="button" className="h-7 bg-[var(--dynasty-navy)] px-2 text-xs text-[#F8F7F2] hover:bg-[var(--dynasty-black)]" onClick={() => submitIntake(item.propertyId)} loading={intakeSubmitting}>
                                    Save &amp; Sync
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button type="button" variant="ghost" className="mt-2 h-7 w-full px-2 text-xs" onClick={() => openIntakeForm(item.propertyId)}>
                                <Phone className="h-3 w-3" /> Log Call
                              </Button>
                            )
                          )}
                        </div>
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
            <Phone className="h-5 w-5 text-[var(--dynasty-gold)]" /> Deal Intake
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leadIntakeLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading seller conversations...</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="grid gap-2">
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">Hot Leads (65+)</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{leadIntake?.hotLeads ?? 0}</p></div>
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">Synced to Deal Pipeline</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{leadIntake?.syncedToDeal ?? 0}</p></div>
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">Avg Motivation</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{leadIntake?.averageMotivation ?? 0}</p></div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(leadIntake?.items ?? []).length === 0 ? (
                  <div className="rounded-lg bg-white/75 p-6 text-center md:col-span-2">
                    <Phone className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
                    <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No seller conversations logged yet.</p>
                    <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Log a call from the Call Now lane above to capture motivation and sync it into the Deal Pipeline.</p>
                  </div>
                ) : leadIntake?.items.map((item) => (
                  <div key={item.id} className="rounded-lg bg-white/75 p-4 shadow-sm transition hover:shadow-md">
                    <Link href={`/properties/${item.propertyId}`} className="block">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">Motivation {item.motivationScore}</Badge>
                        {item.deal && <Badge className={`border-0 ${toneForDecision(item.deal.decision)}`}>{item.deal.decision}</Badge>}
                      </div>
                      <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{item.contactName ?? 'Unknown contact'}</p>
                      <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{item.property?.address}</p>
                      <p className="mt-2 line-clamp-2 text-xs text-[var(--dynasty-black)]/50">{item.timeline ? item.timeline.replace(/_/g, ' ') : 'No timeline'} - {item.occupancyStatus ?? 'Occupancy unknown'}</p>
                    </Link>

                    {conversationFormLeadId === item.id ? (
                      <div className="mt-3 space-y-1.5 rounded-md bg-[#F8F7F2] p-2">
                        <Select value={conversationForm.conversationType} onValueChange={(value) => setConversationForm((prev) => ({ ...prev, conversationType: value }))}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CONVERSATION_TYPE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option.replace(/_/g, ' ')}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Textarea className="text-xs" rows={2} value={conversationForm.summary} onChange={(event) => setConversationForm((prev) => ({ ...prev, summary: event.target.value }))} placeholder="What did the seller say?" />
                        <Input className="h-8 text-xs" value={conversationForm.objections} onChange={(event) => setConversationForm((prev) => ({ ...prev, objections: event.target.value }))} placeholder="Objections (comma separated)" />
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input className="h-8 text-xs" type="number" min={0} max={100} value={conversationForm.newMotivationScore} onChange={(event) => setConversationForm((prev) => ({ ...prev, newMotivationScore: event.target.value }))} placeholder="Updated motivation" />
                          <Input className="h-8 text-xs" value={conversationForm.nextStep} onChange={(event) => setConversationForm((prev) => ({ ...prev, nextStep: event.target.value }))} placeholder="Next step" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={closeConversationForm} disabled={conversationSubmitting}>Cancel</Button>
                          <Button type="button" className="h-7 bg-[var(--dynasty-navy)] px-2 text-xs text-[#F8F7F2] hover:bg-[var(--dynasty-black)]" onClick={() => submitConversation(item.id)} loading={conversationSubmitting}>Log Conversation</Button>
                        </div>
                      </div>
                    ) : item.dealId && offerFormDealId === item.dealId ? (
                      <div className="mt-3 space-y-1.5 rounded-md bg-[#F8F7F2] p-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input className="h-8 text-xs" type="number" value={offerForm.offerAmount} onChange={(event) => setOfferForm((prev) => ({ ...prev, offerAmount: event.target.value }))} placeholder="Offer amount" />
                          <Select value={offerForm.offerType} onValueChange={(value) => setOfferForm((prev) => ({ ...prev, offerType: value }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {OFFER_TYPE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option.replace(/_/g, ' ')}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input className="h-8 text-xs" type="date" value={offerForm.sentDate} onChange={(event) => setOfferForm((prev) => ({ ...prev, sentDate: event.target.value }))} />
                          <Input className="h-8 text-xs" type="date" value={offerForm.expirationDate} onChange={(event) => setOfferForm((prev) => ({ ...prev, expirationDate: event.target.value }))} placeholder="Expires" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={closeOfferForm} disabled={offerSubmitting}>Cancel</Button>
                          <Button type="button" className="h-7 bg-[var(--dynasty-navy)] px-2 text-xs text-[#F8F7F2] hover:bg-[var(--dynasty-black)]" onClick={() => submitOffer(item.propertyId, item.dealId as string)} loading={offerSubmitting}>Send Offer</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <Button type="button" variant="ghost" className="h-7 flex-1 px-2 text-xs" onClick={() => openConversationForm(item.id)}>Log Conversation</Button>
                        {item.dealId && (
                          <Button type="button" variant="ghost" className="h-7 flex-1 px-2 text-xs" onClick={() => openOfferForm(item.dealId as string)}>Send Offer</Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <MessageSquare className="h-5 w-5 text-[var(--dynasty-gold)]" /> Seller Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversationsLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading conversation history...</div>
          ) : (conversations?.items ?? []).length === 0 ? (
            <div className="rounded-lg bg-white/75 p-6 text-center">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
              <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No conversations logged yet.</p>
              <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Log a conversation from a Deal Intake card above to start the permanent CRM history.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {conversations?.items.map((item) => (
                <div key={item.id} className="rounded-lg bg-white/75 p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{item.conversationType}</Badge>
                    <span className="text-xs text-[var(--dynasty-black)]/45">{new Date(item.recordedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{item.leadIntake?.contactName ?? 'Unknown contact'}</p>
                  <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{item.property?.address}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--dynasty-black)]/50">{item.summary}</p>
                  {item.motivationChanges && <p className="mt-1 text-xs font-semibold text-[var(--dynasty-navy)]">{item.motivationChanges}</p>}
                  {item.nextStep && <p className="mt-1 text-xs text-[var(--dynasty-black)]/50">Next: {item.nextStep}</p>}

                  {followupFormConversationId === item.id ? (
                    <div className="mt-3 space-y-1.5 rounded-md bg-[#F8F7F2] p-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input className="h-8 text-xs" type="date" value={followupForm.followupDate} onChange={(event) => setFollowupForm((prev) => ({ ...prev, followupDate: event.target.value }))} />
                        <Select value={followupForm.followupType} onValueChange={(value) => setFollowupForm((prev) => ({ ...prev, followupType: value }))}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FOLLOWUP_TYPE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option.replace(/_/g, ' ')}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input className="h-8 text-xs" value={followupForm.assignedTo} onChange={(event) => setFollowupForm((prev) => ({ ...prev, assignedTo: event.target.value }))} placeholder="Assigned to" />
                      <Textarea className="text-xs" rows={2} value={followupForm.notes} onChange={(event) => setFollowupForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes" />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={closeFollowupForm} disabled={followupSubmitting}>Cancel</Button>
                        <Button type="button" className="h-7 bg-[var(--dynasty-navy)] px-2 text-xs text-[#F8F7F2] hover:bg-[var(--dynasty-black)]" onClick={() => submitFollowup(item.id)} loading={followupSubmitting}>Schedule</Button>
                      </div>
                    </div>
                  ) : (
                    <Button type="button" variant="ghost" className="mt-3 h-7 w-full px-2 text-xs" onClick={() => openFollowupForm(item.id)}>Schedule Follow-Up</Button>
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
            <ClipboardList className="h-5 w-5 text-[var(--dynasty-gold)]" /> Seller Follow-Ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {followupsLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading task engine...</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
              <div className="grid gap-2">
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">Open Tasks</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{followups?.openCount ?? 0}</p></div>
                <div className="rounded-lg bg-red-50 p-3 shadow-sm"><p className="text-xs text-red-700/70">Overdue</p><p className="font-display text-2xl font-black text-red-800">{followups?.overdueCount ?? 0}</p></div>
              </div>
              <div className="grid gap-2">
                {(followups?.items ?? []).length === 0 ? (
                  <div className="rounded-lg bg-white/75 p-6 text-center">
                    <ClipboardList className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
                    <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No follow-ups scheduled.</p>
                    <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Schedule a follow-up from a conversation above to build the task queue.</p>
                  </div>
                ) : followups?.items.map((item) => {
                  const overdue = item.status === 'OPEN' && new Date(item.followupDate).getTime() < Date.now()
                  return (
                    <div key={item.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 shadow-sm ${overdue ? 'bg-red-50' : 'bg-white/75'}`}>
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{item.followupType}</Badge>
                          <Badge className={`border-0 ${item.status === 'DONE' ? 'bg-emerald-100 text-emerald-800' : overdue ? 'bg-red-100 text-red-800' : 'bg-sky-100 text-sky-800'}`}>{item.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm font-bold text-[var(--dynasty-navy)]">{item.property?.address}</p>
                        <p className="text-xs text-[var(--dynasty-black)]/50">{new Date(item.followupDate).toLocaleDateString()}{item.assignedTo ? ` - ${item.assignedTo}` : ''}</p>
                      </div>
                      {item.status === 'OPEN' && (
                        <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={() => markFollowupDone(item.id)}>Mark Done</Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <HandCoins className="h-5 w-5 text-[var(--dynasty-gold)]" /> Seller Offers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {offersLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading offers...</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
              <div className="grid gap-2">
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">Sent</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{offers?.sentCount ?? 0}</p></div>
                <div className="rounded-lg bg-emerald-50 p-3 shadow-sm"><p className="text-xs text-emerald-700/70">Accepted</p><p className="font-display text-2xl font-black text-emerald-800">{offers?.acceptedCount ?? 0}</p></div>
                <div className="rounded-lg bg-red-50 p-3 shadow-sm"><p className="text-xs text-red-700/70">Rejected</p><p className="font-display text-2xl font-black text-red-800">{offers?.rejectedCount ?? 0}</p></div>
                <div className="rounded-lg bg-white/75 p-3 shadow-sm"><p className="text-xs text-[var(--dynasty-black)]/55">Avg Offer</p><p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{formatCurrency(offers?.averageOfferAmount ?? 0)}</p></div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(offers?.items ?? []).length === 0 ? (
                  <div className="rounded-lg bg-white/75 p-6 text-center md:col-span-2">
                    <HandCoins className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
                    <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No offers sent yet.</p>
                    <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Send an offer from a Deal Intake card above to make acquisition measurable.</p>
                  </div>
                ) : offers?.items.map((item) => (
                  <div key={item.id} className="rounded-lg bg-white/75 p-4 shadow-sm">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge className={`border-0 ${toneForOfferStatus(item.status)}`}>{item.status}</Badge>
                      <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{item.offerType.replace(/_/g, ' ')}</Badge>
                    </div>
                    <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{formatCurrency(item.offerAmount)}</p>
                    <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{item.property?.address}</p>
                    <p className="mt-2 text-xs text-[var(--dynasty-black)]/50">{item.sentDate ? `Sent ${new Date(item.sentDate).toLocaleDateString()}` : 'Not yet sent'}{item.expirationDate ? ` - Expires ${new Date(item.expirationDate).toLocaleDateString()}` : ''}</p>

                    {negotiationFormOfferId === item.id ? (
                      <div className="mt-3 space-y-1.5 rounded-md bg-[#F8F7F2] p-2">
                        <Input className="h-8 text-xs" type="number" value={negotiationForm.counterAmount} onChange={(event) => setNegotiationForm((prev) => ({ ...prev, counterAmount: event.target.value }))} placeholder="Counter amount" />
                        <Textarea className="text-xs" rows={2} value={negotiationForm.sellerResponse} onChange={(event) => setNegotiationForm((prev) => ({ ...prev, sellerResponse: event.target.value }))} placeholder="Seller response" />
                        <div className="grid grid-cols-2 gap-1.5">
                          <Select value={negotiationForm.negotiationStage} onValueChange={(value) => setNegotiationForm((prev) => ({ ...prev, negotiationStage: value }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {NEGOTIATION_STAGE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={negotiationForm.resolution} onValueChange={(value) => setNegotiationForm((prev) => ({ ...prev, resolution: value }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Resolution" /></SelectTrigger>
                            <SelectContent>
                              {RESOLUTION_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option.replace(/_/g, ' ')}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={closeNegotiationForm} disabled={negotiationSubmitting}>Cancel</Button>
                          <Button type="button" className="h-7 bg-[var(--dynasty-navy)] px-2 text-xs text-[#F8F7F2] hover:bg-[var(--dynasty-black)]" onClick={() => submitNegotiation(item.id)} loading={negotiationSubmitting}>Log Negotiation</Button>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" variant="ghost" className="mt-3 h-7 w-full px-2 text-xs" onClick={() => openNegotiationForm(item.id)}>Log Negotiation</Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5 border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl text-[var(--dynasty-navy)]">
            <AlertTriangle className="h-5 w-5 text-[var(--dynasty-gold)]" /> Seller Negotiations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {negotiationsLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/75 p-4 text-sm text-[var(--dynasty-black)]/55"><Loader2 className="h-4 w-4 animate-spin" /> Loading negotiation history...</div>
          ) : (negotiations?.items ?? []).length === 0 ? (
            <div className="rounded-lg bg-white/75 p-6 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" />
              <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">No negotiations logged yet.</p>
              <p className="mt-2 text-sm text-[var(--dynasty-black)]/60">Log a negotiation from a Seller Offer above to build the auditable history.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {negotiations?.items.map((item) => (
                <div key={item.id} className="rounded-lg bg-white/75 p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{item.negotiationStage}</Badge>
                    {item.resolution && <Badge className={`border-0 ${toneForOfferStatus(item.resolution === 'WALKED_AWAY' ? 'REJECTED' : item.resolution)}`}>{item.resolution.replace(/_/g, ' ')}</Badge>}
                  </div>
                  <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{item.property?.address}</p>
                  <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">Offer {formatCurrency(item.offer?.offerAmount ?? 0)}{item.counterAmount ? ` - Counter ${formatCurrency(item.counterAmount)}` : ''}</p>
                  {item.sellerResponse && <p className="mt-2 line-clamp-2 text-xs text-[var(--dynasty-black)]/50">{item.sellerResponse}</p>}
                </div>
              ))}
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
                ) : ownershipResearch?.tasks.map((task) => {
                  const isCompleted = task.researchStatus === 'COMPLETED'
                  const isCompleting = completingTaskId === task.id
                  return (
                    <div key={task.id} className="rounded-lg bg-white/75 p-4 shadow-sm transition hover:shadow-md">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge className="border-0 bg-[var(--dynasty-gold)]/18 text-[var(--dynasty-navy)]">{task.recommendedSource}</Badge>
                          <Badge className="border-0 bg-sky-100 text-sky-800">{task.county ?? 'Unknown county'}</Badge>
                          <Badge className={`border-0 ${isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{task.researchStatus}</Badge>
                        </div>
                        <Link href={`/properties/${task.propertyId}`} className="text-xs font-bold text-[var(--dynasty-navy)] underline-offset-2 hover:underline">Open property</Link>
                      </div>
                      <p className="font-display text-lg font-black text-[var(--dynasty-navy)]">{task.propertyAddress}</p>
                      <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{task.mailingAddress ?? 'Mailing address missing'}</p>
                      <p className="mt-2 line-clamp-2 text-xs text-[var(--dynasty-black)]/50">Priority {task.sourcePriority} - {task.researchReason}</p>

                      {isCompleted ? (
                        <div className="mt-3 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800">
                          <p className="font-bold">{task.recoveredOwnerName}</p>
                          <p className="mt-1 text-emerald-800/70">Confidence {task.confidence ?? 0}/100{task.sourceUrl ? ` - ${task.sourceUrl}` : ''}</p>
                          {task.researchNotes && <p className="mt-1 text-emerald-800/70">{task.researchNotes}</p>}
                        </div>
                      ) : isCompleting ? (
                        <div className="mt-3 space-y-2 rounded-md bg-[#F8F7F2] p-3">
                          <Input
                            value={completionForm.ownerName}
                            onChange={(event) => setCompletionForm((prev) => ({ ...prev, ownerName: event.target.value }))}
                            placeholder="Recovered owner name / entity"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={completionForm.confidence}
                            onChange={(event) => setCompletionForm((prev) => ({ ...prev, confidence: event.target.value }))}
                            placeholder="Confidence (0-100)"
                          />
                          <Input
                            value={completionForm.sourceUrl}
                            onChange={(event) => setCompletionForm((prev) => ({ ...prev, sourceUrl: event.target.value }))}
                            placeholder="Source URL"
                          />
                          <Textarea
                            value={completionForm.notes}
                            onChange={(event) => setCompletionForm((prev) => ({ ...prev, notes: event.target.value }))}
                            placeholder="Notes"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={closeCompletion} disabled={completionSubmitting}>Cancel</Button>
                            <Button type="button" onClick={() => submitCompletion(task.id)} loading={completionSubmitting} className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-black)]">
                              Save &amp; Promote
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button type="button" variant="ghost" className="mt-3 h-8 px-2 text-xs" onClick={() => openCompletion(task.id)}>
                          Complete Research
                        </Button>
                      )}
                    </div>
                  )
                })}
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
