import { calculateDealMetrics, serializeProperty, toNumber } from './property-utils'

// Single source of truth for the owned-vs-pipeline split. A Property row with
// this status is real estate the company actually holds; every other status
// (prospect, under-contract, sold, and whatever else acquisition scripts have
// written over time) is not part of the owned portfolio.
const OWNED_STATUS = 'owned'
const SOLD_STATUS = 'sold'

export type OwnedPortfolioMetrics = {
  totalOwned: number
  portfolioValue: number
  totalBasis: number
  totalEquity: number
  averageRoi: number
}

export type AcquisitionPipelineMetrics = {
  totalProspects: number
  totalPipelineValue: number
}

// Portfolio metrics: owned assets only. Never sum across the full properties
// table for a financial figure — most rows are unactioned acquisition leads,
// not owned real estate, and blending them in inflates the result by orders
// of magnitude (see: the $1.23B "portfolio value" bug).
export function getOwnedPortfolioMetrics(rawProperties: unknown[]): OwnedPortfolioMetrics {
  const owned = (rawProperties ?? [])
    .map((property) => serializeProperty(property))
    .filter((property) => property.status === OWNED_STATUS)

  const portfolioValue = owned.reduce((total, property) => total + toNumber(property.currentValue ?? property.purchasePrice), 0)
  const totalBasis = owned.reduce((total, property) => total + toNumber(property.purchasePrice), 0)
  const totalEquity = portfolioValue - totalBasis
  const roiValues = owned
    .map((property) => calculateDealMetrics(property).roi)
    .filter((roi) => Number.isFinite(roi))
  const averageRoi = roiValues.length > 0 ? roiValues.reduce((sum, roi) => sum + roi, 0) / roiValues.length : 0

  return {
    totalOwned: owned.length,
    portfolioValue,
    totalBasis,
    totalEquity,
    averageRoi,
  }
}

// Acquisition metrics: everything still in the pipeline — prospects, leads,
// under-contract, and any other non-terminal status. Excludes `owned` (already
// closed) and `sold` (already exited) since neither is a live opportunity.
export function getAcquisitionPipelineMetrics(rawProperties: unknown[]): AcquisitionPipelineMetrics {
  const pipeline = (rawProperties ?? [])
    .map((property) => serializeProperty(property))
    .filter((property) => property.status !== OWNED_STATUS && property.status !== SOLD_STATUS)

  const totalPipelineValue = pipeline.reduce((total, property) => total + toNumber(property.currentValue ?? property.purchasePrice), 0)

  return {
    totalProspects: pipeline.length,
    totalPipelineValue,
  }
}
