// Regression guard for Investment Intelligence Slice 4's sensitivity
// analysis. Run with: npx tsx lib/portfolio-scoring/biggest-assumption.test.ts
import assert from 'node:assert/strict'
import { scoreProperty } from './score-property'
import { getBiggestAssumption } from './biggest-assumption'
import type { PortfolioScoringProperty } from './types'

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
    floodZone: null,
    femaDisasterCount: null,
    femaLastDisasterType: null,
    ...overrides,
  }
}

console.log('biggest-assumption.test.ts')

test('a GO deal finds a threshold that, when crossed, actually changes the decision', () => {
  const property = makeProperty({
    arv: 300000,
    purchasePrice: 150000,
    repairCosts: 20000,
    holdingCosts: 5000,
    closingCosts: 5000,
  })
  const { decision } = scoreProperty(property)
  assert.equal(decision, 'GO', 'test fixture must actually be a GO deal')

  const assumption = getBiggestAssumption(property, decision, true)
  assert.ok(assumption, 'expected a biggest-assumption result for a GO deal')
  assert.equal(assumption!.kind, 'threshold')
  assert.ok(assumption!.thresholdValue > (assumption!.currentValue ?? 0), 'threshold should be above the current value')

  // Confirm the reported threshold is real: crossing it actually flips the decision.
  const atThreshold = scoreProperty({ ...property, [assumption!.lever!]: assumption!.thresholdValue + 500 } as PortfolioScoringProperty)
  assert.notEqual(atThreshold.decision, 'GO')
})

test('a non-GO, non-RENEGOTIATE-without-price deal returns no assumption (out of scope)', () => {
  const property = makeProperty({
    arv: 300000,
    purchasePrice: 150000,
    repairCosts: 200000, // basis exceeds ARV -> RENEGOTIATE, but price IS verified
  })
  const { decision } = scoreProperty(property)
  assert.notEqual(decision, 'GO')
  const assumption = getBiggestAssumption(property, decision, true)
  assert.equal(assumption, null)
})

test('a property with no verified price, otherwise clean, reports the max price that clears GO', () => {
  const property = makeProperty({
    arv: 300000,
    purchasePrice: null,
    repairCosts: 20000,
    holdingCosts: 5000,
    closingCosts: 5000,
  })
  const { decision } = scoreProperty(property)
  const assumption = getBiggestAssumption(property, decision, false)
  assert.ok(assumption, 'expected a price-needed-for-GO result')
  assert.equal(assumption!.kind, 'price-needed-for-go')
  assert.ok(assumption!.thresholdValue > 0)

  // Confirm the reported price actually clears GO.
  const atPrice = scoreProperty({ ...property, purchasePrice: assumption!.thresholdValue })
  assert.equal(atPrice.decision, 'GO')
})

test('a property with no verified price and no realistic value data returns no assumption', () => {
  const property = makeProperty({ purchasePrice: null, arv: null, currentValue: null })
  const { decision } = scoreProperty(property)
  const assumption = getBiggestAssumption(property, decision, false)
  assert.equal(assumption, null)
})

if (failed) {
  console.error('\nFAILED')
  process.exitCode = 1
} else {
  console.log('\nAll biggest-assumption tests passed.')
}
