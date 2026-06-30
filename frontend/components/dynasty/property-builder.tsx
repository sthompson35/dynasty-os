'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, BadgeDollarSign, CheckCircle2, Copy, Eraser, Hammer, Home, Info, LayoutGrid, Map, Minus, MousePointer2, Plus, Ruler, ShieldAlert, Trash2, Trees, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PropertyDTO, formatCompactCurrency, formatCurrency, formatNumber, formatPercent, getPropertyDisplayName, getTypeLabel } from '@/lib/property-utils'
import { RehabItemDTO, serializeRehabItem } from '@/lib/rehab-utils'
import {
  Block,
  BuilderMetrics,
  BuilderMode,
  FEET_PER_CELL,
  GRID,
  MIN_CELLS,
  ProFormaInputs,
  TEMPLATES,
  blockAreaSqft,
  buildRehabLineItems,
  buildTemplate,
  clamp,
  computeMetrics,
  computeDevelopmentIntelligence,
  computeProForma,
  defaultProForma,
  findSpot,
  getBlockType,
  newBlockId,
  paletteFor,
} from '@/lib/builder-utils'
import { getBuilderStorageKey } from '@/lib/twin-utils'

type BlocksByMode = { remodel: Block[]; land: Block[] }

type DragState = {
  id: string
  type: 'move' | 'resize'
  mode: BuilderMode
  startX: number
  startY: number
  orig: { x: number; y: number; w: number; h: number }
}

export function PropertyBuilder(props: {
  property: PropertyDTO
  onRehabItemsCreated?: (items: RehabItemDTO[]) => void
  onNavigateToTab?: (tab: string) => void
}) {
  const storageKey = getBuilderStorageKey(props.property.id)

  const [mode, setMode] = useState<BuilderMode>('remodel')
  const [blocksByMode, setBlocksByMode] = useState<BlocksByMode>({ remodel: [], land: [] })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [cellPx, setCellPx] = useState(16)
  const [proForma, setProForma] = useState<ProFormaInputs>(() => defaultProForma(props.property))
  const [isSending, setIsSending] = useState(false)

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const cellPxRef = useRef(cellPx)

  useEffect(() => {
    cellPxRef.current = cellPx
  }, [cellPx])

  const blocks = blocksByMode[mode]
  const selected = blocks.find((b) => b.id === selectedId) ?? null
  const metrics = useMemo(() => computeMetrics(blocks, mode), [blocks, mode])

  // --- load / persist (client only) ----------------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      const defaults = defaultProForma(props.property)
      if (raw) {
        const saved = JSON.parse(raw)
        setMode(saved?.mode === 'land' ? 'land' : 'remodel')
        setBlocksByMode({
          remodel: Array.isArray(saved?.remodel) ? saved.remodel : [],
          land: Array.isArray(saved?.land) ? saved.land : [],
        })
        if (saved?.proForma && typeof saved.proForma === 'object') {
          setProForma({ ...defaults, ...saved.proForma })
        } else {
          setProForma(defaults)
        }
      } else {
        // First visit: seed friendly starters so the canvas feels alive.
        setBlocksByMode({ remodel: buildTemplate('starter-home'), land: buildTemplate('three-lot') })
        setProForma(defaults)
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return
    try {
      const state = { mode, ...blocksByMode, proForma }
      window.localStorage.setItem(storageKey, JSON.stringify(state))
      window.dispatchEvent(new CustomEvent('dynasty-builder-sync', { detail: { propertyId: props.property.id, state } }))
    } catch {
      /* storage may be unavailable */
    }
  }, [hydrated, storageKey, mode, blocksByMode, proForma])

  // --- responsive grid sizing ----------------------------------------------
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const apply = () => setCellPx(Math.max(9, Math.floor(el.clientWidth / GRID.cols)))
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // --- global drag listeners (attached once) -------------------------------
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const cell = cellPxRef.current || 1
      const dx = Math.round((e.clientX - d.startX) / cell)
      const dy = Math.round((e.clientY - d.startY) / cell)
      setBlocksByMode((prev) => {
        const list = prev[d.mode].map((b) => {
          if (b.id !== d.id) return b
          if (d.type === 'move') {
            return {
              ...b,
              x: clamp(d.orig.x + dx, 0, GRID.cols - b.w),
              y: clamp(d.orig.y + dy, 0, GRID.rows - b.h),
            }
          }
          return {
            ...b,
            w: clamp(d.orig.w + dx, MIN_CELLS, GRID.cols - b.x),
            h: clamp(d.orig.h + dy, MIN_CELLS, GRID.rows - b.y),
          }
        })
        return { ...prev, [d.mode]: list }
      })
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  // --- mutations ------------------------------------------------------------
  const updateBlocks = (updater: (list: Block[]) => Block[]) => {
    setBlocksByMode((prev) => ({ ...prev, [mode]: updater(prev[mode]) }))
  }

  const addBlock = (kind: string) => {
    const type = getBlockType(kind)
    if (!type) return
    const spot = findSpot(blocks, type.defaultW, type.defaultH)
    const block: Block = { id: newBlockId(), kind, label: type.label, x: spot.x, y: spot.y, w: type.defaultW, h: type.defaultH }
    updateBlocks((list) => [...list, block])
    setSelectedId(block.id)
  }

  const duplicateSelected = () => {
    if (!selected) return
    const spot = findSpot(blocks, selected.w, selected.h)
    const copy: Block = { ...selected, id: newBlockId(), x: spot.x, y: spot.y }
    updateBlocks((list) => [...list, copy])
    setSelectedId(copy.id)
  }

  const deleteSelected = () => {
    if (!selected) return
    updateBlocks((list) => list.filter((b) => b.id !== selected.id))
    setSelectedId(null)
  }

  const resizeSelected = (dw: number, dh: number) => {
    if (!selected) return
    updateBlocks((list) =>
      list.map((b) =>
        b.id === selected.id
          ? { ...b, w: clamp(b.w + dw, MIN_CELLS, GRID.cols - b.x), h: clamp(b.h + dh, MIN_CELLS, GRID.rows - b.y) }
          : b,
      ),
    )
  }

  const renameSelected = (value: string) => {
    if (!selected) return
    updateBlocks((list) => list.map((b) => (b.id === selected.id ? { ...b, label: value } : b)))
  }

  const loadTemplate = (id: string) => {
    setBlocksByMode((prev) => ({ ...prev, [mode]: buildTemplate(id) }))
    setSelectedId(null)
  }

  const clearAll = () => {
    updateBlocks(() => [])
    setSelectedId(null)
  }

  const updateProForma = (field: keyof ProFormaInputs, value: number) => {
    setProForma((prev) => ({ ...prev, [field]: value }))
  }

  const resetProForma = () => setProForma(defaultProForma(props.property))

  const sendRoomsToRehab = async () => {
    const lineItems = buildRehabLineItems(blocksByMode.remodel)
    if (lineItems.length === 0) {
      toast.error('Add some rooms to the remodel layout first.')
      return
    }
    setIsSending(true)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(props.property.id)}/rehab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lineItems }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to add line items.')
      }
      const created = Array.isArray(payload?.items) ? payload.items.map((item: unknown) => serializeRehabItem(item)) : []
      if (created.length > 0) {
        props.onRehabItemsCreated?.(created)
        toast.success(`Added ${created.length} line item${created.length === 1 ? '' : 's'} to your Rehab estimator.`)
        props.onNavigateToTab?.('rehab')
      }
    } catch (error: unknown) {
      console.error('Send rooms to rehab failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to add line items.')
    } finally {
      setIsSending(false)
    }
  }

  const startDrag = (e: React.PointerEvent, block: Block, type: 'move' | 'resize') => {
    e.stopPropagation()
    setSelectedId(block.id)
    dragRef.current = { id: block.id, type, mode, startX: e.clientX, startY: e.clientY, orig: { x: block.x, y: block.y, w: block.w, h: block.h } }
  }

  const ft = FEET_PER_CELL[mode]
  const canvasW = cellPx * GRID.cols
  const canvasH = cellPx * GRID.rows

  return (
    <div className="space-y-5">
      {/* intro / context */}
      <div className="rounded-xl border border-[var(--dynasty-navy)]/10 bg-[var(--dynasty-navy)] p-5 text-[#F8F7F2] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-[var(--dynasty-gold)]" />
              <h3 className="font-display text-xl font-black tracking-tight">Layout builder</h3>
              <span className="rounded-full bg-[var(--dynasty-gold)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[var(--dynasty-navy)]">Preview</span>
            </div>
            <p className="mt-1 text-sm text-[#F8F7F2]/70">
              Sketch a {mode === 'remodel' ? 'floor plan' : 'site plan'} for {getPropertyDisplayName(props.property)} · {getTypeLabel(props.property.propertyType)}
            </p>
          </div>
          {/* mode toggle */}
          <div className="inline-flex rounded-lg bg-white/10 p-1">
            <button
              type="button"
              onClick={() => { setMode('remodel'); setSelectedId(null) }}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-colors ${mode === 'remodel' ? 'bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)]' : 'text-[#F8F7F2] hover:bg-white/10'}`}
            >
              <Home className="h-4 w-4" /> Remodel
            </button>
            <button
              type="button"
              onClick={() => { setMode('land'); setSelectedId(null) }}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-colors ${mode === 'land' ? 'bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)]' : 'text-[#F8F7F2] hover:bg-white/10'}`}
            >
              <Trees className="h-4 w-4" /> Land / development
            </button>
          </div>
        </div>
      </div>

      {/* palette + actions */}
      <Card className="border-[var(--dynasty-navy)]/10">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wide text-[var(--dynasty-navy)]/55">{mode === 'remodel' ? 'Add a room' : 'Add to the site'}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Select onValueChange={loadTemplate}>
                <SelectTrigger className="h-9 w-[190px] text-sm"><SelectValue placeholder="Load a template…" /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES[mode].map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={clearAll} className="gap-1.5">
                <Eraser className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {paletteFor(mode).map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => addBlock(type.id)}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: type.fill, borderColor: type.border, color: type.text }}
                title={`Add ${type.label}`}
              >
                <Plus className="h-3.5 w-3.5" /> {type.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* canvas + side panel */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* canvas */}
        <div>
          <div
            ref={wrapRef}
            className="flex justify-center overflow-hidden rounded-xl border border-[var(--dynasty-navy)]/12 bg-[#F8F7F2] p-3 shadow-inner"
          >
            <div
              className="relative select-none rounded-lg"
              style={{
                width: canvasW,
                height: canvasH,
                backgroundColor: mode === 'land' ? '#EDF3E8' : '#FFFFFF',
                backgroundImage:
                  'linear-gradient(to right, rgba(11,31,58,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,31,58,0.07) 1px, transparent 1px)',
                backgroundSize: `${cellPx}px ${cellPx}px`,
                boxShadow: 'inset 0 0 0 1px rgba(11,31,58,0.12)',
                touchAction: 'none',
              }}
              onPointerDown={() => setSelectedId(null)}
            >
              {blocks.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-[var(--dynasty-navy)]/40">
                  <MousePointer2 className="h-6 w-6" />
                  <p className="text-sm font-semibold">Click a {mode === 'remodel' ? 'room' : 'block'} above to start</p>
                  <p className="text-xs">or load a template</p>
                </div>
              )}
              {blocks.map((block) => {
                const type = getBlockType(block.kind)
                if (!type) return null
                const isSel = block.id === selectedId
                const left = block.x * cellPx
                const top = block.y * cellPx
                const w = block.w * cellPx
                const h = block.h * cellPx
                const big = w > 64 && h > 40
                return (
                  <div
                    key={block.id}
                    onPointerDown={(e) => startDrag(e, block, 'move')}
                    className="absolute flex cursor-move flex-col items-center justify-center overflow-hidden rounded-md text-center"
                    style={{
                      left,
                      top,
                      width: w,
                      height: h,
                      backgroundColor: type.fill,
                      border: `${isSel ? 2 : 1}px solid ${isSel ? 'var(--dynasty-gold)' : type.border}`,
                      color: type.text,
                      boxShadow: isSel ? '0 0 0 3px rgba(197,157,61,0.35)' : 'none',
                      touchAction: 'none',
                    }}
                  >
                    <span className="px-1 text-[11px] font-black leading-tight">{block.label}</span>
                    {big && (
                      <span className="px-1 text-[10px] font-semibold opacity-75">
                        {block.w * ft}×{block.h * ft} ft · {formatNumber(blockAreaSqft(block, mode))} sf
                      </span>
                    )}
                    {/* resize handle */}
                    <span
                      onPointerDown={(e) => startDrag(e, block, 'resize')}
                      className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-se-resize rounded-tl-md"
                      style={{ backgroundColor: isSel ? 'var(--dynasty-gold)' : type.border, touchAction: 'none' }}
                      title="Drag to resize"
                    />
                  </div>
                )
              })}
            </div>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--dynasty-navy)]/55">
            <Ruler className="h-3.5 w-3.5" /> 1 square = {ft} ft · drag to move · drag the gold corner to resize
          </p>
        </div>

        {/* side panel */}
        <div className="space-y-4">
          {/* live readout */}
          <Card className="border-[var(--dynasty-navy)]/10">
            <CardContent className="space-y-4 p-4">
              <h4 className="font-display text-base font-black tracking-tight text-[var(--dynasty-navy)]">Live readout</h4>
              <div className="grid grid-cols-2 gap-3">
                <Stat label={mode === 'remodel' ? 'Finished area' : 'Built footprint'} value={`${formatNumber(metrics.totalAreaSqft)} sf`} />
                {mode === 'remodel' ? (
                  <Stat label="Rooms" value={formatNumber(metrics.blockCount)} />
                ) : (
                  <Stat label="Dwelling units" value={formatNumber(metrics.units)} />
                )}
                {mode === 'land' ? (
                  <Stat label="Site coverage" value={`${metrics.coveragePct.toFixed(0)}%`} />
                ) : (
                  <Stat label="Blocks" value={formatNumber(metrics.blockCount)} />
                )}
                <Stat label={metrics.costLabel} value={formatCompactCurrency(metrics.totalCost)} highlight />
              </div>
              {metrics.byKind.length > 0 && (
                <div className="space-y-1.5 border-t border-[var(--dynasty-navy)]/10 pt-3">
                  {metrics.byKind.map((row) => (
                    <div key={row.kind} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-semibold text-[var(--dynasty-navy)]/80">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: row.fill, border: `1px solid ${row.border}` }} />
                        {row.label} {row.count > 1 ? `×${row.count}` : ''}
                      </span>
                      <span className="font-bold text-[var(--dynasty-navy)]">{formatNumber(row.areaSqft)} sf</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* selected block controls */}
          {selected ? (
            <Card className="border-[var(--dynasty-gold)]/40 bg-[var(--dynasty-gold)]/5">
              <CardContent className="space-y-3 p-4">
                <h4 className="font-display text-base font-black tracking-tight text-[var(--dynasty-navy)]">Selected block</h4>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--dynasty-navy)]/60">Label</label>
                  <Input value={selected.label} onChange={(e) => renameSelected(e.target.value)} className="h-9" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Stepper label="Width" value={`${selected.w * ft} ft`} onDec={() => resizeSelected(-1, 0)} onInc={() => resizeSelected(1, 0)} />
                  <Stepper label="Depth" value={`${selected.h * ft} ft`} onDec={() => resizeSelected(0, -1)} onInc={() => resizeSelected(0, 1)} />
                </div>
                <div className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2 text-xs">
                  <span className="font-semibold text-[var(--dynasty-navy)]/70">{formatNumber(blockAreaSqft(selected, mode))} sf</span>
                  <span className="font-bold text-[var(--dynasty-navy)]">{formatCompactCurrency(blockAreaSqft(selected, mode) * (getBlockType(selected.kind)?.costPerSqft ?? 0))}</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={duplicateSelected} className="flex-1 gap-1.5"><Copy className="h-4 w-4" /> Duplicate</Button>
                  <Button type="button" variant="outline" size="sm" onClick={deleteSelected} className="flex-1 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /> Delete</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-[var(--dynasty-navy)]/20 bg-transparent">
              <CardContent className="flex items-center gap-3 p-4 text-sm text-[var(--dynasty-navy)]/60">
                <MousePointer2 className="h-4 w-4 shrink-0" />
                Select a block on the canvas to rename, resize, duplicate, or delete it.
              </CardContent>
            </Card>
          )}

          {/* mode-specific integration */}
          {mode === 'remodel' ? (
            <Card className="border-[var(--dynasty-gold)]/30 bg-[var(--dynasty-navy)] text-[#F8F7F2]">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-[var(--dynasty-gold)]" />
                  <h4 className="font-display text-base font-black tracking-tight">Push to Rehab estimator</h4>
                </div>
                <p className="text-xs leading-5 text-[#F8F7F2]/75">
                  Turn every room you drew into editable scope line items, priced by finished square foot. This adds to your existing estimate.
                </p>
                <div className="flex items-center justify-between rounded-md bg-white/10 px-3 py-2 text-xs">
                  <span className="font-semibold text-[#F8F7F2]/80">{formatNumber(metrics.blockCount)} room{metrics.blockCount === 1 ? '' : 's'} · {formatNumber(metrics.totalAreaSqft)} sf</span>
                  <span className="font-black text-[var(--dynasty-gold)]">{formatCompactCurrency(metrics.totalCost)}</span>
                </div>
                <Button type="button" onClick={sendRoomsToRehab} loading={isSending} disabled={metrics.blockCount === 0} className="w-full bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[#d8ad48]">
                  <ArrowRight className="h-4 w-4" /> Send rooms to Rehab estimator
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ProFormaPanel inputs={proForma} onChange={updateProForma} onReset={resetProForma} metrics={metrics} />
          )}

          {/* roadmap teaser */}
          <div className="flex gap-3 rounded-xl border border-[var(--dynasty-tan)]/40 bg-[var(--dynasty-tan)]/12 p-4">
            <Info className="h-4 w-4 shrink-0 text-[var(--dynasty-gold)]" />
            <p className="text-xs leading-5 text-[var(--dynasty-navy)]/75">
              <strong>3D Twin sync:</strong> this plan now broadcasts to the 3D Twin, where it appears as extruded site or room geometry.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat(props: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${props.highlight ? 'bg-[var(--dynasty-gold)]/15' : 'bg-[var(--dynasty-navy)]/[0.04]'}`}>
      <div className="text-[10px] font-black uppercase tracking-wide text-[var(--dynasty-navy)]/50">{props.label}</div>
      <div className={`mt-0.5 font-display text-lg font-black tracking-tight ${props.highlight ? 'text-[var(--dynasty-gold)]' : 'text-[var(--dynasty-navy)]'}`}>{props.value}</div>
    </div>
  )
}

function ProFormaRow(props: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={props.strong ? 'font-bold text-[var(--dynasty-navy)]' : 'text-[var(--dynasty-navy)]/60'}>{props.label}</span>
      <span className={props.strong ? 'font-black text-[var(--dynasty-navy)]' : props.muted ? 'font-semibold text-[var(--dynasty-navy)]/55' : 'font-semibold text-[var(--dynasty-navy)]/85'}>{props.value}</span>
    </div>
  )
}

function ProFormaPanel(props: {
  inputs: ProFormaInputs
  onChange: (field: keyof ProFormaInputs, value: number) => void
  onReset: () => void
  metrics: BuilderMetrics
}) {
  const r = computeProForma(props.inputs, props.metrics)
  const intelligence = computeDevelopmentIntelligence(props.inputs, props.metrics)
  const profitColor = r.tone === 'good' ? 'text-emerald-300' : r.tone === 'bad' ? 'text-red-300' : 'text-[var(--dynasty-gold)]'

  const field = (label: string, key: keyof ProFormaInputs, opts?: { prefix?: string; suffix?: string; step?: number }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase tracking-wide text-[var(--dynasty-navy)]/55">{label}</label>
      <div className="flex items-center rounded-md border border-[var(--dynasty-navy)]/15 bg-white focus-within:border-[var(--dynasty-gold)]">
        {opts?.prefix && <span className="pl-2 text-xs font-bold text-[var(--dynasty-navy)]/45">{opts.prefix}</span>}
        <Input
          type="number"
          min="0"
          step={opts?.step ?? 1}
          value={props.inputs[key]}
          onChange={(e) => props.onChange(key, Number(e.target.value) || 0)}
          className="h-9 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
        />
        {opts?.suffix && <span className="pr-2 text-xs font-bold text-[var(--dynasty-navy)]/45">{opts.suffix}</span>}
      </div>
    </div>
  )

  return (
    <Card className="border-[var(--dynasty-navy)]/10">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--dynasty-gold)]" />
            <h4 className="font-display text-base font-black tracking-tight text-[var(--dynasty-navy)]">Development pro forma</h4>
          </div>
          <button type="button" onClick={props.onReset} className="text-[10px] font-black uppercase tracking-wide text-[var(--dynasty-navy)]/45 hover:text-[var(--dynasty-gold)]">Reset</button>
        </div>

        <div className="rounded-lg bg-[var(--dynasty-navy)] p-4 text-[#F8F7F2]">
          <p className="text-[10px] font-black uppercase tracking-wide text-[var(--dynasty-gold)]">Projected net profit</p>
          <p className={`font-display text-3xl font-black tracking-tight ${profitColor}`}>{formatCurrency(r.netProfit)}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#F8F7F2]/85">
            <span>ROI <strong className="text-[var(--dynasty-gold)]">{formatPercent(r.roi)}</strong></span>
            <span>Margin <strong className="text-[var(--dynasty-gold)]">{formatPercent(r.margin)}</strong></span>
            <span>{formatNumber(r.units)} unit{r.units === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {field('Land cost', 'landCost', { prefix: '$', step: 1000 })}
          {field('Sale price / unit', 'sellPricePerUnit', { prefix: '$', step: 1000 })}
          {field('Soft costs', 'softCostPct', { suffix: '%' })}
          {field('Contingency', 'contingencyPct', { suffix: '%' })}
          {field('Selling costs', 'sellingCostPct', { suffix: '%' })}
        </div>

        <div className="rounded-lg border border-[var(--dynasty-navy)]/10 bg-[var(--dynasty-navy)]/[0.03] p-3">
          <div className="mb-2 flex items-center gap-2">
            <Map className="h-4 w-4 text-[var(--dynasty-gold)]" />
            <h5 className="text-xs font-black uppercase tracking-wide text-[var(--dynasty-navy)]/65">Infrastructure calculator</h5>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field('Roads', 'roadCost', { prefix: '$', step: 1000 })}
            {field('Water', 'waterCost', { prefix: '$', step: 1000 })}
            {field('Sewer', 'sewerCost', { prefix: '$', step: 1000 })}
            {field('Stormwater', 'stormwaterCost', { prefix: '$', step: 1000 })}
            {field('Electric', 'electricCost', { prefix: '$', step: 1000 })}
            {field('Gas / internet', 'gasInternetCost', { prefix: '$', step: 1000 })}
            {field('Site work', 'siteWorkCost', { prefix: '$', step: 1000 })}
            {field('Walks / lights', 'sidewalksLightsCost', { prefix: '$', step: 1000 })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--dynasty-navy)]/10 bg-[var(--dynasty-navy)]/[0.03] p-3">
          <div className="mb-2 flex items-center gap-2">
            <BadgeDollarSign className="h-4 w-4 text-[var(--dynasty-gold)]" />
            <h5 className="text-xs font-black uppercase tracking-wide text-[var(--dynasty-navy)]/65">Development capital stack</h5>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field('Equity', 'equityPct', { suffix: '%' })}
            {field('Debt rate', 'debtRate', { suffix: '%' })}
            {field('LP pref', 'lpPreferredReturn', { suffix: '%' })}
            {field('GP promote', 'gpPromotePct', { suffix: '%' })}
          </div>
        </div>

        <div className="space-y-1.5 border-t border-[var(--dynasty-navy)]/10 pt-3 text-xs">
          <ProFormaRow label={`Hard build cost · ${formatNumber(props.metrics.totalAreaSqft)} sf`} value={formatCurrency(r.hardBuildCost)} />
          <ProFormaRow label="Land" value={formatCurrency(r.landCost)} />
          <ProFormaRow label="Soft costs" value={formatCurrency(r.softCost)} />
          <ProFormaRow label="Contingency" value={formatCurrency(r.contingency)} />
          <ProFormaRow label="Infrastructure" value={formatCurrency(r.infrastructureCost)} />
          <ProFormaRow label="Total project cost" value={formatCurrency(r.totalProjectCost)} strong />
          <ProFormaRow label="Gross revenue" value={formatCurrency(r.grossRevenue)} />
          <ProFormaRow label="Selling costs" value={`(${formatCurrency(r.sellingCosts)})`} muted />
          {r.units > 0 && <ProFormaRow label="All-in cost / unit" value={formatCurrency(r.costPerUnit)} muted />}
        </div>

        <DeveloperIntelligencePanel intelligence={intelligence} />

        {r.units === 0 && (
          <div className="flex gap-2 rounded-md bg-[var(--dynasty-tan)]/14 p-3 text-[11px] leading-4 text-[var(--dynasty-navy)]/70">
            <Info className="h-3.5 w-3.5 shrink-0 text-[var(--dynasty-gold)]" />
            Add residential blocks (single-family, duplex, townhome) to project revenue, ROI, and margin.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DeveloperIntelligencePanel(props: { intelligence: ReturnType<typeof computeDevelopmentIntelligence> }) {
  const zoning = props.intelligence.zoning
  const risk = props.intelligence.risk
  const capital = props.intelligence.capital
  const bestUse = props.intelligence.hbuOptions[0]
  const bestSplit = [...props.intelligence.splitScenarios].sort((a, b) => b.roi - a.roi)[0]
  const zoningTone =
    zoning.status === 'pass'
      ? 'bg-emerald-50 text-emerald-800'
      : zoning.status === 'warning'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-red-50 text-red-800'
  const riskTone =
    risk.label === 'Low'
      ? 'text-emerald-700'
      : risk.label === 'Medium'
        ? 'text-amber-700'
        : 'text-red-700'

  return (
    <div className="space-y-3 rounded-lg border border-[var(--dynasty-navy)]/10 bg-white/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[var(--dynasty-gold)]" />
          <h5 className="text-xs font-black uppercase tracking-wide text-[var(--dynasty-navy)]/65">Development intelligence</h5>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${zoningTone}`}>
          {zoning.status === 'pass' ? 'Zoning pass' : zoning.status === 'warning' ? 'Zoning warning' : 'Zoning fail'}
        </span>
      </div>

      <div className="grid gap-2">
        <IntelCard
          icon={zoning.status === 'pass' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          title="Zoning validation"
          value={`${formatNumber(zoning.maxUnits)} max units`}
          detail={`${zoning.densityUsed.toFixed(1)} units/acre | ${zoning.warnings[0] ?? 'Density, lot size, and coverage pass concept checks.'}`}
        />
        <IntelCard
          icon={<Map className="h-4 w-4" />}
          title="Best lot split"
          value={bestSplit ? `${bestSplit.lots} lots` : 'No split'}
          detail={bestSplit ? `${formatNumber(bestSplit.lotSqft)} sf/lot | ${formatCurrency(bestSplit.profit)} profit | ${formatPercent(bestSplit.roi)} ROI` : 'Add a site plan to evaluate splits.'}
        />
        <IntelCard
          icon={<TrendingUp className="h-4 w-4" />}
          title="Highest & best use"
          value={bestUse ? bestUse.label : 'No product'}
          detail={bestUse ? `${formatNumber(bestUse.units)} units | ${formatCurrency(bestUse.profit)} profit | ${formatPercent(bestUse.roi)} ROI` : 'Set sale price and units to rank uses.'}
        />
        <IntelCard
          icon={<ShieldAlert className="h-4 w-4" />}
          title="Development risk"
          value={risk.label}
          detail={risk.factors[0]?.label ?? 'No major risk flags from current assumptions.'}
          valueClass={riskTone}
        />
        <IntelCard
          icon={<BadgeDollarSign className="h-4 w-4" />}
          title="Capital stack"
          value={`${formatCurrency(capital.requiredEquity)} equity`}
          detail={`${formatCurrency(capital.requiredDebt)} debt | ${capital.equityMultiple.toFixed(2)}x equity multiple`}
        />
      </div>

      <div className="space-y-1.5 border-t border-[var(--dynasty-navy)]/10 pt-3">
        {props.intelligence.hbuOptions.slice(0, 3).map((option) => (
          <div key={option.productType} className="flex items-center justify-between rounded-md bg-[var(--dynasty-navy)]/[0.04] px-2 py-1.5 text-[11px]">
            <span className="font-bold text-[var(--dynasty-navy)]">#{option.rank} {option.label}</span>
            <span className={option.feasible ? 'font-black text-emerald-700' : 'font-black text-red-700'}>{formatPercent(option.roi)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function IntelCard(props: { icon: React.ReactNode; title: string; value: string; detail: string; valueClass?: string }) {
  return (
    <div className="rounded-lg bg-[var(--dynasty-navy)]/[0.04] p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--dynasty-navy)]/50">
        <span className="text-[var(--dynasty-gold)]">{props.icon}</span>
        {props.title}
      </div>
      <div className={`mt-1 font-display text-base font-black tracking-tight ${props.valueClass ?? 'text-[var(--dynasty-navy)]'}`}>{props.value}</div>
      <div className="mt-0.5 text-[11px] font-semibold leading-4 text-[var(--dynasty-navy)]/55">{props.detail}</div>
    </div>
  )
}

function Stepper(props: { label: string; value: string; onDec: () => void; onInc: () => void }) {
  return (
    <div className="flex-1">
      <div className="text-[10px] font-black uppercase tracking-wide text-[var(--dynasty-navy)]/50">{props.label}</div>
      <div className="mt-1 flex items-center gap-1">
        <button type="button" onClick={props.onDec} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--dynasty-navy)]/20 bg-white text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-navy)]/5"><Minus className="h-3.5 w-3.5" /></button>
        <span className="min-w-[44px] text-center text-xs font-bold text-[var(--dynasty-navy)]">{props.value}</span>
        <button type="button" onClick={props.onInc} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--dynasty-navy)]/20 bg-white text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-navy)]/5"><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}
