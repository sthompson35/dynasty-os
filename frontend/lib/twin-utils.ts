import { Block, BuilderMode, computeMetrics } from '@/lib/builder-utils'
import { PropertyDTO, calculateDealMetrics } from '@/lib/property-utils'
import { RehabItemDTO, summarizeRehabItems } from '@/lib/rehab-utils'

export type TwinBuilderState = {
  mode: BuilderMode
  remodel: Block[]
  land: Block[]
}

export type TwinOverlayMode = 'metrics' | 'condition' | 'rehab' | 'progress' | 'compare'

export type TwinConditionStatus = 'good' | 'watch' | 'risk' | 'unknown'

export type TwinConditionZone = {
  id: string
  label: string
  status: TwinConditionStatus
  total: number
  note: string
}

export type TwinRehabRoom = {
  room: string
  total: number
  planned: number
  inProgress: number
  complete: number
}

export type TwinProgressStage = {
  id: string
  label: string
  active: boolean
  complete: boolean
}

export type TwinModel = {
  property: PropertyDTO
  builder: TwinBuilderState | null
  activeBlocks: Block[]
  activeMode: BuilderMode
  hasBuilderGeometry: boolean
  acquisition: {
    purchase: number
    arv: number
    profit: number
    roi: number
    rehab: number
    riskLabel: string
    riskTone: 'good' | 'watch' | 'risk'
  }
  conditionZones: TwinConditionZone[]
  rehabRooms: TwinRehabRoom[]
  progress: {
    percent: number
    stage: string
    stages: TwinProgressStage[]
  }
  geometryMetrics: {
    remodelCost: number
    landCost: number
    units: number
    areaSqft: number
  }
}

const BUILDER_STORAGE_PREFIX = 'dynasty-builder:v1:'

const CONDITION_ROOM_MAP: Record<string, string[]> = {
  roof: ['Roof'],
  hvac: ['HVAC'],
  kitchen: ['Kitchen'],
  bathrooms: ['Bathrooms', 'Primary Bath'],
  foundation: ['Foundation'],
}

function nonNeg(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function roomTotals(items: RehabItemDTO[], rooms: string[]): number {
  return items
    .filter((item) => rooms.includes(item.room))
    .reduce((sum, item) => sum + nonNeg(item.lineTotal), 0)
}

function statusForTotal(total: number): TwinConditionStatus {
  if (total >= 10000) return 'risk'
  if (total >= 2500) return 'watch'
  if (total > 0) return 'good'
  return 'unknown'
}

function noteForStatus(status: TwinConditionStatus, total: number): string {
  if (status === 'risk') return `High scope: ${Math.round(total).toLocaleString('en-US')}`
  if (status === 'watch') return `Watch item: ${Math.round(total).toLocaleString('en-US')}`
  if (status === 'good') return 'Scoped and controlled'
  return 'No scope linked yet'
}

export function getBuilderStorageKey(propertyId: string): string {
  return `${BUILDER_STORAGE_PREFIX}${propertyId}`
}

export function parseTwinBuilderState(raw: unknown): TwinBuilderState | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Record<string, unknown>
  const remodel = Array.isArray(input.remodel) ? (input.remodel as Block[]) : []
  const land = Array.isArray(input.land) ? (input.land as Block[]) : []
  const mode: BuilderMode = input.mode === 'land' ? 'land' : 'remodel'
  if (remodel.length === 0 && land.length === 0) return null
  return { mode, remodel, land }
}

export function readTwinBuilderState(propertyId: string): TwinBuilderState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(getBuilderStorageKey(propertyId))
    return raw ? parseTwinBuilderState(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function buildTwinModel(
  property: PropertyDTO,
  rehabItems: RehabItemDTO[] | null | undefined,
  builder: TwinBuilderState | null,
): TwinModel {
  const items = Array.isArray(rehabItems) ? rehabItems : []
  const rehabSummary = summarizeRehabItems(items)
  const deal = calculateDealMetrics(property)
  const purchase = nonNeg(property.purchasePrice)
  const arv = nonNeg(property.arv ?? property.currentValue)
  const rehab = rehabSummary.total || nonNeg(property.repairCosts)
  const activeMode = builder?.mode ?? (property.propertyType === 'land' ? 'land' : 'remodel')
  const activeBlocks = builder ? builder[activeMode] : []
  const remodelMetrics = computeMetrics(builder?.remodel ?? [], 'remodel')
  const landMetrics = computeMetrics(builder?.land ?? [], 'land')
  const completedTotal = items
    .filter((item) => item.status === 'complete')
    .reduce((sum, item) => sum + nonNeg(item.lineTotal), 0)
  const progressPercent = rehabSummary.total > 0 ? Math.round((completedTotal / rehabSummary.total) * 100) : 0
  const inProgress = items.some((item) => item.status === 'in-progress')
  const hasComplete = items.some((item) => item.status === 'complete')
  const stage = progressPercent >= 100 ? 'Completed' : inProgress ? 'Finishes / active work' : hasComplete ? 'Construction underway' : items.length > 0 ? 'Pre-rehab scope' : 'Pre-rehab'
  const riskTone: TwinModel['acquisition']['riskTone'] = deal.roi >= 15 ? 'good' : deal.roi >= 8 ? 'watch' : 'risk'

  return {
    property,
    builder,
    activeBlocks,
    activeMode,
    hasBuilderGeometry: activeBlocks.length > 0,
    acquisition: {
      purchase,
      arv,
      profit: deal.profit,
      roi: deal.roi,
      rehab,
      riskLabel: riskTone === 'good' ? 'Low' : riskTone === 'watch' ? 'Medium' : 'High',
      riskTone,
    },
    conditionZones: Object.entries(CONDITION_ROOM_MAP).map(([id, rooms]) => {
      const total = roomTotals(items, rooms)
      const status = statusForTotal(total)
      return {
        id,
        label: id === 'hvac' ? 'HVAC' : id.charAt(0).toUpperCase() + id.slice(1),
        status,
        total,
        note: noteForStatus(status, total),
      }
    }),
    rehabRooms: rehabSummary.byRoom.map((room) => ({
      room: room.room,
      total: room.total,
      planned: items.filter((item) => item.room === room.room && item.status === 'planned').reduce((sum, item) => sum + nonNeg(item.lineTotal), 0),
      inProgress: items.filter((item) => item.room === room.room && item.status === 'in-progress').reduce((sum, item) => sum + nonNeg(item.lineTotal), 0),
      complete: items.filter((item) => item.room === room.room && item.status === 'complete').reduce((sum, item) => sum + nonNeg(item.lineTotal), 0),
    })),
    progress: {
      percent: progressPercent,
      stage,
      stages: [
        { id: 'pre', label: 'Pre-Rehab', active: progressPercent === 0 && items.length === 0, complete: items.length > 0 },
        { id: 'demo', label: 'Demo', active: items.length > 0 && progressPercent < 25, complete: progressPercent >= 25 },
        { id: 'framing', label: 'Framing', active: progressPercent >= 25 && progressPercent < 50, complete: progressPercent >= 50 },
        { id: 'mechanical', label: 'Mechanical', active: progressPercent >= 50 && progressPercent < 75, complete: progressPercent >= 75 },
        { id: 'finishes', label: 'Finishes', active: progressPercent >= 75 && progressPercent < 100, complete: progressPercent >= 100 },
        { id: 'done', label: 'Completed', active: progressPercent >= 100, complete: progressPercent >= 100 },
      ],
    },
    geometryMetrics: {
      remodelCost: remodelMetrics.totalCost,
      landCost: landMetrics.totalCost,
      units: landMetrics.units,
      areaSqft: activeMode === 'land' ? landMetrics.totalAreaSqft : remodelMetrics.totalAreaSqft,
    },
  }
}
