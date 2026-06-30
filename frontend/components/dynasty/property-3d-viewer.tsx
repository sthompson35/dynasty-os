'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  Box,
  ChartNoAxesCombined,
  Compass,
  ExternalLink,
  Eye,
  EyeOff,
  GitCompareArrows,
  Hammer,
  Link2,
  Loader2,
  Maximize2,
  Moon,
  MonitorOff,
  Pause,
  RotateCw,
  Route,
  ShieldAlert,
  Sun,
  Trash2,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RehabItemDTO } from '@/lib/rehab-utils'
import { PropertyDTO, formatCompactCurrency, formatCurrency, formatPercent, getTypeLabel } from '@/lib/property-utils'
import { buildTourEmbed } from '@/lib/tour-utils'
import { TwinBuilderState, TwinOverlayMode, buildTwinModel, parseTwinBuilderState, readTwinBuilderState } from '@/lib/twin-utils'
import { WebGLErrorBoundary, isWebGLAvailable } from '@/components/dynasty/webgl-boundary'

function SceneSkeleton() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#e9edf3] to-[#d9dfe8]">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--dynasty-navy)]" />
      <p className="text-sm font-semibold text-[var(--dynasty-navy)]/70">Rendering digital twin...</p>
    </div>
  )
}

const Property3DScene = dynamic(() => import('./property-3d-scene'), {
  ssr: false,
  loading: () => <SceneSkeleton />,
})

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Unable to parse tour response', error)
    return {}
  }
}

function ControlButton(props: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      title={props.title}
      aria-label={props.title}
      className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
        props.active
          ? 'border-[var(--dynasty-gold)] bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)]'
          : 'border-white/25 bg-[var(--dynasty-navy)]/85 text-[#F8F7F2] hover:bg-[var(--dynasty-navy)]'
      }`}
    >
      {props.children}
    </button>
  )
}

function TwinFact(props: { label: string; value: string; tone?: 'good' | 'watch' | 'risk' }) {
  const toneClass =
    props.tone === 'good'
      ? 'text-emerald-700'
      : props.tone === 'watch'
        ? 'text-orange-700'
        : props.tone === 'risk'
          ? 'text-red-700'
          : 'text-[var(--dynasty-navy)]'
  return (
    <div className="rounded-lg bg-[#F8F7F2] p-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--dynasty-black)]/45">{props.label}</p>
      <p className={`mt-1 font-display text-lg font-black ${toneClass}`}>{props.value}</p>
    </div>
  )
}

export function Property3DViewer(props: {
  property: PropertyDTO
  rehabItems?: RehabItemDTO[]
  onTourSaved?: (property: PropertyDTO) => void
  onNavigateToTab?: (tab: string) => void
}) {
  const [view, setView] = useState<'model' | 'tour'>('model')
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [dusk, setDusk] = useState(false)
  const [showHotspots, setShowHotspots] = useState(true)
  const [resetSignal, setResetSignal] = useState(0)
  const [overlayMode, setOverlayMode] = useState<TwinOverlayMode>('metrics')
  const [builderState, setBuilderState] = useState<TwinBuilderState | null>(null)

  const [tourUrl, setTourUrl] = useState<string | null>(props.property.virtualTourUrl)
  const [tourInput, setTourInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const embed = useMemo(() => (tourUrl ? buildTourEmbed(tourUrl) : null), [tourUrl])
  const previewEmbed = useMemo(() => (tourInput.trim() ? buildTourEmbed(tourInput) : null), [tourInput])
  const twin = useMemo(
    () => buildTwinModel(props.property, props.rehabItems ?? [], builderState),
    [props.property, props.rehabItems, builderState],
  )

  useEffect(() => {
    setWebgl(isWebGLAvailable())
  }, [])

  useEffect(() => {
    setBuilderState(readTwinBuilderState(props.property.id))
    const handleBuilderSync = (event: Event) => {
      const custom = event as CustomEvent<{ propertyId?: string; state?: unknown }>
      if (custom.detail?.propertyId !== props.property.id) return
      setBuilderState(parseTwinBuilderState(custom.detail?.state))
    }
    const handleStorage = (event: StorageEvent) => {
      if (!event.key?.endsWith(props.property.id)) return
      try {
        setBuilderState(event.newValue ? parseTwinBuilderState(JSON.parse(event.newValue)) : null)
      } catch {
        setBuilderState(null)
      }
    }
    window.addEventListener('dynasty-builder-sync', handleBuilderSync)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('dynasty-builder-sync', handleBuilderSync)
      window.removeEventListener('storage', handleStorage)
    }
  }, [props.property.id])

  const webglFallback = (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-[var(--dynasty-navy)] to-[#0a1830] px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
        <MonitorOff className="h-7 w-7 text-[var(--dynasty-gold)]" />
      </div>
      <div>
        <h4 className="font-display text-xl font-black text-[#F8F7F2]">3D preview unavailable on this device</h4>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#F8F7F2]/70">
          The interactive model needs 3D graphics (WebGL). You can still link and view a real walkthrough.
        </p>
      </div>
      <Button type="button" onClick={() => setView('tour')} className="bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] hover:bg-[var(--dynasty-gold)]/90">
        <Video className="h-4 w-4" /> Open virtual tour
      </Button>
    </div>
  )

  const saveTour = async (nextValue: string) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(props.property.id)}/tour`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ virtualTourUrl: nextValue }),
      })
      const payload = await safeJson(response)
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to save the tour link.')
      }
      const saved = payload?.property as PropertyDTO | undefined
      const savedUrl = saved?.virtualTourUrl ?? (nextValue ? nextValue : null)
      setTourUrl(savedUrl)
      setTourInput('')
      if (saved && props.onTourSaved) props.onTourSaved(saved)
      toast.success(nextValue ? 'Virtual tour linked.' : 'Virtual tour removed.')
    } catch (error: unknown) {
      console.error('Save tour failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to save the tour link.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTour = () => {
    if (!previewEmbed) {
      toast.error('Please paste a valid https tour link.')
      return
    }
    void saveTour(previewEmbed.originalUrl)
  }

  const valueLabel = props.property.currentValue ?? props.property.purchasePrice
  const overlays: { mode: TwinOverlayMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'metrics', label: 'Metrics', icon: <ChartNoAxesCombined className="h-4 w-4" /> },
    { mode: 'condition', label: 'Condition', icon: <ShieldAlert className="h-4 w-4" /> },
    { mode: 'rehab', label: 'Rehab', icon: <Hammer className="h-4 w-4" /> },
    { mode: 'progress', label: 'Progress', icon: <Route className="h-4 w-4" /> },
    { mode: 'compare', label: 'Before / After', icon: <GitCompareArrows className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg bg-[#F8F7F2] p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setView('model')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors ${
            view === 'model' ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2] shadow-sm' : 'text-[var(--dynasty-navy)] hover:bg-white'
          }`}
        >
          <Box className="h-4 w-4" /> 3D digital twin
        </button>
        <button
          type="button"
          onClick={() => setView('tour')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors ${
            view === 'tour' ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2] shadow-sm' : 'text-[var(--dynasty-navy)] hover:bg-white'
          }`}
        >
          <Video className="h-4 w-4" /> Virtual tour {tourUrl ? 'linked' : ''}
        </button>
      </div>

      {view === 'model' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--dynasty-navy)]/10 bg-[#F8F7F2] p-2 shadow-sm">
            {overlays.map((overlay) => (
              <button
                key={overlay.mode}
                type="button"
                onClick={() => setOverlayMode(overlay.mode)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-black transition-colors ${
                  overlayMode === overlay.mode
                    ? 'bg-[var(--dynasty-navy)] text-[#F8F7F2]'
                    : 'text-[var(--dynasty-navy)] hover:bg-white'
                }`}
              >
                {overlay.icon} {overlay.label}
              </button>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => props.onNavigateToTab?.('builder')} className="ml-auto text-[var(--dynasty-navy)] hover:bg-white">
              <Box className="h-4 w-4" /> Sync Builder
            </Button>
          </div>

          <div className="relative h-[460px] overflow-hidden rounded-xl border border-[var(--dynasty-navy)]/10 shadow-lg sm:h-[560px]">
            {webgl === null && <SceneSkeleton />}
            {webgl === false && webglFallback}
            {webgl === true && (
              <>
                <div className="absolute inset-0">
                  <WebGLErrorBoundary fallback={webglFallback}>
                    <Property3DScene
                      property={props.property}
                      twin={twin}
                      overlayMode={overlayMode}
                      autoRotate={autoRotate}
                      dusk={dusk}
                      showHotspots={showHotspots}
                      resetSignal={resetSignal}
                    />
                  </WebGLErrorBoundary>
                </div>
                <div className="absolute right-3 top-3 flex flex-col gap-2">
                  <ControlButton active={autoRotate} onClick={() => setAutoRotate((v) => !v)} title={autoRotate ? 'Pause auto-rotate' : 'Auto-rotate'}>
                    {autoRotate ? <Pause className="h-4 w-4" /> : <RotateCw className="h-4 w-4" />}
                  </ControlButton>
                  <ControlButton active={dusk} onClick={() => setDusk((v) => !v)} title={dusk ? 'Switch to day' : 'Switch to dusk'}>
                    {dusk ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </ControlButton>
                  <ControlButton active={showHotspots} onClick={() => setShowHotspots((v) => !v)} title={showHotspots ? 'Hide metrics' : 'Show metrics'}>
                    {showHotspots ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </ControlButton>
                  <ControlButton onClick={() => setResetSignal((v) => v + 1)} title="Reset view">
                    <Maximize2 className="h-4 w-4" />
                  </ControlButton>
                </div>
                <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-[var(--dynasty-navy)]/80 px-3 py-1.5 text-[11px] font-semibold text-[#F8F7F2] backdrop-blur-sm">
                  <Compass className="h-3.5 w-3.5 text-[var(--dynasty-gold)]" /> Drag to orbit | scroll to zoom
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--dynasty-tan)]/22 px-3 py-1 text-xs font-bold text-[var(--dynasty-navy)]">{getTypeLabel(props.property.propertyType)} model</span>
            <span className="rounded-full bg-[var(--dynasty-navy)]/8 px-3 py-1 text-xs font-bold text-[var(--dynasty-navy)]">
              {twin.hasBuilderGeometry ? `${twin.activeBlocks.length} Builder blocks synced` : 'Generic model'}
            </span>
            {valueLabel !== null && (
              <span className="rounded-full bg-[var(--dynasty-gold)]/18 px-3 py-1 text-xs font-bold text-[var(--dynasty-navy)]">Est. value {formatCompactCurrency(valueLabel)}</span>
            )}
            <p className="text-xs text-[var(--dynasty-black)]/55">This twin reads the property record, Builder geometry, Rehab scope, Capital metrics, Investor presentation, and Operations progress.</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <TwinFact label="Purchase" value={formatCurrency(twin.acquisition.purchase)} />
            <TwinFact label="ARV" value={formatCurrency(twin.acquisition.arv)} />
            <TwinFact label="Profit" value={formatCurrency(twin.acquisition.profit)} />
            <TwinFact label="ROI" value={formatPercent(twin.acquisition.roi)} />
            <TwinFact label="Risk" value={twin.acquisition.riskLabel} tone={twin.acquisition.riskTone} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <div className="rounded-xl border border-[var(--dynasty-navy)]/10 bg-[#F8F7F2] p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-display text-lg font-black text-[var(--dynasty-navy)]">Condition heat map</h4>
                <span className="text-xs font-bold text-[var(--dynasty-black)]/50">{overlayMode === 'condition' ? 'Active overlay' : 'Switch to Condition'}</span>
              </div>
              <div className="space-y-2">
                {twin.conditionZones.map((zone) => (
                  <div key={zone.id} className="flex items-center justify-between rounded-lg bg-white/75 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 font-bold text-[var(--dynasty-navy)]">
                      <span className={`h-2.5 w-2.5 rounded-full ${zone.status === 'risk' ? 'bg-red-500' : zone.status === 'watch' ? 'bg-orange-400' : zone.status === 'good' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {zone.label}
                    </span>
                    <span className="text-xs font-semibold text-[var(--dynasty-black)]/60">{zone.note}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--dynasty-navy)]/10 bg-[#F8F7F2] p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-display text-lg font-black text-[var(--dynasty-navy)]">Visual scope + progress</h4>
                <span className="text-xs font-bold text-[var(--dynasty-black)]/50">{formatPercent(twin.progress.percent)} complete</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {twin.rehabRooms.slice(0, 6).map((room) => (
                  <div key={room.room} className="rounded-lg bg-white/75 p-3">
                    <div className="flex items-center justify-between gap-2 text-sm font-black text-[var(--dynasty-navy)]">
                      <span>{room.room}</span>
                      <span>{formatCurrency(room.total)}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[var(--dynasty-black)]/55">
                      Planned {formatCurrency(room.planned)} | Active {formatCurrency(room.inProgress)} | Done {formatCurrency(room.complete)}
                    </p>
                  </div>
                ))}
                {twin.rehabRooms.length === 0 && (
                  <div className="rounded-lg bg-white/75 p-3 text-sm font-semibold text-[var(--dynasty-black)]/60 sm:col-span-2">
                    No rehab scope linked yet. Send Builder rooms to Rehab to turn the model into a visual estimate.
                  </div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {twin.progress.stages.map((stage) => (
                  <div key={stage.id} className={`rounded-md px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.08em] ${stage.active ? 'bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)]' : stage.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-white/75 text-[var(--dynasty-black)]/45'}`}>
                    {stage.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'tour' && (
        <div className="space-y-4">
          {embed ? (
            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[var(--dynasty-navy)]/10 bg-black shadow-lg">
                <iframe
                  key={embed.embedUrl}
                  src={embed.embedUrl}
                  title="Virtual tour"
                  className="h-full w-full"
                  allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen; autoplay; vr"
                  allowFullScreen
                  {...(embed.provider === 'generic' ? { sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation' } : {})}
                />
              </div>
              {embed.mayBlockEmbedding && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  Some providers block in-app embedding. If the tour appears blank, open it in a new tab.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--dynasty-navy)]/8 px-3 py-1 text-xs font-bold text-[var(--dynasty-navy)]">{embed.providerLabel}</span>
                <a href={embed.originalUrl} target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Open in new tab</Button>
                </a>
                <Button type="button" variant="ghost" size="sm" loading={isSaving} onClick={() => saveTour('')} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="h-4 w-4" /> Remove tour
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--dynasty-navy)]/20 bg-[#F8F7F2] p-6">
              <div className="mb-4 flex items-center gap-2 text-[var(--dynasty-navy)]">
                <Link2 className="h-5 w-5 text-[var(--dynasty-gold)]" />
                <h4 className="font-display text-lg font-black">Link a real walkthrough</h4>
              </div>
              <p className="mb-4 max-w-2xl text-sm leading-6 text-[var(--dynasty-black)]/65">
                Paste a 360 or 3D tour link and view it right here. Works with Matterport, Zillow 3D Home, Kuula, iGuide, CloudPano, and YouTube 360 videos.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={tourInput}
                  onChange={(event) => setTourInput(event.target.value)}
                  placeholder="https://my.matterport.com/show/?m=..."
                  className="bg-white"
                />
                <Button type="button" onClick={handleAddTour} loading={isSaving} disabled={!tourInput.trim()} className="shrink-0 bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-navy)]/90">
                  <Link2 className="h-4 w-4" /> Link tour
                </Button>
              </div>
              {tourInput.trim() && (
                previewEmbed ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">Detected: {previewEmbed.providerLabel}</p>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-red-600">That does not look like a valid https link yet.</p>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
