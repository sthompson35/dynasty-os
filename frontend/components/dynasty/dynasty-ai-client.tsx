'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Command,
  DollarSign,
  LineChart,
  MessageSquare,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { generateSessionId, sendDynastyAIMessage } from '@/lib/dynasty-ai-chat'
import type { AgentArchitectureEntry } from '@/lib/dynasty-architecture'

export type AtlasRecommendationCommand = {
  id: string
  address: string
  command: string
  metricLabel: string
  metricValue: number
  confidence: number
  actionLabel: string
  href: string
  reason: string
}

export type EngineHealth = {
  engine: string
  health: number
  metrics: { label: string; value: string | number }[]
}

export type DynastyAICommandCenterData = {
  recommendations: AtlasRecommendationCommand[]
  engineHealth: EngineHealth[]
  memory: {
    targetMarkets: string
    preferredStrategy: string
    minimumProfit: number
    minimumRoi: number
    maximumRehab: string
    averageHoldDays: number
    closedDeals: number
    rejectedDeals: number
    predictionAccuracy: number
  }
  today: {
    offersNeeded: number
    contractsClosing: number
    drawRequests: number
    investorUpdates: number
    rehabDelays: number
    criticalAlerts: number
  }
  outlook: {
    next30: {
      expectedClosings: number
      expectedRevenue: number
      capitalRequired: number
      expectedProfit: number
    }
    next90: {
      projectedClosings: number
      projectedRevenue: number
      projectedProfit: number
    }
  }
  architecture: AgentArchitectureEntry[]
}

const commandExamples = [
  'Find deals with ROI > 30% and rehab < $40K within 30 miles of Desloge.',
  'How much capital will I need in August?',
  'Which deals should I wholesale instead of flip?',
  'Show me projects running over budget.',
]

function fmt(n: number, mode: 'currency' | 'percent' | 'integer' = 'currency'): string {
  if (mode === 'percent') return `${Math.round(n * 100)}%`
  if (mode === 'integer') return Math.round(n).toLocaleString()
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${Math.round(abs).toLocaleString()}`
}

function healthTone(score: number): string {
  if (score >= 85) return 'text-emerald-700 bg-emerald-100'
  if (score >= 72) return 'text-amber-700 bg-amber-100'
  return 'text-red-700 bg-red-100'
}

function commandTone(command: string): string {
  if (command === 'BUY') return 'bg-emerald-100 text-emerald-800'
  if (command === 'SELL') return 'bg-blue-100 text-blue-800'
  if (command === 'REFINANCE') return 'bg-violet-100 text-violet-800'
  return 'bg-amber-100 text-amber-800'
}

function TodayTile(props: { label: string; value: number; tone?: 'good' | 'warn' | 'bad'; icon: React.ElementType }) {
  const Icon = props.icon
  const tone = props.tone === 'bad' ? 'text-red-300' : props.tone === 'warn' ? 'text-[var(--dynasty-gold)]' : 'text-emerald-300'
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className={`font-display text-2xl font-black ${tone}`}>{fmt(props.value, 'integer')}</p>
        <Icon className={`h-5 w-5 ${tone}`} />
      </div>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#F8F7F2]/55">{props.label}</p>
    </div>
  )
}

function OutlookStat(props: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 p-3">
      <p className="font-display text-xl font-black text-[var(--dynasty-navy)]">{props.value}</p>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dynasty-black)]/45">{props.label}</p>
    </div>
  )
}

export function DynastyAIClient({ data }: { data: DynastyAICommandCenterData }) {
  const [chatValue, setChatValue] = useState(commandExamples[0])
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [atlasResponse, setAtlasResponse] = useState<string | null>(null)
  const [isQuerying, setIsQuerying] = useState(false)
  const sessionId = useRef(generateSessionId())

  const activeRecommendations = useMemo(() => {
    if (data.recommendations.length > 0) return data.recommendations
    return [
      {
        id: 'placeholder',
        address: 'No pending commands',
        command: 'REVIEW',
        metricLabel: 'Expected Profit',
        metricValue: 0,
        confidence: 0,
        actionLabel: 'Review',
        href: '/engines/intake',
        reason: 'Import or refresh opportunities to generate ATLAS commands.',
      },
    ]
  }, [data.recommendations])

  function approveCommand(command: AtlasRecommendationCommand) {
    setApproved((prev) => new Set(prev).add(command.id))
    toast.success(`${command.command} command approved for ${command.address}.`)
  }

  async function runAtlasQuery() {
    const query = chatValue.trim()
    if (!query) {
      toast.error('Enter a command for ATLAS first.')
      return
    }

    setIsQuerying(true)
    setAtlasResponse(null)
    try {
      const reply = await sendDynastyAIMessage(query, sessionId.current)
      setAtlasResponse(reply)
      toast.success('ATLAS responded.')
    } catch (error: unknown) {
      console.error('ATLAS query failed', error)
      setAtlasResponse(null)
      toast.error('Unable to reach ATLAS. Make sure the n8n workflow is active.')
    } finally {
      setIsQuerying(false)
    }
  }

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1360px] py-8">
      <FadeIn>
        <div className="mb-6 rounded-xl bg-[var(--dynasty-navy)] p-7 text-[#F8F7F2] shadow-xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
            <BrainCircuit className="h-3.5 w-3.5" /> Dynasty OS nervous system
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">ATLAS executive command center</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#F8F7F2]/70">
                ATLAS now moves from explaining the engines to controlling the operating queue: recommendations, approvals, health, memory, capital, and portfolio outlook.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
                <Link href="/engines/intake">Open Intake <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild className="bg-white/10 text-[#F8F7F2] hover:bg-white/18">
                <Link href="/command-center">Command Center</Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <TodayTile label="Offers Needed" value={data.today.offersNeeded} icon={Target} />
            <TodayTile label="Contracts Closing" value={data.today.contractsClosing} icon={CheckCircle2} />
            <TodayTile label="Draw Requests" value={data.today.drawRequests} icon={DollarSign} tone="warn" />
            <TodayTile label="Investor Updates" value={data.today.investorUpdates} icon={MessageSquare} tone="warn" />
            <TodayTile label="Rehab Delays" value={data.today.rehabDelays} icon={Clock3} tone={data.today.rehabDelays ? 'bad' : 'good'} />
            <TodayTile label="Critical Alerts" value={data.today.criticalAlerts} icon={AlertTriangle} tone={data.today.criticalAlerts ? 'bad' : 'good'} />
          </div>
        </div>
      </FadeIn>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 font-display text-xl text-[var(--dynasty-navy)]">
                <Command className="h-5 w-5 text-[var(--dynasty-gold)]" /> ATLAS commands
              </CardTitle>
              <Badge className="border-0 bg-[var(--dynasty-navy)] text-[#F8F7F2]">{activeRecommendations.length} pending</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {activeRecommendations.map((recommendation, index) => {
              const isApproved = approved.has(recommendation.id)
              return (
                <div key={recommendation.id} className="rounded-lg bg-[#F8F7F2] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-[var(--dynasty-navy)]">{index + 1}</span>
                        <Badge className={`border-0 ${commandTone(recommendation.command)}`}>{recommendation.command}</Badge>
                        <Badge className="border-0 bg-white text-[var(--dynasty-black)]/65">Confidence {recommendation.confidence}%</Badge>
                      </div>
                      <h2 className="font-display text-xl font-black text-[var(--dynasty-navy)]">{recommendation.address}</h2>
                      <p className="mt-1 text-sm text-[var(--dynasty-black)]/58">{recommendation.reason}</p>
                    </div>
                    <div className="grid min-w-[260px] gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dynasty-black)]/45">{recommendation.metricLabel}</p>
                        <p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{fmt(recommendation.metricValue)}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button type="button" onClick={() => approveCommand(recommendation)} disabled={isApproved || recommendation.id === 'placeholder'} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
                          <ShieldCheck className="h-4 w-4" /> {isApproved ? 'Approved' : recommendation.actionLabel}
                        </Button>
                        <Button asChild variant="outline" className="border-[var(--dynasty-navy)]/15 text-[var(--dynasty-navy)]">
                          <Link href={recommendation.href}>Open record</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-0 bg-[#F8F7F2] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl text-[var(--dynasty-navy)]">
              <Sparkles className="h-5 w-5 text-[var(--dynasty-gold)]" /> ATLAS knows
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <OutlookStat label="Target Markets" value={data.memory.targetMarkets} />
              <OutlookStat label="Preferred Strategy" value={data.memory.preferredStrategy} />
              <OutlookStat label="Minimum Profit" value={fmt(data.memory.minimumProfit)} />
              <OutlookStat label="Minimum ROI" value={fmt(data.memory.minimumRoi, 'percent')} />
              <OutlookStat label="Maximum Rehab" value={data.memory.maximumRehab} />
              <OutlookStat label="Average Hold" value={`${data.memory.averageHoldDays} days`} />
            </div>
            <div className="rounded-lg bg-white p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{fmt(data.memory.closedDeals, 'integer')}</p>
                  <p className="text-xs text-[var(--dynasty-black)]/50">Closed Deals</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-black text-[var(--dynasty-navy)]">{fmt(data.memory.rejectedDeals, 'integer')}</p>
                  <p className="text-xs text-[var(--dynasty-black)]/50">Rejected Deals</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-black text-emerald-700">{data.memory.predictionAccuracy}%</p>
                  <p className="text-xs text-[var(--dynasty-black)]/50">Prediction Accuracy</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl text-[var(--dynasty-navy)]">
              <Zap className="h-5 w-5 text-[var(--dynasty-gold)]" /> Engine health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Stagger className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.engineHealth.map((engine) => (
                <StaggerItem key={engine.engine}>
                  <div className="rounded-lg bg-[#F8F7F2] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[var(--dynasty-navy)]">{engine.engine}</p>
                        <p className="mt-1 text-xs text-[var(--dynasty-black)]/50">Live engine telemetry</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-black ${healthTone(engine.health)}`}>{engine.health}</span>
                    </div>
                    <Progress value={engine.health} className="mt-3 h-1.5 bg-[var(--dynasty-navy)]/10 [&>div]:bg-[var(--dynasty-gold)]" />
                    <div className="mt-3 grid gap-2">
                      {engine.metrics.map((metric) => (
                        <div key={metric.label} className="flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs">
                          <span className="text-[var(--dynasty-black)]/55">{metric.label}</span>
                          <span className="font-black text-[var(--dynasty-navy)]">{typeof metric.value === 'number' ? fmt(metric.value, 'integer') : metric.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </CardContent>
        </Card>

        <Card className="border-0 bg-[var(--dynasty-navy)] text-[#F8F7F2] shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl text-[#F8F7F2]">
              <LineChart className="h-5 w-5 text-[var(--dynasty-gold)]" /> ATLAS war room
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-lg bg-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--dynasty-gold)]">Next 30 days</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <OutlookStat label="Expected Closings" value={fmt(data.outlook.next30.expectedClosings, 'integer')} />
                <OutlookStat label="Expected Revenue" value={fmt(data.outlook.next30.expectedRevenue)} />
                <OutlookStat label="Capital Required" value={fmt(data.outlook.next30.capitalRequired)} />
                <OutlookStat label="Expected Profit" value={fmt(data.outlook.next30.expectedProfit)} />
              </div>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--dynasty-gold)]">Next 90 days</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <OutlookStat label="Projected Closings" value={fmt(data.outlook.next90.projectedClosings, 'integer')} />
                <OutlookStat label="Projected Revenue" value={fmt(data.outlook.next90.projectedRevenue)} />
                <OutlookStat label="Projected Profit" value={fmt(data.outlook.next90.projectedProfit)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-0 bg-[#F8F7F2] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl text-[var(--dynasty-navy)]">
              <MessageSquare className="h-5 w-5 text-[var(--dynasty-gold)]" /> ATLAS command chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={chatValue}
              onChange={(event) => setChatValue(event.target.value)}
              className="min-h-28 w-full resize-none rounded-lg border border-[var(--dynasty-navy)]/10 bg-white p-3 text-sm text-[var(--dynasty-black)] outline-none focus:border-[var(--dynasty-gold)]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {commandExamples.map((example) => (
                <button key={example} type="button" onClick={() => setChatValue(example)} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--dynasty-black)]/60 hover:bg-[var(--dynasty-gold)]/20">
                  {example.split('?')[0].slice(0, 36)}...
                </button>
              ))}
            </div>
            <Button type="button" onClick={runAtlasQuery} loading={isQuerying} className="mt-4 bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
              <Route className="h-4 w-4" /> Stage ATLAS Query
            </Button>
            {atlasResponse && (
              <div className="mt-4 rounded-lg bg-white p-4 text-sm leading-relaxed text-[var(--dynasty-black)] shadow-sm ring-1 ring-black/5">
                <p className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-[var(--dynasty-gold)]">ATLAS response</p>
                {atlasResponse}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl text-[var(--dynasty-navy)]">
              <TrendingUp className="h-5 w-5 text-[var(--dynasty-gold)]" /> Long-term architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.architecture.length === 0 ? (
              <p className="rounded-lg bg-[#F8F7F2] px-3 py-3 text-sm text-[var(--dynasty-black)]/60">
                Agent roster unavailable — check the Supabase connection for the ATLAS agent directory.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {data.architecture.map((agent) => (
                  <div key={agent.id} className="rounded-lg bg-[#F8F7F2] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[var(--dynasty-navy)]">{agent.agentName}</p>
                      <Badge className={`border-0 text-[10px] ${agent.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-[var(--dynasty-black)]/10 text-[var(--dynasty-black)]/60'}`}>
                        {agent.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--dynasty-black)]/55">{agent.agentRole}</p>
                    {agent.ownedEngines.length > 0 && (
                      <p className="mt-1 text-xs font-semibold text-[var(--dynasty-gold)]">Owns: {agent.ownedEngines.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-sm leading-6 text-[var(--dynasty-black)]/62">
              Every engine becomes both a human workspace and an AI workspace. ATLAS coordinates actions, monitors health, and learns from portfolio outcomes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
