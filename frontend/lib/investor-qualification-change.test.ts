// Regression guard for Investor Intelligence Slice 3 change detection.
// Run with: npx tsx lib/investor-qualification-change.test.ts
import assert from 'node:assert/strict'
import { computeQualificationChange } from './investor-qualification-change'

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

console.log('investor-qualification-change.test.ts')

test('no previous snapshot means no change - just establishes a baseline', () => {
  const result = computeQualificationChange({ score: 80, reasons: ['Has real available capital on file'] }, null)
  assert.equal(result, null)
})

test('a small score increase below the threshold is not reported as a change', () => {
  const result = computeQualificationChange(
    { score: 60, reasons: [] },
    { score: 50, reasons: [] }
  )
  assert.equal(result, null)
})

test('a material score increase is reported with the correct delta', () => {
  const result = computeQualificationChange(
    { score: 85, reasons: ['Has real available capital on file'] },
    { score: 60, reasons: [] }
  )
  assert.ok(result)
  assert.equal(result!.previousScore, 60)
  assert.equal(result!.currentScore, 85)
  assert.equal(result!.scoreDelta, 25)
})

test('a score decrease is never reported as an improvement', () => {
  const result = computeQualificationChange(
    { score: 40, reasons: [] },
    { score: 80, reasons: ['Has real available capital on file'] }
  )
  assert.equal(result, null)
})

test('gained and lost reasons are diffed correctly', () => {
  const result = computeQualificationChange(
    { score: 90, reasons: ['Already warm or funded, not a cold prospect', 'Has a verified contact route (email/phone)'] },
    { score: 60, reasons: ['No verified contact route on file'] }
  )
  assert.ok(result)
  assert.deepEqual(result!.gainedReasons, ['Already warm or funded, not a cold prospect', 'Has a verified contact route (email/phone)'])
  assert.deepEqual(result!.lostReasons, ['No verified contact route on file'])
})

if (failed) {
  console.error('\nFAILED')
  process.exitCode = 1
} else {
  console.log('\nAll investor-qualification-change tests passed.')
}
