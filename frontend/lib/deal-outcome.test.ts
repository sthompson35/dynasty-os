// Regression guard for realized deal-outcome financials.
// Run with: npx tsx lib/deal-outcome.test.ts
import assert from 'node:assert/strict'
import { computeDealOutcomeFinancials } from './deal-outcome'

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

console.log('deal-outcome.test.ts')

test('no actual exit price means nothing can be computed yet', () => {
  const result = computeDealOutcomeFinancials({ actualPurchase: 100000, actualRehab: 20000, actualExit: null })
  assert.equal(result.netProfit, null)
  assert.equal(result.roi, null)
})

test('a profitable flip computes positive net profit and ROI', () => {
  const result = computeDealOutcomeFinancials({ actualPurchase: 100000, actualRehab: 30000, actualExit: 180000 })
  assert.equal(result.netProfit, 50000)
  assert.ok(result.roi !== null && Math.abs(result.roi - 50000 / 130000) < 1e-9)
})

test('a deal that lost money computes a negative net profit', () => {
  const result = computeDealOutcomeFinancials({ actualPurchase: 100000, actualRehab: 30000, actualExit: 110000 })
  assert.equal(result.netProfit, -20000)
  assert.ok(result.roi !== null && result.roi < 0)
})

test('missing purchase/rehab defaults to zero cost rather than throwing', () => {
  const result = computeDealOutcomeFinancials({ actualPurchase: null, actualRehab: null, actualExit: 50000 })
  assert.equal(result.netProfit, 50000)
  assert.equal(result.roi, null) // zero total cost - ROI is undefined, not Infinity
})

test('a land flip with only a purchase cost (no rehab) computes ROI correctly', () => {
  const result = computeDealOutcomeFinancials({ actualPurchase: 15000, actualRehab: null, actualExit: 27000 })
  assert.equal(result.netProfit, 12000)
  assert.ok(result.roi !== null && Math.abs(result.roi - 0.8) < 1e-9)
})

if (failed) {
  console.error('\nFAILED')
  process.exitCode = 1
} else {
  console.log('\nAll deal-outcome tests passed.')
}
