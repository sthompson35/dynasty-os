'use client'

import Link from 'next/link'
import {
  ArrowRight, BarChart3, Box, Building2, CalendarClock, DollarSign, FileText, FolderOpen, Layers, LineChart,
  PenTool, Search, Target, TrendingUp, Users, Wrench, Zap, AlertTriangle, CheckCircle2,
  Activity, ShoppingBag, Home,
  ClipboardCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'

function fmt(n: number, type: 'currency' | 'integer' | 'variance' = 'currency'): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : type === 'variance' && n > 0 ? '+' : ''
  if (type === 'integer') return `${Math.round(n)}`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${Math.round(abs).toLocaleString()}`
}

type EngineCardProps = {
  title: string
  href: string
  icon: React.ElementType
  color: string
  metrics: { label: string; value: string; alert?: boolean }[]
  status: 'healthy' | 'warning' | 'critical'
}

function EngineCard({ title, href, icon: Icon, color, metrics, status }: EngineCardProps) {
  const statusColor = status === 'healthy' ? 'text-emerald-400' : status === 'warning' ? 'text-yellow-400' : 'text-red-400'
  const StatusIcon = status === 'healthy' ? CheckCircle2 : AlertTriangle

  return (
    <Card className="border-0 bg-[var(--dynasty-navy)] text-[#F8F7F2] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color} shadow-md`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="font-display text-base font-bold text-[#F8F7F2]">{title}</CardTitle>
          </div>
          <StatusIcon className={`h-4 w-4 ${statusColor}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {metrics.map(m => (
          <div key={m.label} className="flex items-center justify-between rounded bg-white/8 px-3 py-2">
            <span className="text-xs text-[#F8F7F2]/65">{m.label}</span>
            <span className={`text-sm font-bold ${m.alert ? 'text-[var(--dynasty-gold)]' : 'text-[#F8F7F2]'}`}>{m.value}</span>
          </div>
        ))}
        <Button asChild size="sm" variant="ghost" className="mt-2 w-full justify-between text-[var(--dynasty-gold)] hover:bg-white/10 hover:text-[var(--dynasty-gold)]">
          <Link href={href}>Open Engine <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      </CardContent>
    </Card>
  )
}

const platformStages = [
  {
    step: '1',
    title: 'Acquire',
    subtitle: 'Find it. Analyze it. Win it.',
    icon: Search,
    color: 'text-[var(--dynasty-gold)]',
    modules: ['Leads & Sources', 'Seller CRM', 'Offers & Counteroffers', 'Contracts', 'Pipeline Board'],
  },
  {
    step: '2',
    title: 'Plan',
    subtitle: 'Design it. Scope it. Budget it.',
    icon: PenTool,
    color: 'text-sky-400',
    modules: ['Builder', '3D Digital Twin', 'Rehab Estimator', 'Land Builder', 'Document Vault'],
  },
  {
    step: '3',
    title: 'Fund',
    subtitle: 'Structure it. Raise it. Secure it.',
    icon: DollarSign,
    color: 'text-emerald-400',
    modules: ['Deal Analyzer', 'Capital Engine', 'Investor Portal', 'Draw Schedule', 'Lender CRM'],
  },
  {
    step: '4',
    title: 'Build',
    subtitle: 'Execute it. Track it. Control it.',
    icon: Wrench,
    color: 'text-violet-400',
    modules: ['Operations Engine', 'Project Timeline', 'Contractor Management', 'Budget vs Actual', 'Progress Tracking'],
  },
  {
    step: '5',
    title: 'Exit',
    subtitle: 'List it. Close it. Profit it.',
    icon: ShoppingBag,
    color: 'text-orange-400',
    modules: ['Disposition Engine', 'Buyer List', 'Property Package', 'Closing', 'Distributions'],
  },
  {
    step: '6',
    title: 'Grow',
    subtitle: 'Scale it. Report it. Repeat it.',
    icon: TrendingUp,
    color: 'text-teal-400',
    modules: ['Portfolio Dashboard', 'Performance Metrics', 'Investor Reporting', 'KPI Scorecards', 'Exports'],
  },
]

const propertyRecordModules = [
  { label: 'Builder', href: '/properties', icon: Building2 },
  { label: '3D Twin', href: '/properties', icon: Box },
  { label: 'Rehab', href: '/properties', icon: HammerIcon },
  { label: 'Deal Math', href: '/properties', icon: BarChart3 },
  { label: 'Capital', href: '/engines/capital', icon: DollarSign },
  { label: 'Documents', href: '/properties', icon: FolderOpen },
  { label: 'People', href: '/contacts', icon: Users },
  { label: 'Operations', href: '/engines/operations', icon: CalendarClock },
]

function HammerIcon(props: React.ComponentProps<typeof Wrench>) {
  return <Wrench {...props} />
}

function PlatformFlowCard() {
  return (
    <Card className="mb-6 border-0 bg-[var(--dynasty-navy)] text-[#F8F7F2] shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">Full platform flow</p>
            <CardTitle className="font-display text-2xl text-[#F8F7F2]">Dynasty PropertyOS operating chain</CardTitle>
          </div>
          <Badge className="w-fit border-0 bg-white/10 text-[var(--dynasty-gold)]">Property Record = source of truth</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {platformStages.map((stage, index) => {
            const Icon = stage.icon
            return (
              <div key={stage.title} className="relative rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8">
                    <Icon className={`h-4 w-4 ${stage.color}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-black uppercase tracking-wide ${stage.color}`}>{stage.step}. {stage.title}</p>
                    <p className="text-[10px] text-[#F8F7F2]/55">{stage.subtitle}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {stage.modules.map((module) => (
                    <p key={module} className="rounded bg-black/14 px-2 py-1 text-[11px] font-semibold text-[#F8F7F2]/75">{module}</p>
                  ))}
                </div>
                {index < platformStages.length - 1 && (
                  <ArrowRight className="absolute -right-2 top-5 hidden h-4 w-4 text-[#F8F7F2]/35 xl:block" />
                )}
              </div>
            )
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr_1fr]">
          <div className="rounded-lg border border-[var(--dynasty-gold)]/30 bg-black/12 p-4">
            <h3 className="font-display text-lg font-black text-[var(--dynasty-gold)]">Acquisition Engine</h3>
            <p className="mt-1 text-xs leading-5 text-[#F8F7F2]/65">Lead intake, seller CRM, offers, contracts, pipeline, tasks, campaigns, skip tracing, comps, and valuations feed the record.</p>
          </div>

          <div className="rounded-xl border border-[var(--dynasty-gold)] bg-[#F8F7F2] p-4 text-[var(--dynasty-navy)] shadow-lg">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="h-28 min-w-36 rounded-lg bg-[var(--dynasty-navy)]/10" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">Property Record</p>
                <h3 className="font-display text-xl font-black">Single source of truth</h3>
                <p className="mt-1 text-sm font-semibold">Acquisition, geometry, rehab, capital, docs, people, operations, exit, and reporting all read from one record.</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {propertyRecordModules.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link key={item.label} href={item.href} className="flex items-center gap-1.5 rounded-md bg-[var(--dynasty-navy)]/8 px-2 py-1.5 text-[11px] font-black text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-gold)]/20">
                        <Icon className="h-3.5 w-3.5 text-[var(--dynasty-gold)]" /> {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-teal-400/30 bg-black/12 p-4">
            <h3 className="font-display text-lg font-black text-teal-300">Portfolio & Reporting</h3>
            <p className="mt-1 text-xs leading-5 text-[#F8F7F2]/65">Dashboards, asset map, fund reporting, investor reports, KPI scorecards, custom exports, and integrations close the loop.</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
          <div className="rounded-lg border border-[var(--dynasty-gold)]/25 bg-black/12 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[var(--dynasty-gold)]" />
              <h3 className="font-display text-lg font-black text-[var(--dynasty-gold)]">AI & automation layer</h3>
            </div>
            <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
              {['Deal Assistant', 'Document Intelligence', 'Cost Assistant', 'Project Monitor', 'Report Generator', 'Workflow Automator'].map((label) => (
                <div key={label} className="rounded-md bg-white/[0.05] px-3 py-2 text-xs font-bold text-[#F8F7F2]/75">{label}</div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-sky-400/25 bg-black/12 p-4">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-300" />
              <h3 className="font-display text-base font-black text-sky-300">System-wide</h3>
            </div>
            <p className="text-xs leading-5 text-[#F8F7F2]/65">Global search, activity feed, notifications, dashboards, templates, tasks, tables, mobile, offline, multi-entity, import/export, APIs, and webhooks.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type Props = {
  capital: { available: number; committed: number; deployed: number; returned: number; dryPowder: number }
  leads: { total: number; qualified: number; seller: number; buyer: number; investor: number }
  deals: { total: number; approved: number; killed: number; pipelineValue: number; capitalRequired: number }
  operations: { activeProjects: number; budgetVariance: number; completedProjects: number }
  disposition: { forSale: number; pendingClosings: number; capitalRecovered: number; totalProfit: number }
  investors: { total: number; active: number; totalCapacity: number }
  portfolioValue: number
}

export function CommandCenterClient({ capital, leads, deals, operations, disposition, investors, portfolioValue }: Props) {
  const engines: EngineCardProps[] = [
    {
      title: 'Lead Engine',
      href: '/engines/leads',
      icon: Zap,
      color: 'bg-blue-600',
      status: leads.total > 0 ? 'healthy' : 'warning',
      metrics: [
        { label: 'Total Leads', value: fmt(leads.total, 'integer') },
        { label: 'Qualified', value: fmt(leads.qualified, 'integer'), alert: leads.qualified > 0 },
        { label: 'Seller / Buyer / Investor', value: `${leads.seller} / ${leads.buyer} / ${leads.investor}` },
      ],
    },
    {
      title: 'Deal Engine',
      href: '/engines/deals',
      icon: Target,
      color: 'bg-emerald-700',
      status: deals.approved > 0 ? 'healthy' : deals.total > 0 ? 'warning' : 'warning',
      metrics: [
        { label: 'Pipeline Value', value: fmt(deals.pipelineValue), alert: true },
        { label: 'Approved / Killed', value: `${deals.approved} GO · ${deals.killed} KILL` },
        { label: 'Capital Required', value: fmt(deals.capitalRequired) },
      ],
    },
    {
      title: 'Intake Analyst',
      href: '/engines/intake',
      icon: ClipboardCheck,
      color: 'bg-cyan-700',
      status: deals.total > 0 || leads.total > 0 ? 'healthy' : 'warning',
      metrics: [
        { label: 'Property Feed', value: 'Live', alert: true },
        { label: 'Deal Sync', value: `${deals.total} records` },
        { label: 'Decision Model', value: 'MAO / ROI / Risk' },
      ],
    },
    {
      title: 'Capital Engine',
      href: '/engines/capital',
      icon: DollarSign,
      color: 'bg-[var(--dynasty-gold)]',
      status: capital.dryPowder > 0 ? 'healthy' : 'warning',
      metrics: [
        { label: 'Available Capital', value: fmt(capital.available), alert: true },
        { label: 'Committed / Deployed', value: `${fmt(capital.committed)} / ${fmt(capital.deployed)}` },
        { label: 'Dry Powder', value: fmt(capital.dryPowder), alert: capital.dryPowder > 0 },
      ],
    },
    {
      title: 'Land + Build Underwriting',
      href: '/engines/land-build',
      icon: Home,
      color: 'bg-slate-700',
      status: 'healthy',
      metrics: [
        { label: 'Workbook Tabs', value: '8', alert: true },
        { label: 'Exit Models', value: 'Sale / Rental / Build' },
        { label: 'DD Scope', value: 'Checklist + Feeds' },
      ],
    },
    {
      title: 'Operations Engine',
      href: '/engines/operations',
      icon: Layers,
      color: 'bg-purple-700',
      status: operations.budgetVariance >= 0 ? 'healthy' : 'warning',
      metrics: [
        { label: 'Active Projects', value: fmt(operations.activeProjects, 'integer'), alert: operations.activeProjects > 0 },
        { label: 'Completed', value: fmt(operations.completedProjects, 'integer') },
        { label: 'Budget Variance', value: fmt(operations.budgetVariance, 'variance'), alert: operations.budgetVariance < 0 },
      ],
    },
    {
      title: 'Disposition Engine',
      href: '/engines/disposition',
      icon: ShoppingBag,
      color: 'bg-orange-600',
      status: disposition.totalProfit > 0 ? 'healthy' : 'warning',
      metrics: [
        { label: 'For Sale / Pending', value: `${disposition.forSale} / ${disposition.pendingClosings}` },
        { label: 'Capital Recovered', value: fmt(disposition.capitalRecovered), alert: disposition.capitalRecovered > 0 },
        { label: 'Total Profit', value: fmt(disposition.totalProfit), alert: disposition.totalProfit > 0 },
      ],
    },
  ]

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
      {/* Hero header */}
      <FadeIn>
        <div className="mb-8 rounded-xl bg-[var(--dynasty-navy)] p-7 text-[#F8F7F2] shadow-xl">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
            <Activity className="h-3.5 w-3.5" /> Dynasty OS · Executive Command Center
          </div>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight md:text-4xl">
            Dynasty Core Command Center
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#F8F7F2]/70">
            Real-time visibility across every engine in the Dynasty OS ecosystem. Capital, leads, deals, operations, and dispositions in one view.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-white/10 pt-5">
            <div className="text-center">
              <p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{fmt(portfolioValue)}</p>
              <p className="text-xs text-[#F8F7F2]/60">Portfolio Value</p>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div className="text-center">
              <p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{fmt(capital.dryPowder)}</p>
              <p className="text-xs text-[#F8F7F2]/60">Dry Powder</p>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div className="text-center">
              <p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{fmt(deals.pipelineValue)}</p>
              <p className="text-xs text-[#F8F7F2]/60">Deal Pipeline</p>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div className="text-center">
              <p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{fmt(disposition.totalProfit)}</p>
              <p className="text-xs text-[#F8F7F2]/60">Realized Profit</p>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div className="text-center">
              <p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{investors.total}</p>
              <p className="text-xs text-[#F8F7F2]/60">Investors</p>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <PlatformFlowCard />
      </FadeIn>

      {/* Engine cards */}
      <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {engines.map(engine => (
          <StaggerItem key={engine.href}>
            <EngineCard {...engine} />
          </StaggerItem>
        ))}

        {/* Investor status panel */}
        <StaggerItem>
          <Card className="border-0 bg-[var(--dynasty-navy)] text-[#F8F7F2] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-700 shadow-md">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="font-display text-base font-bold text-[#F8F7F2]">Investor Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Total Investors', value: fmt(investors.total, 'integer') },
                { label: 'Active / Funded', value: fmt(investors.active, 'integer'), alert: investors.active > 0 },
                { label: 'Total Capacity', value: fmt(investors.totalCapacity), alert: true },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between rounded bg-white/8 px-3 py-2">
                  <span className="text-xs text-[#F8F7F2]/65">{m.label}</span>
                  <span className={`text-sm font-bold ${m.alert ? 'text-[var(--dynasty-gold)]' : 'text-[#F8F7F2]'}`}>{m.value}</span>
                </div>
              ))}
              <Button asChild size="sm" variant="ghost" className="mt-2 w-full justify-between text-[var(--dynasty-gold)] hover:bg-white/10 hover:text-[var(--dynasty-gold)]">
                <Link href="/engines/capital">Open Capital Engine <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        </StaggerItem>
      </Stagger>

      {/* Capital flywheel visualization */}
      <FadeIn>
        <Card className="mt-6 border-0 bg-[#F8F7F2] shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl text-[var(--dynasty-navy)]">
              <LineChart className="h-5 w-5 text-[var(--dynasty-gold)]" /> Capital Flywheel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {[
                { label: 'Lead Engine', sublabel: 'Finds Opportunities', icon: Zap, href: '/engines/leads', active: leads.total > 0 },
                { label: 'Intake Analyst', sublabel: 'Ranks Candidates', icon: ClipboardCheck, href: '/engines/intake', active: true },
                { label: 'Deal Engine', sublabel: 'Validates Opportunities', icon: Target, href: '/engines/deals', active: deals.approved > 0 },
                { label: 'Capital Engine', sublabel: 'Funds Opportunities', icon: DollarSign, href: '/engines/capital', active: capital.deployed > 0 },
                { label: 'Land + Build UW', sublabel: 'Tests Buildable Land', icon: Home, href: '/engines/land-build', active: true },
                { label: 'Operations Engine', sublabel: 'Executes Projects', icon: Layers, href: '/engines/operations', active: operations.activeProjects > 0 },
                { label: 'Disposition Engine', sublabel: 'Monetizes Assets', icon: ShoppingBag, href: '/engines/disposition', active: disposition.capitalRecovered > 0 },
              ].map((step, i) => {
                const Icon = step.icon
                return (
                  <Link key={step.href} href={step.href} className="group relative flex flex-col items-center gap-2 rounded-lg bg-white/70 p-4 text-center shadow-sm transition-all duration-300 hover:bg-white hover:shadow-md">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-colors ${step.active ? 'bg-[var(--dynasty-navy)]' : 'bg-[var(--dynasty-black)]/10'}`}>
                      <Icon className={`h-5 w-5 ${step.active ? 'text-[var(--dynasty-gold)]' : 'text-[var(--dynasty-black)]/40'}`} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${step.active ? 'text-[var(--dynasty-navy)]' : 'text-[var(--dynasty-black)]/50'}`}>{step.label}</p>
                      <p className="mt-0.5 text-[10px] text-[var(--dynasty-black)]/45">{step.sublabel}</p>
                    </div>
                    {step.active && <Badge className="border-0 bg-emerald-100 text-[9px] text-emerald-700">Active</Badge>}
                    {i < 6 && (
                      <ArrowRight className="absolute -right-1.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-[var(--dynasty-black)]/20 xl:block" />
                    )}
                  </Link>
                )
              })}
            </div>
            <p className="mt-4 text-center text-xs text-[var(--dynasty-black)]/45">
              The goal is not simply to close deals. The goal is to continuously recycle capital into larger and larger opportunities.
            </p>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Quick nav links */}
      <FadeIn>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Properties', href: '/properties', icon: Building2 },
            { label: 'Deal Analyzer', href: '/properties/new', icon: BarChart3 },
            { label: 'Contacts', href: '/contacts', icon: Users },
            { label: 'Portfolio Dashboard', href: '/dashboard', icon: TrendingUp },
          ].map(link => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg bg-[#F8F7F2] p-4 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dynasty-gold)]/18">
                  <Icon className="h-4 w-4 text-[var(--dynasty-navy)]" />
                </div>
                <span className="text-sm font-semibold text-[var(--dynasty-navy)]">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </FadeIn>
    </div>
  )
}
