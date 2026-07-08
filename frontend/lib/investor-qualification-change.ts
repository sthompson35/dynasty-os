// Investor Intelligence Slice 3: "Which investors deserve renewed attention
// because their qualification has materially improved?" Qualification is
// recomputed fresh on every read - this module diffs the current result
// against a stored snapshot of the last computed result to surface change.
import type { InvestorQualification } from './investor-qualification'

const MATERIAL_IMPROVEMENT_THRESHOLD = 15

export type QualificationSnapshot = {
  score: number
  reasons: string[]
} | null

export type QualificationChange = {
  previousScore: number
  currentScore: number
  scoreDelta: number
  gainedReasons: string[]
  lostReasons: string[]
  summary: string
}

export function computeQualificationChange(
  current: InvestorQualification,
  previous: QualificationSnapshot
): QualificationChange | null {
  if (!previous) return null

  const scoreDelta = current.score - previous.score
  if (scoreDelta < MATERIAL_IMPROVEMENT_THRESHOLD) return null

  const previousReasonSet = new Set(previous.reasons)
  const currentReasonSet = new Set(current.reasons)
  const gainedReasons = current.reasons.filter((r) => !previousReasonSet.has(r))
  const lostReasons = previous.reasons.filter((r) => !currentReasonSet.has(r))

  return {
    previousScore: previous.score,
    currentScore: current.score,
    scoreDelta,
    gainedReasons,
    lostReasons,
    summary: `Qualification rose from ${previous.score} to ${current.score} (+${scoreDelta})`,
  }
}
