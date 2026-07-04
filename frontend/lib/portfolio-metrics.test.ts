// Regression guard for the $1.23B "portfolio value" bug: summing property
// value across every status (mostly unactioned prospects) instead of owned
// assets only. Run with: npx tsx lib/portfolio-metrics.test.ts
import assert from 'node:assert/strict'
import { getAcquisitionPipelineMetrics, getOwnedPortfolioMetrics } from './portfolio-metrics'

function makeProperty(overrides: Record<string, unknown>) {
  return {
    id: 'test-id',
    address: '123 Test St',
    city: 'Testville',
    state: 'TS',
    propertyType: 'single-family',
    status: 'prospect',
    purchasePrice: 100000,
    currentValue: 100000,
    ...overrides,
  }
}

let failed = false

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok - ${name}`)
  } catch (error) {
    failed = true
    console.error(`  FAIL - ${name}`)
    console.error(error)
  }
}

console.log('portfolio-metrics.test.ts')

test('8,755 prospects + 1 owned property -> portfolio value equals the owned property only', () => {
  const prospects = Array.from({ length: 8755 }, (_, i) =>
    makeProperty({ id: `prospect-${i}`, status: 'prospect', currentValue: 250000, purchasePrice: 250000 }),
  )
  const owned = makeProperty({ id: 'owned-1', status: 'owned', currentValue: 318000, purchasePrice: 246000 })
  const properties = [...prospects, owned]

  const portfolio = getOwnedPortfolioMetrics(properties)
  assert.equal(portfolio.totalOwned, 1)
  assert.equal(portfolio.portfolioValue, 318000)
  assert.equal(portfolio.totalBasis, 246000)
  assert.equal(portfolio.totalEquity, 72000)

  // What the old (buggy) code computed: sum currentValue across every row,
  // regardless of status. Confirms the fix isn't just "a smaller number" but
  // specifically excludes the prospect pipeline, not a rounding difference.
  const buggyTotal = properties.reduce((sum, p) => sum + Number((p as { currentValue?: number }).currentValue ?? 0), 0)
  assert.ok(buggyTotal > portfolio.portfolioValue * 1000, 'sanity check: unfiltered sum should dwarf the owned-only value')
})

test('acquisition pipeline metrics count prospects/under-contract, exclude owned and sold', () => {
  const properties = [
    makeProperty({ id: 'p1', status: 'prospect', currentValue: 100000 }),
    makeProperty({ id: 'p2', status: 'under-contract', currentValue: 200000 }),
    makeProperty({ id: 'p3', status: 'owned', currentValue: 300000 }),
    makeProperty({ id: 'p4', status: 'sold', currentValue: 400000 }),
  ]

  const pipeline = getAcquisitionPipelineMetrics(properties)
  assert.equal(pipeline.totalProspects, 2)
  assert.equal(pipeline.totalPipelineValue, 300000)
})

test('empty property list produces zeroed metrics, not a crash', () => {
  const portfolio = getOwnedPortfolioMetrics([])
  assert.equal(portfolio.totalOwned, 0)
  assert.equal(portfolio.portfolioValue, 0)
  assert.equal(portfolio.averageRoi, 0)

  const pipeline = getAcquisitionPipelineMetrics([])
  assert.equal(pipeline.totalProspects, 0)
  assert.equal(pipeline.totalPipelineValue, 0)
})

test('portfolio value falls back to purchasePrice when currentValue is missing', () => {
  const properties = [makeProperty({ id: 'p1', status: 'owned', currentValue: null, purchasePrice: 150000 })]
  const portfolio = getOwnedPortfolioMetrics(properties)
  assert.equal(portfolio.portfolioValue, 150000)
})

if (failed) {
  console.error('\nFAILED')
  process.exitCode = 1
} else {
  console.log('\nAll portfolio-metrics tests passed.')
}
