// Regression guard for the investor qualification score adapted from the
// investor-prospecting web map onto the capital Investor model.
// Run with: npx tsx lib/investor-qualification.test.ts
import assert from 'node:assert/strict'
import { computeInvestorQualification, type InvestorQualificationInput } from './investor-qualification'

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

function makeInput(overrides: Partial<InvestorQualificationInput>): InvestorQualificationInput {
  return {
    status: 'prospect',
    availableCapital: null,
    preferredReturn: null,
    markets: null,
    email: null,
    phone: null,
    evidenceSource: null,
    hasPriorCapitalActivity: false,
    ...overrides,
  }
}

console.log('investor-qualification.test.ts')

test('a fully cold prospect (no capital, no contact, no activity) scores low', () => {
  const result = computeInvestorQualification(makeInput({}))
  assert.ok(result.score < 30, `expected a low score, got ${result.score}`)
  assert.ok(result.reasons.some((r) => /no concrete capital/i.test(r)))
  assert.ok(result.reasons.some((r) => /no verified contact/i.test(r)))
})

test('a funded investor with capital, contact, and a track record scores high', () => {
  const result = computeInvestorQualification(makeInput({
    status: 'funded',
    availableCapital: 250000,
    email: 'investor@example.com',
    markets: 'Missouri',
    hasPriorCapitalActivity: true,
    preferredReturn: 0.08,
    evidenceSource: 'REIA',
  }))
  assert.ok(result.score >= 90, `expected a high score, got ${result.score}`)
})

test('missing contact info is penalized even when capital is real', () => {
  const withContact = computeInvestorQualification(makeInput({ availableCapital: 100000, email: 'a@b.com' }))
  const withoutContact = computeInvestorQualification(makeInput({ availableCapital: 100000 }))
  assert.ok(withContact.score > withoutContact.score)
})

test('an excessive preferred return does not earn the serviceable-range bonus', () => {
  const reasonable = computeInvestorQualification(makeInput({ preferredReturn: 0.08 }))
  const excessive = computeInvestorQualification(makeInput({ preferredReturn: 0.25 }))
  assert.ok(reasonable.score > excessive.score)
  assert.ok(!excessive.reasons.some((r) => /serviceable range/i.test(r)))
})

test('score is always clamped within 0-100', () => {
  const best = computeInvestorQualification(makeInput({
    status: 'funded', availableCapital: 1_000_000, email: 'a@b.com', phone: '555-1234',
    markets: 'Missouri', hasPriorCapitalActivity: true, preferredReturn: 0.05, evidenceSource: 'LinkedIn',
  }))
  const worst = computeInvestorQualification(makeInput({}))
  assert.ok(best.score <= 100 && best.score >= 0)
  assert.ok(worst.score <= 100 && worst.score >= 0)
})

if (failed) {
  console.error('\nFAILED')
  process.exitCode = 1
} else {
  console.log('\nAll investor-qualification tests passed.')
}
