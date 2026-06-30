'use client'

import { useMemo, useRef, useState } from 'react'
import { DrawDTO, getDrawStatusLabel } from '@/lib/draw-utils'
import { formatCurrency } from '@/lib/property-utils'

// ─── Status palette ────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, { bar: string; label: string; border: string }> = {
  pending:   { bar: '#E8E0C8', label: '#2C2C2C', border: '#C8B87A' },
  requested: { bar: '#F5C842', label: '#1A2744', border: '#C89A10' },
  approved:  { bar: '#38BDF8', label: '#0C4A6E', border: '#0284C7' },
  funded:    { bar: '#34D399', label: '#064E3B', border: '#059669' },
}
const FALLBACK_COLOR = { bar: '#D1D5DB', label: '#374151', border: '#9CA3AF' }

// ─── Layout constants ─────────────────────────────────────────────────────────
const LANE_H    = 44   // height of each draw bar + padding
const BAR_H     = 30   // bar rectangle height
const AXIS_H    = 36   // bottom date-axis strip height
const MARGIN_L  = 0    // SVG left margin (labels are inline)
const MIN_BAR_W = 6    // minimum bar pixel width (so zero-duration bars are visible)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDate(value: string): number | null {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

function formatAxisDate(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(new Date(ms))
}

function formatAxisMonth(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    year: '2-digit',
  }).format(new Date(ms))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ─── Types ────────────────────────────────────────────────────────────────────
type PlacedBar = {
  draw: DrawDTO
  lane: number
  startMs: number
  endMs: number
  color: typeof FALLBACK_COLOR
}

type TooltipState = {
  draw: DrawDTO
  x: number
  y: number
  startMs: number
  endMs: number
} | null

// ─── Bar placement — assign lanes to avoid horizontal overlap ─────────────────
function assignLanes(bars: Omit<PlacedBar, 'lane'>[]): PlacedBar[] {
  const laneEnds: number[] = []
  return bars.map((bar) => {
    let lane = laneEnds.findIndex((end) => end <= bar.startMs - 1)
    if (lane === -1) { lane = laneEnds.length }
    laneEnds[lane] = bar.endMs
    return { ...bar, lane }
  })
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DrawTimeline({
  draws,
  paddingDays = 7,
}: {
  draws: DrawDTO[]
  paddingDays?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState>(null)
  const [svgWidth, setSvgWidth] = useState(800)

  // Measure container width on mount / resize
  const measuredRef = (node: HTMLDivElement | null) => {
    if (!node) return
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width
      if (w && w > 0) setSvgWidth(Math.floor(w))
    })
    obs.observe(node)
  }

  // ── Build placed bars ──────────────────────────────────────────────────────
  const { bars, timeStart, timeEnd, lanes, axisTicks } = useMemo(() => {
    const valid = draws
      .map((d) => ({ draw: d, ms: parseDate(d.scheduledDate) }))
      .filter((x): x is { draw: DrawDTO; ms: number } => x.ms !== null)
      .sort((a, b) => a.ms - b.ms)

    if (valid.length === 0) {
      return { bars: [], timeStart: 0, timeEnd: 0, lanes: 0, axisTicks: [] }
    }

    const PAD = paddingDays * 86_400_000

    // Derive end time per bar: next draw's start − 1 day (min 7 days)
    const rawBars: Omit<PlacedBar, 'lane'>[] = valid.map((item, i) => {
      const nextMs = valid[i + 1]?.ms
      const minEnd = item.ms + 7 * 86_400_000
      const endMs  = nextMs ? Math.max(minEnd, nextMs - 86_400_000) : item.ms + 21 * 86_400_000
      return {
        draw: item.draw,
        startMs: item.ms,
        endMs,
        color: STATUS_COLOR[item.draw.status] ?? FALLBACK_COLOR,
      }
    })

    const timeStart = rawBars[0].startMs - PAD
    const timeEnd   = rawBars[rawBars.length - 1].endMs + PAD

    const placed = assignLanes(rawBars)
    const lanes  = Math.max(...placed.map((b) => b.lane)) + 1

    // Monthly axis ticks
    const axisTicks: { ms: number; label: string }[] = []
    const d = new Date(timeStart)
    d.setUTCDate(1)
    d.setUTCHours(0, 0, 0, 0)
    while (d.getTime() <= timeEnd) {
      axisTicks.push({ ms: d.getTime(), label: formatAxisMonth(d.getTime()) })
      d.setUTCMonth(d.getUTCMonth() + 1)
    }

    return { bars: placed, timeStart, timeEnd, lanes, axisTicks }
  }, [draws, paddingDays])

  const totalMs   = timeEnd - timeStart || 1
  const svgH      = lanes * LANE_H + AXIS_H + 8
  const todayMs   = Date.now()
  const showToday = todayMs >= timeStart && todayMs <= timeEnd

  // Convert time → SVG x pixel
  const toX = (ms: number) =>
    MARGIN_L + clamp((ms - timeStart) / totalMs, 0, 1) * (svgWidth - MARGIN_L)

  // ── Tooltip handlers ───────────────────────────────────────────────────────
  const handleMouseEnter = (bar: PlacedBar, evt: React.MouseEvent<SVGElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      draw: bar.draw,
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
      startMs: bar.startMs,
      endMs: bar.endMs,
    })
  }
  const handleMouseMove = (evt: React.MouseEvent<SVGElement>) => {
    if (!tooltip) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip((prev) => prev ? { ...prev, x: evt.clientX - rect.left, y: evt.clientY - rect.top } : prev)
  }
  const handleMouseLeave = () => setTooltip(null)

  if (draws.length === 0 || bars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--dynasty-tan)]/50 bg-white/40 p-10 text-center">
        <p className="text-sm text-[var(--dynasty-black)]/50">Add draws to see the timeline.</p>
      </div>
    )
  }

  return (
    <div ref={(node) => { (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node; measuredRef(node) }} className="relative w-full overflow-x-auto rounded-xl border border-[var(--dynasty-tan)]/40 bg-white/80 p-4 shadow-sm">
      <svg
        width={svgWidth}
        height={svgH}
        viewBox={`0 0 ${svgWidth} ${svgH}`}
        className="select-none overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* ── Grid lines ── */}
        {axisTicks.map((tick) => {
          const x = toX(tick.ms)
          return (
            <line
              key={tick.ms}
              x1={x} y1={0} x2={x} y2={lanes * LANE_H}
              stroke="#E5E0D0" strokeWidth={1} strokeDasharray="4 3"
            />
          )
        })}

        {/* ── Lane background stripes ── */}
        {Array.from({ length: lanes }).map((_, i) => (
          <rect
            key={i}
            x={0} y={i * LANE_H}
            width={svgWidth} height={LANE_H}
            fill={i % 2 === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(240,236,220,0.25)'}
          />
        ))}

        {/* ── Today line ── */}
        {showToday && (() => {
          const tx = toX(todayMs)
          return (
            <g>
              <line
                x1={tx} y1={0} x2={tx} y2={lanes * LANE_H + AXIS_H - 4}
                stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 3"
              />
              <rect x={tx - 18} y={lanes * LANE_H + 1} width={36} height={14} rx={3} fill="#EF4444" />
              <text x={tx} y={lanes * LANE_H + 11} textAnchor="middle" fill="#fff" fontSize={8} fontWeight="700">TODAY</text>
            </g>
          )
        })()}

        {/* ── Draw bars ── */}
        {bars.map((bar) => {
          const x1    = toX(bar.startMs)
          const x2    = toX(bar.endMs)
          const barW  = Math.max(MIN_BAR_W, x2 - x1)
          const y     = bar.lane * LANE_H + (LANE_H - BAR_H) / 2
          const { bar: fill, label: labelFill, border } = bar.color
          const durationDays = Math.round((bar.endMs - bar.startMs) / 86_400_000)
          const showLabel    = barW > 60

          return (
            <g
              key={bar.draw.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => handleMouseEnter(bar, e)}
            >
              {/* Shadow */}
              <rect
                x={x1 + 2} y={y + 3}
                width={barW} height={BAR_H}
                rx={6} fill="rgba(0,0,0,0.08)"
              />
              {/* Main bar */}
              <rect
                x={x1} y={y}
                width={barW} height={BAR_H}
                rx={6}
                fill={fill}
                stroke={border}
                strokeWidth={1.5}
              />
              {/* Left accent strip */}
              <rect
                x={x1} y={y}
                width={5} height={BAR_H}
                rx={4} fill={border}
              />
              {/* Label — name */}
              {showLabel && (
                <text
                  x={x1 + 10} y={y + 12}
                  fill={labelFill}
                  fontSize={10}
                  fontWeight="700"
                  fontFamily="inherit"
                >
                  <tspan>{truncate(bar.draw.name, Math.floor(barW / 6.5))}</tspan>
                </text>
              )}
              {/* Label — amount */}
              {showLabel && (
                <text
                  x={x1 + 10} y={y + 24}
                  fill={labelFill}
                  fontSize={9}
                  fontWeight="500"
                  opacity={0.8}
                  fontFamily="inherit"
                >
                  {formatCurrency(bar.draw.amount)} · {durationDays}d
                </text>
              )}
            </g>
          )
        })}

        {/* ── Date axis ── */}
        <rect
          x={0} y={lanes * LANE_H}
          width={svgWidth} height={AXIS_H}
          fill="#1A2744" rx={0}
        />
        {axisTicks.map((tick) => {
          const x = toX(tick.ms)
          return (
            <g key={tick.ms}>
              <line
                x1={x} y1={lanes * LANE_H} x2={x} y2={lanes * LANE_H + 5}
                stroke="#F5C842" strokeWidth={1.5}
              />
              <text
                x={x + 4} y={lanes * LANE_H + 22}
                fill="#F8F7F2" fontSize={10} fontWeight="600" fontFamily="inherit"
              >
                {tick.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* ── Floating tooltip ── */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 w-56 rounded-lg border border-[var(--dynasty-tan)]/40 bg-[var(--dynasty-navy)] p-3 text-[#F8F7F2] shadow-xl"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            // Flip left if near right edge
            transform: tooltip.x > svgWidth - 240 ? 'translateX(-110%)' : undefined,
          }}
        >
          <p className="mb-1 font-display text-sm font-black leading-tight">{tooltip.draw.name}</p>
          {tooltip.draw.description && (
            <p className="mb-2 text-xs text-[#F8F7F2]/65 leading-snug">{tooltip.draw.description}</p>
          )}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-[var(--dynasty-gold)] font-semibold">Amount</span>
            <span>{formatCurrency(tooltip.draw.amount)}</span>
            <span className="text-[var(--dynasty-gold)] font-semibold">Status</span>
            <span className="capitalize">{getDrawStatusLabel(tooltip.draw.status)}</span>
            <span className="text-[var(--dynasty-gold)] font-semibold">Start</span>
            <span>{formatAxisDate(tooltip.startMs)}</span>
            <span className="text-[var(--dynasty-gold)] font-semibold">End</span>
            <span>{formatAxisDate(tooltip.endMs)}</span>
            <span className="text-[var(--dynasty-gold)] font-semibold">Duration</span>
            <span>{Math.round((tooltip.endMs - tooltip.startMs) / 86_400_000)} days</span>
            {tooltip.draw.lender && (
              <>
                <span className="text-[var(--dynasty-gold)] font-semibold">Lender</span>
                <span>{tooltip.draw.lender}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 px-1">
        {Object.entries(STATUS_COLOR).map(([status, { bar, border }]) => (
          <span key={status} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--dynasty-black)]/60">
            <span
              className="inline-block h-3 w-6 rounded-sm"
              style={{ background: bar, border: `1.5px solid ${border}` }}
            />
            {getDrawStatusLabel(status)}
          </span>
        ))}
        {showToday && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--dynasty-black)]/60">
            <span className="inline-block h-3 w-0.5 bg-red-500" />
            Today
          </span>
        )}
      </div>
    </div>
  )
}

function truncate(text: string, maxChars: number): string {
  if (maxChars <= 3) return ''
  return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text
}
