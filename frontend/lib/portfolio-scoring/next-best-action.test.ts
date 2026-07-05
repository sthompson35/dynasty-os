// Regression guard for Investment Intelligence Slice 2's next-best-action
// decision matrix. Each test protects a precedence rule, not just output.
// Run with: npx tsx lib/portfolio-scoring/next-best-action.test.ts
import assert from 'node:assert/strict'
import { getNextBestAction } from './next-best-action'

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

console.log('next-best-action.test.ts')

test('missing purchase price outranks everything else, even a severe flood zone', () => {
  const result = getNextBestAction({
    decision: 'GO',
    hasVerifiedPurchasePrice: false,
    floodZone: 'VE',
    gisEnrichedAt: '2026-07-05T00:00:00.000Z',
  })
  assert.match(result.action, /purchase price/i)
})

test('missing GIS enrichment outranks a RENEGOTIATE decision', () => {
  const result = getNextBestAction({
    decision: 'RENEGOTIATE',
    hasVerifiedPurchasePrice: true,
    floodZone: null,
    gisEnrichedAt: null,
  })
  assert.match(result.action, /enrichment/i)
})

test('RENEGOTIATE outranks a high-risk flood zone', () => {
  const result = getNextBestAction({
    decision: 'RENEGOTIATE',
    hasVerifiedPurchasePrice: true,
    floodZone: 'AE',
    gisEnrichedAt: '2026-07-05T00:00:00.000Z',
  })
  assert.match(result.action, /revised offer/i)
})

test('a high-risk flood zone on an otherwise-GO deal recommends an insurance quote', () => {
  const result = getNextBestAction({
    decision: 'GO',
    hasVerifiedPurchasePrice: true,
    floodZone: 'AE',
    gisEnrichedAt: '2026-07-05T00:00:00.000Z',
  })
  assert.match(result.action, /insurance quote/i)
})

test('Zone X on a GO deal with no blockers recommends starting the offer package', () => {
  const result = getNextBestAction({
    decision: 'GO',
    hasVerifiedPurchasePrice: true,
    floodZone: 'X',
    gisEnrichedAt: '2026-07-05T00:00:00.000Z',
  })
  assert.match(result.action, /offer package/i)
})

if (failed) {
  console.error('\nFAILED')
  process.exitCode = 1
} else {
  console.log('\nAll next-best-action tests passed.')
}
