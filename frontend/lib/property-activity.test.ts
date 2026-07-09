// Regression guard for Investment Intelligence Slice 3's activity-diff
// functions. Run with: npx tsx lib/property-activity.test.ts
import assert from 'node:assert/strict'
import {
  buildScoreActivity,
  buildGisEnrichedActivity,
  buildFemaUpdatedActivity,
  buildPurchasePriceActivity,
  buildOutcomeRecordedActivity,
  collapseActivityFeed,
  type ActivityFeedRow,
} from './property-activity'

function importRow(id: string, minutesAgo: number): ActivityFeedRow {
  return {
    id,
    propertyId: `prop-${id}`,
    eventType: 'IMPORT_COMPLETED',
    summary: 'Added to the portfolio via import',
    metadata: {},
    createdAt: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
  }
}

function decisionRow(id: string, minutesAgo: number): ActivityFeedRow {
  return {
    id,
    propertyId: `prop-${id}`,
    eventType: 'DECISION_CHANGED',
    summary: 'Decision changed: RENEGOTIATE -> GO',
    metadata: {},
    createdAt: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
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

console.log('property-activity.test.ts')

test('a decision change is always surfaced, even a 1-point score move', () => {
  const result = buildScoreActivity({ previousDealScore: 70, previousDecision: 'RENEGOTIATE', dealScore: 71, decision: 'GO' })
  assert.equal(result?.eventType, 'DECISION_CHANGED')
  assert.match(result!.summary, /RENEGOTIATE -> GO/)
})

test('a small score move with no decision change is not surfaced (noise threshold)', () => {
  const result = buildScoreActivity({ previousDealScore: 80, previousDecision: 'GO', dealScore: 82, decision: 'GO' })
  assert.equal(result, null)
})

test('a score move of 5+ points with no decision change is surfaced as SCORE_CHANGED', () => {
  const result = buildScoreActivity({ previousDealScore: 80, previousDecision: 'GO', dealScore: 88, decision: 'GO' })
  assert.equal(result?.eventType, 'SCORE_CHANGED')
})

test('no previous score (first-time scoring) never emits an activity', () => {
  const result = buildScoreActivity({ previousDealScore: null, previousDecision: null, dealScore: 90, decision: 'GO' })
  assert.equal(result, null)
})

test('GIS enrichment only fires on the null -> set transition, not on re-enrichment', () => {
  const first = buildGisEnrichedActivity({ wasEnriched: false, isEnriched: true })
  const repeat = buildGisEnrichedActivity({ wasEnriched: true, isEnriched: true })
  assert.equal(first?.eventType, 'GIS_ENRICHED')
  assert.equal(repeat, null)
})

test('FEMA history only fires on the null -> set transition', () => {
  const first = buildFemaUpdatedActivity({ previousFemaDisasterCount: null, femaDisasterCount: 12 })
  const repeat = buildFemaUpdatedActivity({ previousFemaDisasterCount: 12, femaDisasterCount: 12 })
  assert.equal(first?.eventType, 'FEMA_UPDATED')
  assert.equal(repeat, null)
})

test('purchase price added only fires on the missing -> present transition', () => {
  const added = buildPurchasePriceActivity({ previousPurchasePrice: null, purchasePrice: 150000 })
  const alreadyHad = buildPurchasePriceActivity({ previousPurchasePrice: 150000, purchasePrice: 155000 })
  const stillMissing = buildPurchasePriceActivity({ previousPurchasePrice: null, purchasePrice: null })
  assert.equal(added?.eventType, 'PURCHASE_PRICE_ADDED')
  assert.equal(alreadyHad, null)
  assert.equal(stillMissing, null)
})

test('a batch of IMPORT_COMPLETED rows from the same import collapses into one summarized entry', () => {
  const rows = [importRow('1', 0), importRow('2', 0.1), importRow('3', 0.2)]
  const result = collapseActivityFeed(rows)
  assert.equal(result.length, 1)
  assert.equal(result[0].count, 3)
  assert.equal(result[0].summary, '3 properties added via import')
})

test('IMPORT_COMPLETED rows more than the collapse window apart stay separate', () => {
  const rows = [importRow('1', 0), importRow('2', 30)] // 30 minutes apart
  const result = collapseActivityFeed(rows)
  assert.equal(result.length, 2)
  assert.equal(result[0].count, 1)
  assert.equal(result[1].count, 1)
})

test('non-IMPORT_COMPLETED events are never collapsed, even if adjacent and close in time', () => {
  const rows = [decisionRow('1', 0), decisionRow('2', 0.1), decisionRow('3', 0.2)]
  const result = collapseActivityFeed(rows)
  assert.equal(result.length, 3)
  assert.ok(result.every((item) => item.count === 1))
})

test('an IMPORT_COMPLETED batch adjacent to an unrelated event does not absorb it', () => {
  const rows = [importRow('1', 0), importRow('2', 0.1), decisionRow('3', 0.2), importRow('4', 0.3)]
  const result = collapseActivityFeed(rows)
  assert.equal(result.length, 3)
  assert.equal(result[0].count, 2)
  assert.equal(result[1].eventType, 'DECISION_CHANGED')
  assert.equal(result[2].count, 1)
})

test('a closed outcome summary includes the predicted decision and net profit', () => {
  const activity = buildOutcomeRecordedActivity({ status: 'closed', predictedDecision: 'GO', netProfit: 42000 })
  assert.equal(activity.eventType, 'OUTCOME_RECORDED')
  assert.match(activity.summary, /Closed/)
  assert.match(activity.summary, /predicted GO/)
  assert.match(activity.summary, /\$42,000/)
})

test('a fell-through outcome is labeled distinctly from a close', () => {
  const activity = buildOutcomeRecordedActivity({ status: 'fell_through', predictedDecision: 'GO', netProfit: null })
  assert.match(activity.summary, /Fell through/)
})

if (failed) {
  console.error('\nFAILED')
  process.exitCode = 1
} else {
  console.log('\nAll property-activity tests passed.')
}
