'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { Activity, Building2, Landmark, LucideIcon, TrendingUp, WalletCards } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type MetricFormat = 'currency' | 'percent' | 'integer'

type MetricCardProps = {
  label: string
  value: number
  helper: string
  icon: 'Building2' | 'WalletCards' | 'Landmark' | 'TrendingUp' | 'Activity'
  format: MetricFormat
}

const iconMap: Record<string, LucideIcon> = {
  Building2,
  WalletCards,
  Landmark,
  TrendingUp,
  Activity,
}

function addCommas(value: number): string {
  const rounded = Math.round(Math.abs(value))
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatValue(value: number, format: MetricFormat): string {
  const safeValue = Number.isFinite(value) ? value : 0
  const sign = safeValue < 0 ? '-' : ''
  const absoluteValue = Math.abs(safeValue)

  if (format === 'currency') {
    if (absoluteValue >= 1000000) {
      return `${sign}$${(absoluteValue / 1000000).toFixed(1)}M`
    }
    if (absoluteValue >= 1000) {
      return `${sign}$${(absoluteValue / 1000).toFixed(1)}K`
    }
    return `${sign}$${addCommas(absoluteValue)}`
  }

  if (format === 'percent') {
    return `${safeValue.toFixed(1)}%`
  }

  return `${sign}${addCommas(absoluteValue)}`
}

export function MetricCard(props: MetricCardProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const targetValue = Number.isFinite(props?.value) ? props.value : 0
  const [displayValue, setDisplayValue] = useState(0)
  const Icon = iconMap?.[props?.icon ?? 'Activity'] ?? Activity
  const formattedValue = useMemo(() => formatValue(displayValue, props?.format ?? 'integer'), [displayValue, props?.format])

  useEffect(() => {
    if (!isInView) {
      return
    }

    let frame = 0
    const duration = 900
    const startTime = performance.now()

    const tick = (time: number) => {
      const elapsed = Math.min((time - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - elapsed, 3)
      setDisplayValue(targetValue * eased)

      if (elapsed < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isInView, targetValue])

  return (
    <Card ref={ref} className="border-0 bg-[#F8F7F2] shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--dynasty-black)]/58">{props?.label}</p>
            <p className="mt-2 font-display text-3xl font-black tracking-tight text-[var(--dynasty-navy)]">{formattedValue}</p>
            <p className="mt-2 text-xs font-medium text-[var(--dynasty-black)]/58">{props?.helper}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--dynasty-gold)]/18 shadow-sm">
            <Icon className="h-5 w-5 text-[var(--dynasty-navy)]" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
