// Dynasty PropertyOS — Builder (Phase 1 mockup)
// Pure helpers + catalogs for the 2D grid block builder. No React here so the
// data model and math stay testable and reusable when we go deeper (3D extrude,
// rehab/pro-forma linking, persistence).

import { PropertyDTO, formatNumber } from '@/lib/property-utils'
import { RehabItemMutationData } from '@/lib/rehab-utils'

export type BuilderMode = 'remodel' | 'land'

// A single placed block, measured in GRID CELLS (not pixels). Converting to
// real-world square footage uses FEET_PER_CELL for the active mode.
export type Block = {
  id: string
  kind: string // matches a BlockType.id
  label: string // user-editable display name
  x: number
  y: number
  w: number
  h: number
}

export type BlockType = {
  id: string
  label: string
  mode: BuilderMode
  fill: string
  border: string
  text: string
  // Rough cost per finished square foot. For remodel this is a renovation rate;
  // for land it is a build/sitework rate on the footprint. Teaser-grade only.
  costPerSqft: number
  // Dwelling units this block represents (land mode). 0 = non-residential.
  units: number
  defaultW: number
  defaultH: number
}

// Shared grid. Kept modest so it renders crisply and stays mobile-friendly.
export const GRID = { cols: 40, rows: 26 }
export const MIN_CELLS = 2

// Real-world scale per mode (feet represented by one grid cell).
export const FEET_PER_CELL: Record<BuilderMode, number> = {
  remodel: 2, // 40x26 cells => 80ft x 52ft canvas (room scale)
  land: 8, // 40x26 cells => 320ft x 208ft (~1.5 acres, lot scale)
}

export const MODE_LABEL: Record<BuilderMode, string> = {
  remodel: 'Remodel layout',
  land: 'Land / development',
}

export const REMODEL_TYPES: BlockType[] = [
  { id: 'kitchen', label: 'Kitchen', mode: 'remodel', fill: '#FDE8D4', border: '#E2A86B', text: '#7A4A1E', costPerSqft: 220, units: 0, defaultW: 8, defaultH: 6 },
  { id: 'bathroom', label: 'Bathroom', mode: 'remodel', fill: '#D9ECF2', border: '#6FA8BD', text: '#1F4E5C', costPerSqft: 280, units: 0, defaultW: 5, defaultH: 4 },
  { id: 'bedroom', label: 'Bedroom', mode: 'remodel', fill: '#E5E1F2', border: '#9488C4', text: '#3A2F6B', costPerSqft: 45, units: 0, defaultW: 8, defaultH: 7 },
  { id: 'living', label: 'Living', mode: 'remodel', fill: '#E3EFE0', border: '#82B07A', text: '#2E5128', costPerSqft: 42, units: 0, defaultW: 10, defaultH: 8 },
  { id: 'dining', label: 'Dining', mode: 'remodel', fill: '#F3E6CF', border: '#C8A95F', text: '#6B4E16', costPerSqft: 42, units: 0, defaultW: 7, defaultH: 6 },
  { id: 'office', label: 'Office', mode: 'remodel', fill: '#E0E7EF', border: '#7E94AD', text: '#2C3E52', costPerSqft: 48, units: 0, defaultW: 6, defaultH: 6 },
  { id: 'laundry', label: 'Laundry', mode: 'remodel', fill: '#EAF2F4', border: '#8FB4BB', text: '#345259', costPerSqft: 110, units: 0, defaultW: 4, defaultH: 4 },
  { id: 'garage', label: 'Garage', mode: 'remodel', fill: '#E8E8E8', border: '#9A9A9A', text: '#3D3D3D', costPerSqft: 35, units: 0, defaultW: 10, defaultH: 9 },
  { id: 'hallway', label: 'Hallway', mode: 'remodel', fill: '#F0EBDD', border: '#BBA985', text: '#5F5331', costPerSqft: 28, units: 0, defaultW: 12, defaultH: 3 },
  { id: 'closet', label: 'Closet', mode: 'remodel', fill: '#EDE7DB', border: '#B6A17A', text: '#6A5B36', costPerSqft: 32, units: 0, defaultW: 3, defaultH: 3 },
]

export const LAND_TYPES: BlockType[] = [
  { id: 'single-family', label: 'Single-family', mode: 'land', fill: '#E3EFE0', border: '#82B07A', text: '#2E5128', costPerSqft: 165, units: 1, defaultW: 6, defaultH: 5 },
  { id: 'duplex', label: 'Duplex', mode: 'land', fill: '#E5E1F2', border: '#9488C4', text: '#3A2F6B', costPerSqft: 150, units: 2, defaultW: 8, defaultH: 5 },
  { id: 'townhome', label: 'Townhome', mode: 'land', fill: '#FDE8D4', border: '#E2A86B', text: '#7A4A1E', costPerSqft: 155, units: 1, defaultW: 4, defaultH: 6 },
  { id: 'green-space', label: 'Green space', mode: 'land', fill: '#DCEFD2', border: '#7FB05E', text: '#355E1E', costPerSqft: 0, units: 0, defaultW: 6, defaultH: 6 },
  { id: 'road', label: 'Road / drive', mode: 'land', fill: '#E4E4E4', border: '#9A9A9A', text: '#3D3D3D', costPerSqft: 12, units: 0, defaultW: 16, defaultH: 3 },
  { id: 'parking', label: 'Parking', mode: 'land', fill: '#E8ECEF', border: '#8FA1B0', text: '#33444F', costPerSqft: 8, units: 0, defaultW: 10, defaultH: 5 },
]

const TYPE_INDEX: Record<string, BlockType> = [...REMODEL_TYPES, ...LAND_TYPES].reduce(
  (acc, type) => {
    acc[type.id] = type
    return acc
  },
  {} as Record<string, BlockType>,
)

export function getBlockType(kind: string): BlockType | undefined {
  return TYPE_INDEX[kind]
}

export function paletteFor(mode: BuilderMode): BlockType[] {
  return mode === 'remodel' ? REMODEL_TYPES : LAND_TYPES
}

// --- ids -------------------------------------------------------------------
// Module counter is safe: ids are only created in event handlers / effects
// (never during render), so there is no SSR hydration concern.
let uidCounter = 0
export function newBlockId(): string {
  uidCounter += 1
  return `b${Date.now().toString(36)}${uidCounter}`
}

// --- templates -------------------------------------------------------------
export type TemplateOption = { id: string; label: string; mode: BuilderMode }

export const TEMPLATES: Record<BuilderMode, TemplateOption[]> = {
  remodel: [
    { id: 'starter-home', label: 'Starter single-family', mode: 'remodel' },
    { id: 'open-flip', label: 'Open-concept flip', mode: 'remodel' },
    { id: 'blank', label: 'Blank canvas', mode: 'remodel' },
  ],
  land: [
    { id: 'three-lot', label: '3-lot subdivision', mode: 'land' },
    { id: 'duplex-dev', label: 'Duplex development', mode: 'land' },
    { id: 'blank', label: 'Blank parcel', mode: 'land' },
  ],
}

type Seed = Omit<Block, 'id' | 'label'> & { label?: string }

function make(seeds: Seed[]): Block[] {
  return seeds.map((seed) => ({
    id: newBlockId(),
    label: seed.label ?? getBlockType(seed.kind)?.label ?? 'Block',
    kind: seed.kind,
    x: seed.x,
    y: seed.y,
    w: seed.w,
    h: seed.h,
  }))
}

export function buildTemplate(id: string): Block[] {
  switch (id) {
    case 'starter-home':
      return make([
        { kind: 'living', x: 2, y: 2, w: 10, h: 8 },
        { kind: 'kitchen', x: 13, y: 2, w: 8, h: 8 },
        { kind: 'dining', x: 22, y: 2, w: 7, h: 8 },
        { kind: 'bedroom', x: 2, y: 11, w: 9, h: 8, label: 'Primary bed' },
        { kind: 'bedroom', x: 12, y: 11, w: 8, h: 8, label: 'Bedroom 2' },
        { kind: 'bathroom', x: 21, y: 11, w: 5, h: 5 },
        { kind: 'hallway', x: 2, y: 20, w: 24, h: 3 },
      ])
    case 'open-flip':
      return make([
        { kind: 'living', x: 2, y: 2, w: 20, h: 10, label: 'Great room' },
        { kind: 'kitchen', x: 23, y: 2, w: 13, h: 10 },
        { kind: 'bedroom', x: 2, y: 13, w: 10, h: 9, label: 'Primary bed' },
        { kind: 'bedroom', x: 13, y: 13, w: 10, h: 9, label: 'Bedroom 2' },
        { kind: 'bathroom', x: 24, y: 13, w: 6, h: 5, label: 'Primary bath' },
        { kind: 'bathroom', x: 31, y: 13, w: 5, h: 5, label: 'Hall bath' },
      ])
    case 'three-lot':
      return make([
        { kind: 'single-family', x: 2, y: 3, w: 8, h: 9, label: 'Lot A' },
        { kind: 'single-family', x: 11, y: 3, w: 8, h: 9, label: 'Lot B' },
        { kind: 'single-family', x: 20, y: 3, w: 8, h: 9, label: 'Lot C' },
        { kind: 'road', x: 2, y: 13, w: 26, h: 3 },
        { kind: 'green-space', x: 29, y: 3, w: 8, h: 13 },
      ])
    case 'duplex-dev':
      return make([
        { kind: 'duplex', x: 3, y: 3, w: 10, h: 7, label: 'Duplex 1' },
        { kind: 'duplex', x: 16, y: 3, w: 10, h: 7, label: 'Duplex 2' },
        { kind: 'parking', x: 3, y: 12, w: 23, h: 4 },
        { kind: 'green-space', x: 29, y: 3, w: 8, h: 13 },
      ])
    case 'blank':
    default:
      return []
  }
}

// --- metrics ---------------------------------------------------------------
export type KindRollup = {
  kind: string
  label: string
  fill: string
  border: string
  count: number
  areaSqft: number
  cost: number
}

export type BuilderMetrics = {
  mode: BuilderMode
  feetPerCell: number
  blockCount: number
  totalAreaSqft: number
  siteAreaSqft: number
  coveragePct: number
  units: number
  totalCost: number
  costLabel: string
  byKind: KindRollup[]
}

export function blockAreaSqft(block: Block, mode: BuilderMode): number {
  const ft = FEET_PER_CELL[mode]
  return block.w * ft * (block.h * ft)
}

export function computeMetrics(blocks: Block[], mode: BuilderMode): BuilderMetrics {
  const ft = FEET_PER_CELL[mode]
  const siteAreaSqft = GRID.cols * ft * (GRID.rows * ft)
  const rollup: Record<string, KindRollup> = {}
  let totalAreaSqft = 0
  let totalCost = 0
  let units = 0

  for (const block of blocks) {
    const type = getBlockType(block.kind)
    if (!type) continue
    const area = blockAreaSqft(block, mode)
    const cost = area * type.costPerSqft
    totalAreaSqft += area
    totalCost += cost
    units += type.units
    if (!rollup[block.kind]) {
      rollup[block.kind] = { kind: block.kind, label: type.label, fill: type.fill, border: type.border, count: 0, areaSqft: 0, cost: 0 }
    }
    rollup[block.kind].count += 1
    rollup[block.kind].areaSqft += area
    rollup[block.kind].cost += cost
  }

  return {
    mode,
    feetPerCell: ft,
    blockCount: blocks.length,
    totalAreaSqft,
    siteAreaSqft,
    coveragePct: siteAreaSqft > 0 ? (totalAreaSqft / siteAreaSqft) * 100 : 0,
    units,
    totalCost,
    costLabel: mode === 'remodel' ? 'Rough rehab estimate' : 'Rough build cost',
    byKind: Object.values(rollup).sort((a, b) => b.areaSqft - a.areaSqft),
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// Finds an open-ish top-left position for a freshly added block via a coarse
// scan; falls back to a centered position if the grid is crowded.
export function findSpot(blocks: Block[], w: number, h: number): { x: number; y: number } {
  const step = 2
  const overlaps = (x: number, y: number) =>
    blocks.some((b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y)
  for (let y = 1; y + h <= GRID.rows - 1; y += step) {
    for (let x = 1; x + w <= GRID.cols - 1; x += step) {
      if (!overlaps(x, y)) return { x, y }
    }
  }
  return { x: clamp(Math.floor((GRID.cols - w) / 2), 0, GRID.cols - w), y: clamp(Math.floor((GRID.rows - h) / 2), 0, GRID.rows - h) }
}

// --- remodel -> rehab estimator -------------------------------------------
// Maps a remodel block kind to the closest Rehab estimator room option so the
// rooms you sketch become real, editable scope line items.
const REMODEL_TO_REHAB_ROOM: Record<string, string> = {
  kitchen: 'Kitchen',
  bathroom: 'Bathrooms',
  bedroom: 'Bedrooms',
  living: 'Living Areas',
  dining: 'Living Areas',
  office: 'Living Areas',
  laundry: 'General',
  garage: 'General',
  hallway: 'General',
  closet: 'General',
}

export function mapRoomToRehab(kind: string): string {
  return REMODEL_TO_REHAB_ROOM[kind] ?? 'General'
}

// Turns the remodel-mode blocks into rehab line items. Quantity = finished
// square feet, unit cost = the block's renovation rate, so the rehab total
// matches the builder's rough rehab estimate exactly.
export function buildRehabLineItems(blocks: Block[]): RehabItemMutationData[] {
  const mode: BuilderMode = 'remodel'
  const ft = FEET_PER_CELL[mode]
  const items: RehabItemMutationData[] = []
  for (const block of blocks) {
    const type = getBlockType(block.kind)
    if (!type || type.mode !== 'remodel') continue
    const area = Math.round(blockAreaSqft(block, mode))
    if (area <= 0) continue
    items.push({
      room: mapRoomToRehab(block.kind),
      category: 'Materials',
      description: `${block.label} renovation — ${block.w * ft}×${block.h * ft} ft (${formatNumber(area)} sf)`,
      quantity: area,
      unitCost: type.costPerSqft,
      status: 'planned',
    })
  }
  return items
}

// --- land -> development pro forma ----------------------------------------
export type ProFormaInputs = {
  landCost: number
  softCostPct: number
  contingencyPct: number
  sellPricePerUnit: number
  sellingCostPct: number
  roadCost: number
  waterCost: number
  sewerCost: number
  stormwaterCost: number
  electricCost: number
  gasInternetCost: number
  siteWorkCost: number
  sidewalksLightsCost: number
  equityPct: number
  debtRate: number
  lpPreferredReturn: number
  gpPromotePct: number
}

export type ProFormaResult = {
  units: number
  landCost: number
  hardBuildCost: number
  softCost: number
  contingency: number
  infrastructureCost: number
  totalProjectCost: number
  grossRevenue: number
  sellingCosts: number
  netProfit: number
  roi: number // netProfit / totalProjectCost * 100
  margin: number // netProfit / grossRevenue * 100
  costPerUnit: number
  tone: 'good' | 'bad' | 'breakEven'
}

export type ZoningProfile = {
  code: string
  maxUnitsPerAcre: number
  minLotSqft: number
  maxHeightFt: number
  frontSetbackFt: number
  sideSetbackFt: number
  rearSetbackFt: number
}

export type ZoningValidation = {
  maxUnits: number
  densityUsed: number
  lotCompliant: boolean
  densityCompliant: boolean
  coverageCompliant: boolean
  status: 'pass' | 'warning' | 'fail'
  warnings: string[]
}

export type SplitScenario = {
  lots: number
  lotSqft: number
  revenue: number
  totalCost: number
  profit: number
  roi: number
  feasible: boolean
}

export type HighestBestUseOption = {
  label: string
  productType: string
  units: number
  revenue: number
  totalCost: number
  profit: number
  roi: number
  rank: number
  feasible: boolean
}

export type DevelopmentRisk = {
  score: number
  label: 'Low' | 'Medium' | 'High' | 'Extreme'
  factors: { label: string; severity: 'low' | 'medium' | 'high' }[]
}

export type CapitalStack = {
  requiredEquity: number
  requiredDebt: number
  annualDebtService: number
  lpPreferredReturn: number
  gpPromote: number
  equityMultiple: number
}

export type DevelopmentIntelligence = {
  zoning: ZoningValidation
  splitScenarios: SplitScenario[]
  hbuOptions: HighestBestUseOption[]
  risk: DevelopmentRisk
  capital: CapitalStack
}

// Sensible starting assumptions seeded from the property's own numbers.
export function defaultProForma(property: PropertyDTO | null | undefined): ProFormaInputs {
  const land = Number(property?.purchasePrice ?? 0)
  const perUnit = Number(property?.arv ?? property?.currentValue ?? 0)
  return {
    landCost: land > 0 ? Math.round(land) : 0,
    softCostPct: 15,
    contingencyPct: 10,
    sellPricePerUnit: perUnit > 0 ? Math.round(perUnit) : 0,
    sellingCostPct: 6,
    roadCost: 0,
    waterCost: 0,
    sewerCost: 0,
    stormwaterCost: 0,
    electricCost: 0,
    gasInternetCost: 0,
    siteWorkCost: 0,
    sidewalksLightsCost: 0,
    equityPct: 25,
    debtRate: 8,
    lpPreferredReturn: 10,
    gpPromotePct: 30,
  }
}

const nonNeg = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0)

export function computeProForma(inputs: ProFormaInputs, metrics: BuilderMetrics): ProFormaResult {
  const units = metrics.units
  const hardBuildCost = nonNeg(metrics.totalCost)
  const landCost = nonNeg(inputs?.landCost ?? 0)
  const softCost = hardBuildCost * (nonNeg(inputs?.softCostPct ?? 0) / 100)
  const contingency = hardBuildCost * (nonNeg(inputs?.contingencyPct ?? 0) / 100)
  const infrastructureCost = [
    inputs?.roadCost,
    inputs?.waterCost,
    inputs?.sewerCost,
    inputs?.stormwaterCost,
    inputs?.electricCost,
    inputs?.gasInternetCost,
    inputs?.siteWorkCost,
    inputs?.sidewalksLightsCost,
  ].reduce((sum, value) => sum + nonNeg(value ?? 0), 0)
  const totalProjectCost = landCost + hardBuildCost + softCost + contingency + infrastructureCost
  const grossRevenue = units * nonNeg(inputs?.sellPricePerUnit ?? 0)
  const sellingCosts = grossRevenue * (nonNeg(inputs?.sellingCostPct ?? 0) / 100)
  const netProfit = grossRevenue - sellingCosts - totalProjectCost
  const roi = totalProjectCost > 0 ? (netProfit / totalProjectCost) * 100 : 0
  const margin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0
  const costPerUnit = units > 0 ? totalProjectCost / units : 0
  const tone: ProFormaResult['tone'] = netProfit > 1 ? 'good' : netProfit < -1 ? 'bad' : 'breakEven'
  return {
    units,
    landCost,
    hardBuildCost,
    softCost,
    contingency,
    infrastructureCost,
    totalProjectCost,
    grossRevenue,
    sellingCosts,
    netProfit,
    roi,
    margin,
    costPerUnit,
    tone,
  }
}

export const DEFAULT_ZONING_PROFILE: ZoningProfile = {
  code: 'R-1 Concept',
  maxUnitsPerAcre: 4,
  minLotSqft: 7500,
  maxHeightFt: 35,
  frontSetbackFt: 25,
  sideSetbackFt: 10,
  rearSetbackFt: 20,
}

export function computeZoningValidation(metrics: BuilderMetrics, zoning: ZoningProfile = DEFAULT_ZONING_PROFILE): ZoningValidation {
  const acres = metrics.siteAreaSqft / 43560
  const maxUnits = Math.floor(acres * zoning.maxUnitsPerAcre)
  const residentialBlocks = metrics.byKind.filter((row) => ['single-family', 'duplex', 'townhome'].includes(row.kind))
  const avgLotSqft = residentialBlocks.length > 0
    ? residentialBlocks.reduce((sum, row) => sum + row.areaSqft, 0) / residentialBlocks.reduce((sum, row) => sum + row.count, 0)
    : 0
  const densityUsed = acres > 0 ? metrics.units / acres : 0
  const warnings: string[] = []
  const lotCompliant = avgLotSqft === 0 || avgLotSqft >= zoning.minLotSqft
  const densityCompliant = metrics.units <= maxUnits
  const coverageCompliant = metrics.coveragePct <= 55
  if (!densityCompliant) warnings.push(`Density exceeds ${zoning.maxUnitsPerAcre} units/acre.`)
  if (!lotCompliant) warnings.push(`Average lot area is below ${formatNumber(zoning.minLotSqft)} sf.`)
  if (!coverageCompliant) warnings.push('Site coverage exceeds 55%.')
  const failCount = [lotCompliant, densityCompliant, coverageCompliant].filter((item) => !item).length
  return {
    maxUnits,
    densityUsed,
    lotCompliant,
    densityCompliant,
    coverageCompliant,
    status: failCount >= 2 ? 'fail' : failCount === 1 ? 'warning' : 'pass',
    warnings,
  }
}

export function computeSplitScenarios(inputs: ProFormaInputs, metrics: BuilderMetrics): SplitScenario[] {
  const baseCost = computeProForma(inputs, { ...metrics, totalCost: 0, units: 0 }).totalProjectCost
  const lotCost = metrics.siteAreaSqft > 0 ? Math.max(65000, metrics.siteAreaSqft * 4.5) : 65000
  return [2, 3, 4, 5].map((lots) => {
    const hardCost = lots * lotCost
    const revenue = lots * nonNeg(inputs.sellPricePerUnit)
    const totalCost = baseCost + hardCost
    const profit = revenue - totalCost
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0
    return {
      lots,
      lotSqft: metrics.siteAreaSqft / lots,
      revenue,
      totalCost,
      profit,
      roi,
      feasible: profit > 0 && metrics.siteAreaSqft / lots >= DEFAULT_ZONING_PROFILE.minLotSqft,
    }
  })
}

export function computeHighestBestUse(inputs: ProFormaInputs, metrics: BuilderMetrics): HighestBestUseOption[] {
  const acres = metrics.siteAreaSqft / 43560
  const maxUnits = Math.max(1, Math.floor(acres * DEFAULT_ZONING_PROFILE.maxUnitsPerAcre))
  const products = [
    { label: 'Single Family', productType: 'single-family', units: Math.max(1, Math.min(maxUnits, 3)), costPerUnit: 320000, revenueMultiplier: 1 },
    { label: 'Duplex', productType: 'duplex', units: Math.max(2, Math.min(maxUnits, 4)), costPerUnit: 260000, revenueMultiplier: 0.92 },
    { label: 'Townhomes', productType: 'townhome', units: Math.max(3, Math.min(maxUnits, 6)), costPerUnit: 235000, revenueMultiplier: 0.88 },
    { label: 'Build-to-Rent', productType: 'btr', units: Math.max(3, Math.min(maxUnits, 8)), costPerUnit: 245000, revenueMultiplier: 0.82 },
  ]
  const infrastructureCost = computeProForma(inputs, { ...metrics, totalCost: 0, units: 0 }).infrastructureCost
  const landCost = nonNeg(inputs.landCost)
  return products
    .map((option) => {
      const revenue = option.units * nonNeg(inputs.sellPricePerUnit) * option.revenueMultiplier
      const hardCost = option.units * option.costPerUnit
      const softCost = hardCost * (nonNeg(inputs.softCostPct) / 100)
      const contingency = hardCost * (nonNeg(inputs.contingencyPct) / 100)
      const sellingCosts = revenue * (nonNeg(inputs.sellingCostPct) / 100)
      const totalCost = landCost + hardCost + softCost + contingency + infrastructureCost + sellingCosts
      const profit = revenue - totalCost
      const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0
      return { ...option, revenue, totalCost, profit, roi, rank: 0, feasible: profit > 0 && option.units <= maxUnits }
    })
    .sort((a, b) => b.roi - a.roi)
    .map((option, index) => ({ ...option, rank: index + 1 }))
}

export function computeDevelopmentRisk(inputs: ProFormaInputs, metrics: BuilderMetrics, zoning: ZoningValidation): DevelopmentRisk {
  const factors: DevelopmentRisk['factors'] = []
  if (zoning.status === 'fail') factors.push({ label: 'Zoning variance likely required', severity: 'high' })
  if (zoning.status === 'warning') factors.push({ label: 'Zoning constraints need review', severity: 'medium' })
  if (metrics.units > 0 && nonNeg(inputs.waterCost) + nonNeg(inputs.sewerCost) === 0) factors.push({ label: 'Utilities unknown', severity: 'high' })
  if (nonNeg(inputs.stormwaterCost) === 0 && metrics.coveragePct > 25) factors.push({ label: 'Stormwater allowance missing', severity: 'medium' })
  if (nonNeg(inputs.roadCost) === 0 && metrics.units >= 3) factors.push({ label: 'Road access cost missing', severity: 'medium' })
  if (nonNeg(inputs.siteWorkCost) === 0) factors.push({ label: 'Topography/site work unknown', severity: 'medium' })
  if (metrics.coveragePct > 45) factors.push({ label: 'High site coverage', severity: 'medium' })
  const score = factors.reduce((sum, item) => sum + (item.severity === 'high' ? 30 : item.severity === 'medium' ? 18 : 8), 0)
  const label: DevelopmentRisk['label'] = score >= 75 ? 'Extreme' : score >= 48 ? 'High' : score >= 24 ? 'Medium' : 'Low'
  return { score: Math.min(100, score), label, factors }
}

export function computeCapitalStack(inputs: ProFormaInputs, proForma: ProFormaResult): CapitalStack {
  const equityPct = Math.min(100, nonNeg(inputs.equityPct)) / 100
  const requiredEquity = proForma.totalProjectCost * equityPct
  const requiredDebt = Math.max(0, proForma.totalProjectCost - requiredEquity)
  const annualDebtService = requiredDebt * (nonNeg(inputs.debtRate) / 100)
  const lpPreferredReturn = requiredEquity * (nonNeg(inputs.lpPreferredReturn) / 100)
  const promoteBase = Math.max(0, proForma.netProfit - lpPreferredReturn)
  const gpPromote = promoteBase * (nonNeg(inputs.gpPromotePct) / 100)
  const equityMultiple = requiredEquity > 0 ? (requiredEquity + Math.max(0, proForma.netProfit)) / requiredEquity : 0
  return { requiredEquity, requiredDebt, annualDebtService, lpPreferredReturn, gpPromote, equityMultiple }
}

export function computeDevelopmentIntelligence(inputs: ProFormaInputs, metrics: BuilderMetrics): DevelopmentIntelligence {
  const proForma = computeProForma(inputs, metrics)
  const zoning = computeZoningValidation(metrics)
  return {
    zoning,
    splitScenarios: computeSplitScenarios(inputs, metrics),
    hbuOptions: computeHighestBestUse(inputs, metrics),
    risk: computeDevelopmentRisk(inputs, metrics, zoning),
    capital: computeCapitalStack(inputs, proForma),
  }
}
