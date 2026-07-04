'use client'

import Link from 'next/link'
import { ArrowRight, Clock3, Home, PlusCircle, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { MetricCard } from '@/components/dynasty/metric-card'
import { DashboardCharts } from '@/components/dynasty/dashboard-charts'
import { PropertyDTO, calculateDealMetrics, formatCurrency, formatPercent, getPropertyDisplayName, getStatusLabel, getTypeLabel } from '@/lib/property-utils'
import type { ChartDatum } from '@/components/dynasty/property-type-chart'

type DashboardMetrics = {
  totalProperties: number
  portfolioValue: number
  totalEquity: number
  averageRoi: number
  totalProspects: number
  totalPipelineValue: number
}

export function DashboardClient(props: {
  metrics: DashboardMetrics
  recentProperties: PropertyDTO[]
  typeData: ChartDatum[]
  statusData: ChartDatum[]
}) {
  const metrics = props?.metrics ?? { totalProperties: 0, portfolioValue: 0, totalEquity: 0, averageRoi: 0, totalProspects: 0, totalPipelineValue: 0 }
  const recentProperties = props?.recentProperties ?? []

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
      <FadeIn>
        <div className="mb-8 flex flex-col gap-4 rounded-lg bg-[var(--dynasty-navy)] p-6 text-[#F8F7F2] shadow-lg md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
              <TrendingUp className="h-3.5 w-3.5" /> Portfolio dashboard
            </div>
            <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">Command the entire portfolio from one view.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F8F7F2]/76">
              Monitor property count, value, equity, ROI, recent acquisitions, and portfolio mix with investor-grade clarity.
            </p>
          </div>
          <Button asChild className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
            <Link href="/properties/new"><PlusCircle className="h-4 w-4" /> Add property</Link>
          </Button>
        </div>
      </FadeIn>

      <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StaggerItem>
          <MetricCard label="Total properties" value={metrics?.totalProperties ?? 0} helper="Across every status" icon="Building2" format="integer" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="Portfolio value" value={metrics?.portfolioValue ?? 0} helper="Owned properties only" icon="WalletCards" format="currency" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="Total equity" value={metrics?.totalEquity ?? 0} helper="Value above basis" icon="Landmark" format="currency" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="Average ROI" value={metrics?.averageRoi ?? 0} helper="Across analyzed deals" icon="TrendingUp" format="percent" />
        </StaggerItem>
        <StaggerItem>
          <MetricCard label="Pipeline value" value={metrics?.totalPipelineValue ?? 0} helper={`${metrics?.totalProspects ?? 0} prospects/leads`} icon="Activity" format="currency" />
        </StaggerItem>
      </Stagger>

      <div className="mt-6">
        <DashboardCharts typeData={props?.typeData ?? []} statusData={props?.statusData ?? []} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-0 bg-[#F8F7F2] shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 font-display text-xl text-[var(--dynasty-navy)]">
              <Clock3 className="h-5 w-5 text-[var(--dynasty-gold)]" /> Recent properties added
            </CardTitle>
            <Button asChild variant="ghost" className="text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-tan)]/18">
              <Link href="/properties">View all <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(recentProperties?.length ?? 0) === 0 ? (
              <div className="rounded-lg bg-white/70 p-6 text-center text-sm text-[var(--dynasty-black)]/60">
                <Home className="mx-auto mb-3 h-8 w-8 text-[var(--dynasty-gold)]" /> Add the first property to begin tracking portfolio activity.
              </div>
            ) : (
              <div className="space-y-3">
                {recentProperties?.map?.((property: PropertyDTO) => {
                  const metricsForProperty = calculateDealMetrics(property)
                  return (
                    <Link key={property?.id} href={`/properties/${property?.id}`} className="group block rounded-lg bg-white/75 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-bold text-[var(--dynasty-navy)] group-hover:text-[var(--dynasty-black)]">{getPropertyDisplayName(property)}</p>
                          <p className="mt-1 text-xs text-[var(--dynasty-black)]/58">{getTypeLabel(property?.propertyType)} · {formatCurrency(property?.currentValue ?? property?.purchasePrice ?? 0)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="border-0 bg-[var(--dynasty-tan)]/22 text-[var(--dynasty-navy)]">{getStatusLabel(property?.status)}</Badge>
                          <Badge className={metricsForProperty?.tone === 'good' ? 'border-0 bg-emerald-100 text-emerald-800' : metricsForProperty?.tone === 'bad' ? 'border-0 bg-red-100 text-red-800' : 'border-0 bg-[var(--dynasty-gold)]/20 text-[var(--dynasty-navy)]'}>
                            ROI {formatPercent(metricsForProperty?.roi)}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  )
                }) ?? []}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-[var(--dynasty-navy)] text-[#F8F7F2] shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <TrendingUp className="h-5 w-5 text-[var(--dynasty-gold)]" /> Deal discipline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-[#F8F7F2]/78">
            <p>
              The analyzer applies the 70% rule: MAO = ARV × 0.70 − repair costs, then compares projected profit and ROI against the full investment stack.
            </p>
            <div className="rounded-lg bg-white/10 p-4 shadow-sm">
              <p className="font-bold text-[var(--dynasty-gold)]">Color logic</p>
              <p className="mt-2">Green highlights strong deals, red flags negative outcomes, and gold marks break-even watch decisions.</p>
            </div>
            <Button asChild className="w-full bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#D8B65B]">
              <Link href="/properties">Open property manager <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
