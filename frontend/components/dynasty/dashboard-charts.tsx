'use client'

import { Component, ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, BarChart3, PieChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChartDatum } from '@/components/dynasty/property-type-chart'

const PropertyTypeChart = dynamic(() => import('@/components/dynasty/property-type-chart'), {
  ssr: false,
  loading: () => <div className="flex h-[300px] items-center justify-center text-sm text-[var(--dynasty-black)]/60">Loading type chart...</div>,
})

const PropertyStatusChart = dynamic(() => import('@/components/dynasty/property-status-chart'), {
  ssr: false,
  loading: () => <div className="flex h-[300px] items-center justify-center text-sm text-[var(--dynasty-black)]/60">Loading status chart...</div>,
})

class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Dashboard chart failed to render', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[300px] flex-col items-center justify-center rounded-lg bg-white/70 text-center text-sm text-[var(--dynasty-black)]/60">
          <AlertTriangle className="mb-3 h-7 w-7 text-[var(--dynasty-gold)]" />
          Chart unavailable. The underlying portfolio data is still loaded.
        </div>
      )
    }

    return this.props.children
  }
}

export function DashboardCharts(props: { typeData: ChartDatum[]; statusData: ChartDatum[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-xl text-[var(--dynasty-navy)]">
            <PieChart className="h-5 w-5 text-[var(--dynasty-gold)]" /> Portfolio by property type
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ChartErrorBoundary>
            <PropertyTypeChart data={props?.typeData ?? []} />
          </ChartErrorBoundary>
        </CardContent>
      </Card>

      <Card className="border-0 bg-[#F8F7F2] shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-xl text-[var(--dynasty-navy)]">
            <BarChart3 className="h-5 w-5 text-[var(--dynasty-gold)]" /> Pipeline by status
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ChartErrorBoundary>
            <PropertyStatusChart data={props?.statusData ?? []} />
          </ChartErrorBoundary>
        </CardContent>
      </Card>
    </div>
  )
}
