// Regression guard for the underwriting-integrity fix: missing purchase price
// was defaulting to a 0-cost basis, which read as a 100% equity spread and
// could land a completely unpriced property in "Elite Deals". And repair
// cost never entered the equity-spread calculation, so a deal whose
// purchase + repairs exceeded ARV (a losing deal) could still score "Elite".
// Run with: npx tsx lib/portfolio-scoring/score-property.test.ts
import assert from 'node:assert/strict'
import { scoreProperty } from './score-property'
import type { PortfolioScoringProperty } from './types'

function makeProperty(overrides: Partial<PortfolioScoringProperty>): PortfolioScoringProperty {
  return {
    id: 'test-id',
    userId: 'test-user',
    address: '123 Test St',
    city: 'Testville',
    state: 'TS',
    zip: null,
    propertyType: 'single-family',
    bedrooms: null,
    bathrooms: null,
    sqft: null,
    lotSize: null,
    yearBuilt: null,
    purchasePrice: null,
    currentValue: null,
    arv: null,
    repairCosts: null,
    holdingCosts: null,
    closingCosts: null,
    notes: null,
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

console.log('score-property.test.ts')

test('7 TWIN ECHO CT: missing purchase price never reaches Elite Deals or GO', () => {
  const property = makeProperty({
    address: '7 TWIN ECHO CT',
    city: 'FAIRHOPE',
    state: 'AL',
    propertyType: 'multi-family',
    arv: 296100,
    purchasePrice: null,
    repairCosts: 38350,
  })

  const result = scoreProperty(property)
  assert.notEqual(result.scoreBucket, 'Elite Deals')
  assert.notEqual(result.scoreBucket, 'Strong GO')
  assert.notEqual(result.decision, 'GO')
  assert.ok(result.reasons.some((r) => /no verified purchase price/i.test(r)))
})

test('3428 CLEBURN AVE SW: all-in basis >= ARV is never Elite/GO, always RENEGOTIATE or KILL', () => {
  const property = makeProperty({
    address: '3428 CLEBURN AVE SW',
    city: 'BIRMINGHAM',
    state: 'AL',
    propertyType: 'multi-family',
    arv: 42650,
    purchasePrice: 4500,
    repairCosts: 39800, // all-in basis 44,300 >= ARV 42,650
  })

  const result = scoreProperty(property)
  assert.notEqual(result.scoreBucket, 'Elite Deals')
  assert.notEqual(result.scoreBucket, 'Strong GO')
  assert.notEqual(result.decision, 'GO')
  assert.ok(result.decision === 'RENEGOTIATE' || result.decision === 'KILL')
  assert.ok(result.reasons.some((r) => /all-in basis/i.test(r)))
})

test('a real, verified, healthy spread still reaches Elite Deals / GO', () => {
  const property = makeProperty({
    address: '1 Good Deal Ave',
    city: 'Testville',
    state: 'TS',
    propertyType: 'single-family',
    arv: 300000,
    purchasePrice: 150000,
    repairCosts: 20000, // all-in basis 170,000; equity spread 130,000 (43.3%)
  })

  const result = scoreProperty(property)
  assert.equal(result.decision, 'GO')
  assert.ok(result.scoreBucket === 'Elite Deals' || result.scoreBucket === 'Strong GO', `expected a top bucket, got ${result.scoreBucket}`)
})

test('equity spread uses purchase price + repairs, not purchase price alone', () => {
  const cheapButExpensiveRepair = scoreProperty(makeProperty({
    arv: 200000,
    purchasePrice: 20000,
    repairCosts: 170000, // all-in basis 190,000 -> thin spread (5%), not "high equity"
  }))
  assert.ok(!cheapButExpensiveRepair.reasons.includes('High equity spread'))

  const sameCheapPurchaseCheapRepair = scoreProperty(makeProperty({
    arv: 200000,
    purchasePrice: 20000,
    repairCosts: 10000, // all-in basis 30,000 -> genuinely high equity (85%)
  }))
  assert.ok(sameCheapPurchaseCheapRepair.reasons.includes('High equity spread'))
})

if (failed) {
  console.error('\nFAILED')
  process.exitCode = 1
} else {
  console.log('\nAll score-property tests passed.')
}
